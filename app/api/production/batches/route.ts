import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Task types and their sequence for batch planning
// FROST is removed - frosting quantity is calculated in PREP
const TASK_TYPES = ['BAKE', 'PREP'] as const

// Surface area calculation for round cakes
// Formula: side surface (π × d × h) + top circle (π × r²)
// Standard height is 4" for most tiers
function calculateSurfaceArea(diameterInches: number, heightInches: number = 4): number {
  const radius = diameterInches / 2
  const topArea = Math.PI * radius * radius
  const sideArea = Math.PI * diameterInches * heightInches
  return Math.round(topArea + sideArea)
}

// Estimate buttercream needed based on surface area
// Base: ~1 oz per 8 sq inches (covers crumb coat + final coat)
// Complexity multiplier: 1=light, 2=medium, 3=heavy (rosettes, etc.)
function estimateButtercreamOz(surfaceAreaSqIn: number, complexity: number = 2): number {
  const baseOzPerSqIn = 1 / 8
  const complexityMultiplier = complexity // 1x, 2x, or 3x
  return Math.round(surfaceAreaSqIn * baseOzPerSqIn * complexityMultiplier * 10) / 10
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
        const diameterInches = parseDiameterFromSize(sizeName)
        const surfaceAreaSqIn = calculateSurfaceArea(diameterInches)
        // Use actual frosting complexity from tier (1=light, 2=medium, 3=heavy)
        const complexity = tier.frostingComplexity || 2
        const buttercreamOz = estimateButtercreamOz(surfaceAreaSqIn, complexity)

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
        // BAKE batch - by batter
        if (!taskType || taskType === 'BAKE') {
          const bakeKey = `BAKE-${batterName}`
          if (!batches[bakeKey]) {
            const existingTask = orderTasks.find(t => t.taskType === 'BAKE')
            batches[bakeKey] = {
              id: bakeKey,
              taskType: 'BAKE',
              recipe: batterName,
              recipeType: 'batter',
              scheduledDate: existingTask?.scheduledDate?.toISOString().split('T')[0] || null,
              tiers: [],
              stockItems: [],
              totalTiers: 0,
              totalServings: 0,
              totalSurfaceAreaSqIn: 0,
              totalButtercreamOz: 0,
              totalStockQuantityOz: 0,
              earliestDueDate: dueDate,
              assignedTo: existingTask?.assignedTo || null,
              status: existingTask?.status === 'COMPLETED' ? 'completed'
                : existingTask?.status === 'IN_PROGRESS' ? 'in_progress'
                : existingTask?.scheduledDate ? 'scheduled' : 'unscheduled'
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

        if ((!taskType || taskType === 'PREP') && shouldIncludeInPrep) {
          const prepKey = `PREP-${prepRecipe}`
          if (!batches[prepKey]) {
            const existingTask = orderTasks.find(t => t.taskType === 'PREP')
            batches[prepKey] = {
              id: prepKey,
              taskType: 'PREP',
              recipe: prepRecipe,
              recipeType: frostingRecipeName ? 'frosting' : 'filling',
              scheduledDate: existingTask?.scheduledDate?.toISOString().split('T')[0] || null,
              tiers: [],
              stockItems: [],
              totalTiers: 0,
              totalServings: 0,
              totalSurfaceAreaSqIn: 0,
              totalButtercreamOz: 0,
              totalStockQuantityOz: 0,
              earliestDueDate: dueDate,
              assignedTo: existingTask?.assignedTo || null,
              status: existingTask?.status === 'COMPLETED' ? 'completed'
                : existingTask?.status === 'IN_PROGRESS' ? 'in_progress'
                : existingTask?.scheduledDate ? 'scheduled' : 'unscheduled'
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

    // Convert to array and sort
    const batchList = Object.values(batches).sort((a, b) => {
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

    // Get current batches
    const batchesRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/production/batches?startDate=${startDate}&endDate=${endDate}`
    )
    const { batches } = await batchesRes.json()

    // Auto-scheduling algorithm:
    // 1. Group batches by task type
    // 2. For each batch, calculate optimal date based on:
    //    - Earliest due date minus lead time
    //    - Task type sequence (BAKE needs more lead time than PACKAGE)
    //    - Combine same-recipe batches on same day

    const leadTimes: Record<string, number> = {
      BAKE: 2,    // 2 days before
      PREP: 2,    // 2 days before
    }

    const suggestions = batches.map((batch: RecipeBatch) => {
      const dueDate = new Date(batch.earliestDueDate)
      const leadTime = leadTimes[batch.taskType] || 1
      const suggestedDate = new Date(dueDate)
      suggestedDate.setDate(suggestedDate.getDate() - leadTime)

      return {
        batchId: batch.id,
        currentDate: batch.scheduledDate,
        suggestedDate: suggestedDate.toISOString().split('T')[0],
        reason: `${leadTime} day(s) before earliest due date (${batch.earliestDueDate.split('T')[0]})`
      }
    })

    return NextResponse.json({
      suggestions,
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
