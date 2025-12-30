import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper to get active batch type configurations from database
async function getBatchTypeConfigs() {
  const configs = await prisma.batchTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })
  return configs
}

// Helper to get batchable types only
async function getBatchableTypes() {
  const configs = await prisma.batchTypeConfig.findMany({
    where: { isActive: true, isBatchable: true },
    orderBy: { sortOrder: 'asc' }
  })
  return configs.map(c => c.code)
}

// Surface area calculation for round cakes
// Includes: outside (top + sides) + internal filling layers (2 layers for 3-layer cake)
// Standard height is 4" for most tiers
function calculateSurfaceArea(diameterInches: number, heightInches: number = 4, cakeLayers: number = 3): number {
  const radius = diameterInches / 2
  const topArea = Math.PI * radius * radius
  const sideArea = Math.PI * diameterInches * heightInches
  // Internal filling layers: (cakeLayers - 1) circular areas between layers
  const fillingLayers = cakeLayers - 1
  const internalArea = fillingLayers * topArea
  return Math.round(topArea + sideArea + internalArea)
}

// Estimate buttercream needed based on surface area
// Base: ~1 oz per 8 sq inches for outside (crumb coat + final coat)
// Internal filling uses less per sq inch (~0.5 oz per 8 sq in)
// Complexity multiplier: 1=light, 2=medium, 3=heavy (rosettes, etc.)
function estimateButtercreamOz(
  diameterInches: number,
  heightInches: number = 4,
  complexity: number = 2,
  cakeLayers: number = 3
): number {
  const radius = diameterInches / 2
  const topArea = Math.PI * radius * radius
  const sideArea = Math.PI * diameterInches * heightInches
  const outsideSurfaceArea = topArea + sideArea

  // Internal filling layers
  const fillingLayers = cakeLayers - 1
  const internalArea = fillingLayers * topArea

  // Outside: ~1 oz per 8 sq in × complexity
  const outsideOzPerSqIn = 1 / 8
  const outsideOz = outsideSurfaceArea * outsideOzPerSqIn * complexity

  // Internal filling: ~0.5 oz per 8 sq in (thinner layer)
  const fillingOzPerSqIn = 0.5 / 8
  const fillingOz = internalArea * fillingOzPerSqIn

  return Math.round((outsideOz + fillingOz) * 10) / 10
}

// Parse diameter from tier size name (e.g., "8 inch round" -> 8)
function parseDiameterFromSize(sizeName: string): number {
  const match = sizeName.match(/(\d+)\s*inch/i)
  return match ? parseInt(match[1]) : 8 // default to 8" if can't parse
}

interface TierDetail {
  tierId: number
  orderId: number
  customerName: string
  tierIndex: number
  sizeName: string
  servings: number
  dueDate: string
  dueTime: string | null
  isDelivery: boolean
  // Additional order details for display
  occasion: string | null
  theme: string | null
  colors: string | null
  imageUrl: string | null
  finishType: string | null
  batterName: string | null
  frostingName: string | null
  // Surface area calculations
  diameterInches: number
  surfaceAreaSqIn: number
  buttercreamOz: number
  complexity: number // 1=light, 2=medium, 3=heavy
}

// Stock production items (cupcakes, cookies, etc.)
interface StockItem {
  stockTaskId: number
  inventoryItemId: number
  itemName: string
  quantity: number
  recipeQuantityOz: number  // Total recipe needed for this stock item
  scheduledDate: string
  status: string
}

interface RecipeBatch {
  id: string
  taskType: string
  recipe: string
  recipeType: 'batter' | 'filling' | 'frosting' | 'finish'
  scheduledDate: string | null
  tiers: TierDetail[]
  stockItems: StockItem[]  // Pre-made products needing this recipe
  totalTiers: number
  totalServings: number
  totalSurfaceAreaSqIn: number
  totalButtercreamOz: number
  totalStockQuantityOz: number  // Recipe needed for stock items
  earliestDueDate: string
  assignedTo: string | null
  status: 'unscheduled' | 'scheduled' | 'in_progress' | 'completed'
}

// GET /api/production/batches - Get recipe-centric batch view
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const taskType = searchParams.get('taskType') // Optional filter

  try {
    // Get all confirmed orders with tiers
    // Don't filter by date - we want all active orders for batch planning
    const orders = await prisma.cakeOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        isRush: false,  // Exclude rush orders from batch workflow
      },
      include: {
        Customer: { select: { name: true } },
        CakeTier: {
          include: {
            TierSize: true,
            Recipe_CakeTier_batterRecipeIdToRecipe: { select: { id: true, name: true } },
            Recipe_CakeTier_fillingRecipeIdToRecipe: { select: { id: true, name: true } },
            Recipe_CakeTier_frostingRecipeIdToRecipe: { select: { id: true, name: true } },
            ProductionBatchTier: {
              include: {
                ProductionBatch: { select: { id: true, name: true, batchType: true, scheduledDate: true, status: true } }
              }
            }
          },
          orderBy: { tierIndex: 'asc' }
        },
        ProductionTask: {
          select: {
            id: true,
            taskType: true,
            scheduledDate: true,
            status: true,
            assignedTo: true
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    // Get scheduled stock production tasks with their recipe requirements
    // Only include tasks NOT already assigned to a batch
    const stockTasks = await prisma.stockProductionTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        productionBatchId: null,  // Exclude tasks already in a batch
      },
      include: {
        InventoryItem: {
          include: {
            InventoryItemRecipe: {
              include: {
                Recipe: { select: { id: true, name: true, type: true } }
              }
            }
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    })

    // Build recipe batches
    const batches: Record<string, RecipeBatch> = {}

    for (const order of orders) {
      const customerName = order.Customer?.name || order.customerName || 'Unknown'
      const dueDate = order.eventDate.toISOString()
      const dueTime = order.isDelivery
        ? order.deliveryTime?.toISOString() || null
        : order.pickupTime?.toISOString() || null

      for (const tier of order.CakeTier) {
        // Check if this tier is already assigned to a production batch
        const existingBatchAssignments = tier.ProductionBatchTier || []
        const assignedBatchTypes = new Set(
          existingBatchAssignments.map(pbt => pbt.ProductionBatch?.batchType).filter(Boolean)
        )

        const sizeName = tier.TierSize?.name || 'Unknown size'
        const servings = tier.TierSize?.servings || 0

        // Get batter/flavor name
        const batterName = tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name
          || tier.flavor
          || 'Unknown'

        // Get filling recipe name (for PREP - what you make)
        const fillingRecipeName = tier.Recipe_CakeTier_fillingRecipeIdToRecipe?.name
          || tier.filling
          || null

        // Get frosting recipe name (for PREP - what you make)
        // This is the actual buttercream flavor, NOT the finish style
        const frostingRecipeName = tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name || null

        // Get finish type (for FROST - how to apply/style)
        // This is "Buttercream - Textured", "Fondant", etc.
        const finishType = tier.finishType || null

        // Find existing task for this order to get schedule
        const orderTasks = order.ProductionTask

        // Calculate surface area and buttercream needs
        // Accounts for 3 cake layers with 2 internal filling layers
        const diameterInches = parseDiameterFromSize(sizeName)
        const surfaceAreaSqIn = calculateSurfaceArea(diameterInches) // includes internal filling layers
        // Use actual frosting complexity from tier (1=light, 2=medium, 3=heavy)
        const complexity = tier.frostingComplexity || 2
        const buttercreamOz = estimateButtercreamOz(diameterInches, 4, complexity, 3) // 4" height, 3 cake layers

        const tierDetail: TierDetail = {
          tierId: tier.id,
          orderId: order.id,
          customerName,
          tierIndex: tier.tierIndex,
          sizeName,
          servings,
          dueDate,
          dueTime,
          isDelivery: order.isDelivery,
          // Additional details
          occasion: order.occasion || null,
          theme: order.theme || null,
          colors: order.colors || null,
          imageUrl: order.imageUrl || null,
          finishType,
          batterName,
          frostingName: frostingRecipeName,
          // Surface area calculations
          diameterInches,
          surfaceAreaSqIn,
          buttercreamOz,
          complexity,
        }

        // Create batch entries for each recipe type
        // BAKE batch - by batter (skip if already assigned to a BAKE batch)
        const isAssignedToBake = assignedBatchTypes.has('BAKE')
        if ((!taskType || taskType === 'BAKE') && !isAssignedToBake) {
          const bakeKey = `BAKE-${batterName}`
          if (!batches[bakeKey]) {
            // These are SUGGESTED batches - tiers NOT yet in a ProductionBatch
            // They should always be "unscheduled" since they need to be added to a batch
            batches[bakeKey] = {
              id: bakeKey,
              taskType: 'BAKE',
              recipe: batterName,
              recipeType: 'batter',
              scheduledDate: null, // Not scheduled until added to a ProductionBatch
              tiers: [],
              stockItems: [],
              totalTiers: 0,
              totalServings: 0,
              totalSurfaceAreaSqIn: 0,
              totalButtercreamOz: 0,
              totalStockQuantityOz: 0,
              earliestDueDate: dueDate,
              assignedTo: null,
              status: 'unscheduled' // Always unscheduled since tier isn't in a batch
            }
          }
          batches[bakeKey].tiers.push(tierDetail)
          batches[bakeKey].totalTiers++
          batches[bakeKey].totalServings += servings
          batches[bakeKey].totalSurfaceAreaSqIn += surfaceAreaSqIn
          batches[bakeKey].totalButtercreamOz += buttercreamOz
          if (dueDate < batches[bakeKey].earliestDueDate) {
            batches[bakeKey].earliestDueDate = dueDate
          }
        }

        // PREP batch - by frosting/filling RECIPE that needs to be MADE
        // Use actual recipe names, not finish styles
        // Fondant is excluded - it's purchased in buckets, not made
        // PREP includes ALL buttercream needs (filling + outside frosting)
        const isFondant = (name: string | null) => name?.toLowerCase().includes('fondant')
        const prepRecipe = frostingRecipeName || fillingRecipeName || null
        const shouldIncludeInPrep = prepRecipe && !isFondant(prepRecipe)
        const isAssignedToPrep = assignedBatchTypes.has('PREP')

        if ((!taskType || taskType === 'PREP') && shouldIncludeInPrep && !isAssignedToPrep) {
          const prepKey = `PREP-${prepRecipe}`
          if (!batches[prepKey]) {
            // These are SUGGESTED batches - tiers NOT yet in a ProductionBatch
            // They should always be "unscheduled" since they need to be added to a batch
            batches[prepKey] = {
              id: prepKey,
              taskType: 'PREP',
              recipe: prepRecipe,
              recipeType: frostingRecipeName ? 'frosting' : 'filling',
              scheduledDate: null, // Not scheduled until added to a ProductionBatch
              tiers: [],
              stockItems: [],
              totalTiers: 0,
              totalServings: 0,
              totalSurfaceAreaSqIn: 0,
              totalButtercreamOz: 0,
              totalStockQuantityOz: 0,
              earliestDueDate: dueDate,
              assignedTo: null,
              status: 'unscheduled' // Always unscheduled since tier isn't in a batch
            }
          }
          batches[prepKey].tiers.push(tierDetail)
          batches[prepKey].totalTiers++
          batches[prepKey].totalServings += servings
          batches[prepKey].totalSurfaceAreaSqIn += surfaceAreaSqIn
          batches[prepKey].totalButtercreamOz += buttercreamOz
          if (dueDate < batches[prepKey].earliestDueDate) {
            batches[prepKey].earliestDueDate = dueDate
          }
        }
      }
    }

    // Add stock production tasks to batches
    for (const stockTask of stockTasks) {
      const item = stockTask.InventoryItem
      if (!item) continue

      // For each recipe this inventory item needs
      for (const itemRecipe of item.InventoryItemRecipe) {
        const recipe = itemRecipe.Recipe
        if (!recipe) continue

        const recipeName = recipe.name
        const recipeType = recipe.type?.toLowerCase() || 'frosting'
        const quantityPerUnit = Number(itemRecipe.quantityPerUnit) || 0
        const totalRecipeOz = quantityPerUnit * stockTask.targetQuantity

        // Determine batch type based on recipe type
        const batchType = recipeType === 'batter' ? 'BAKE' : 'PREP'

        if (taskType && taskType !== batchType) continue

        const batchKey = `${batchType}-${recipeName}`

        if (!batches[batchKey]) {
          batches[batchKey] = {
            id: batchKey,
            taskType: batchType,
            recipe: recipeName,
            recipeType: recipeType as 'batter' | 'filling' | 'frosting' | 'finish',
            scheduledDate: stockTask.scheduledDate?.toISOString().split('T')[0] || null,
            tiers: [],
            stockItems: [],
            totalTiers: 0,
            totalServings: 0,
            totalSurfaceAreaSqIn: 0,
            totalButtercreamOz: 0,
            totalStockQuantityOz: 0,
            earliestDueDate: stockTask.scheduledDate?.toISOString() || new Date().toISOString(),
            assignedTo: stockTask.assignedTo || null,
            status: stockTask.status === 'COMPLETED' ? 'completed'
              : stockTask.status === 'IN_PROGRESS' ? 'in_progress'
              : stockTask.scheduledDate ? 'scheduled' : 'unscheduled'
          }
        }

        // Add stock item to batch
        const stockItem: StockItem = {
          stockTaskId: stockTask.id,
          inventoryItemId: item.id,
          itemName: item.name,
          quantity: stockTask.targetQuantity,
          recipeQuantityOz: totalRecipeOz,
          scheduledDate: stockTask.scheduledDate?.toISOString().split('T')[0] || '',
          status: stockTask.status
        }

        batches[batchKey].stockItems.push(stockItem)
        batches[batchKey].totalStockQuantityOz += totalRecipeOz

        // Update earliest due date if this stock task is earlier
        const stockDate = stockTask.scheduledDate?.toISOString() || ''
        if (stockDate && stockDate < batches[batchKey].earliestDueDate) {
          batches[batchKey].earliestDueDate = stockDate
        }
      }
    }

    // Convert to array, filter out empty batches, and sort
    const batchList = Object.values(batches)
      .filter(b => b.tiers.length > 0 || b.stockItems.length > 0) // Remove batches with no items
      .sort((a, b) => {
        // Sort by task type order, then by earliest due date
        const typeOrder = TASK_TYPES.indexOf(a.taskType as typeof TASK_TYPES[number])
          - TASK_TYPES.indexOf(b.taskType as typeof TASK_TYPES[number])
        if (typeOrder !== 0) return typeOrder
        return a.earliestDueDate.localeCompare(b.earliestDueDate)
      })

    return NextResponse.json({
      batches: batchList,
      summary: {
        totalBatches: batchList.length,
        unscheduled: batchList.filter(b => b.status === 'unscheduled').length,
        scheduled: batchList.filter(b => b.status === 'scheduled').length,
        inProgress: batchList.filter(b => b.status === 'in_progress').length,
        completed: batchList.filter(b => b.status === 'completed').length
      }
    })
  } catch (error) {
    console.error('Failed to fetch batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batches', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/production/batches/auto-schedule - Auto-generate optimal schedule
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { startDate, endDate } = body

    // Get batch type configurations from database
    const batchTypeConfigs = await getBatchTypeConfigs()

    // Build lead times and dependencies from database configs
    const leadTimes: Record<string, number> = {}
    const dependencies: Record<string, string[]> = {}
    for (const config of batchTypeConfigs) {
      leadTimes[config.code] = config.leadTimeDays
      dependencies[config.code] = config.dependsOn ? JSON.parse(config.dependsOn) : []
    }

    // Get current batches
    const batchesRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/production/batches?startDate=${startDate}&endDate=${endDate}`
    )
    const { batches } = await batchesRes.json()

    // Auto-scheduling algorithm:
    // 1. For each batch, calculate optimal date based on:
    //    - Earliest due date minus lead time (from database config)
    //    - Check if dependencies are satisfied
    // 2. Return suggestions with dependency warnings

    const suggestions = batches.map((batch: RecipeBatch) => {
      const dueDate = new Date(batch.earliestDueDate)
      const leadTime = leadTimes[batch.taskType] || 1
      const suggestedDate = new Date(dueDate)
      suggestedDate.setDate(suggestedDate.getDate() - leadTime)

      // Get dependencies for this batch type
      const deps = dependencies[batch.taskType] || []

      // Find missing dependencies (other batches for the same tiers that should be scheduled first)
      const missingDependencies: { type: string; suggestedDate: string; leadTime: number }[] = []
      for (const depType of deps) {
        const depLeadTime = leadTimes[depType] || 1
        const depSuggestedDate = new Date(dueDate)
        depSuggestedDate.setDate(depSuggestedDate.getDate() - depLeadTime)

        // Check if there's a scheduled batch for this dependency type
        // For now, just add it as a suggestion - the UI will handle checking existing batches
        if (depLeadTime > leadTime) {
          missingDependencies.push({
            type: depType,
            suggestedDate: depSuggestedDate.toISOString().split('T')[0],
            leadTime: depLeadTime
          })
        }
      }

      return {
        batchId: batch.id,
        batchType: batch.taskType,
        currentDate: batch.scheduledDate,
        suggestedDate: suggestedDate.toISOString().split('T')[0],
        leadTime,
        reason: `${leadTime} day(s) before earliest due date (${batch.earliestDueDate.split('T')[0]})`,
        dependencies: deps,
        missingDependencies: missingDependencies.length > 0 ? missingDependencies : undefined
      }
    })

    // Also return the batch type configs for the UI to use
    const batchTypeInfo = batchTypeConfigs.map(c => ({
      code: c.code,
      name: c.name,
      leadTimeDays: c.leadTimeDays,
      dependsOn: c.dependsOn ? JSON.parse(c.dependsOn) : [],
      isBatchable: c.isBatchable,
      color: c.color
    }))

    return NextResponse.json({
      suggestions,
      batchTypes: batchTypeInfo,
      message: `Generated ${suggestions.length} scheduling suggestions`
    })
  } catch (error) {
    console.error('Failed to auto-schedule:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}
