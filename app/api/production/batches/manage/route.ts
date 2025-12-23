import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Surface area calculation for round cakes
function calculateSurfaceArea(diameterInches: number, heightInches: number = 4): number {
  const radius = diameterInches / 2
  const topArea = Math.PI * radius * radius
  const sideArea = Math.PI * diameterInches * heightInches
  return Math.round(topArea + sideArea)
}

// Estimate buttercream needed based on surface area
function estimateButtercreamOz(surfaceAreaSqIn: number, complexity: number = 2): number {
  const baseOzPerSqIn = 1 / 8
  return Math.round(surfaceAreaSqIn * baseOzPerSqIn * complexity * 10) / 10
}

// Parse diameter from tier size name
function parseDiameterFromSize(sizeName: string): number {
  const match = sizeName.match(/(\d+)\s*inch/i)
  return match ? parseInt(match[1]) : 8
}

// GET /api/production/batches/manage - List all production batches
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const batchType = searchParams.get('batchType')
  const status = searchParams.get('status')
  const weekStart = searchParams.get('weekStart')
  const weekEnd = searchParams.get('weekEnd')

  try {
    const where: Record<string, unknown> = {}

    if (batchType) {
      where.batchType = batchType
    }
    if (status) {
      where.status = status
    }
    if (weekStart && weekEnd) {
      where.scheduledDate = {
        gte: new Date(weekStart),
        lte: new Date(weekEnd)
      }
    }

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        ProductionBatchTier: {
          include: {
            CakeTier: {
              include: {
                CakeOrder: {
                  select: {
                    id: true,
                    customerName: true,
                    eventDate: true,
                    occasion: true,
                    theme: true,
                    colors: true,
                    imageUrl: true,
                    isDelivery: true,
                    Customer: { select: { name: true } }
                  }
                },
                TierSize: true
              }
            }
          }
        },
        StockProductionTask: {
          include: {
            InventoryItem: {
              select: { id: true, name: true, productType: true }
            }
          }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { batchType: 'asc' }
      ]
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Failed to fetch production batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batches', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/production/batches/manage - Create a new production batch
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, batchType, recipeName, recipeId, scheduledDate, notes, tierIds, stockTaskIds } = body

    if (!name || !batchType) {
      return NextResponse.json(
        { error: 'Name and batchType are required' },
        { status: 400 }
      )
    }

    // Validate batchType
    const validTypes = ['BAKE', 'PREP', 'FROST', 'STACK', 'DECORATE']
    if (!validTypes.includes(batchType)) {
      return NextResponse.json(
        { error: `Invalid batchType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Build notes with stock task info if present
    let batchNotes = notes || ''
    let stockQuantityOz = 0
    if (stockTaskIds?.length) {
      // Fetch stock task details to include in batch
      const stockTasks = await prisma.stockProductionTask.findMany({
        where: { id: { in: stockTaskIds } },
        include: {
          InventoryItem: {
            include: {
              InventoryItemRecipe: true
            }
          }
        }
      })

      // Calculate total stock quantity needed
      for (const task of stockTasks) {
        for (const recipe of task.InventoryItem.InventoryItemRecipe) {
          stockQuantityOz += Number(recipe.quantityPerUnit) * task.targetQuantity
        }
      }

      // Add stock task references to notes
      const stockInfo = stockTasks.map(t => `${t.InventoryItem.name} x${t.targetQuantity}`).join(', ')
      batchNotes = batchNotes ? `${batchNotes}\n\nStock items: ${stockInfo}` : `Stock items: ${stockInfo}`
    }

    // Create the batch
    // Include stock quantity in notes if present
    if (stockQuantityOz > 0) {
      batchNotes = batchNotes ? `${batchNotes} (${stockQuantityOz} oz)` : `Stock: ${stockQuantityOz} oz`
    }

    const batch = await prisma.productionBatch.create({
      data: {
        name,
        batchType,
        recipeName,
        recipeId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        status: scheduledDate ? 'SCHEDULED' : 'DRAFT',
        notes: batchNotes || null,
        ProductionBatchTier: tierIds?.length ? {
          create: tierIds.map((tierId: number) => ({ tierId }))
        } : undefined
      },
      include: {
        ProductionBatchTier: {
          include: {
            CakeTier: {
              include: {
                TierSize: true
              }
            }
          }
        }
      }
    })

    // Link stock tasks to this batch
    if (stockTaskIds?.length) {
      await prisma.stockProductionTask.updateMany({
        where: { id: { in: stockTaskIds } },
        data: { productionBatchId: batch.id }
      })
    }

    // Recalculate totals if tiers were added
    if (tierIds?.length) {
      await recalculateBatchTotals(batch.id)
    }

    // Fetch updated batch
    const updatedBatch = await prisma.productionBatch.findUnique({
      where: { id: batch.id },
      include: {
        ProductionBatchTier: {
          include: {
            CakeTier: {
              include: {
                CakeOrder: {
                  select: { id: true, customerName: true, eventDate: true }
                },
                TierSize: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ batch: updatedBatch })
  } catch (error) {
    console.error('Failed to create production batch:', error)
    return NextResponse.json(
      { error: 'Failed to create batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Helper to recalculate batch totals
async function recalculateBatchTotals(batchId: number) {
  const batchTiers = await prisma.productionBatchTier.findMany({
    where: { batchId },
    include: {
      CakeTier: {
        include: { TierSize: true }
      }
    }
  })

  let totalTiers = 0
  let totalServings = 0
  let totalSurfaceArea = 0
  let totalButtercream = 0

  for (const bt of batchTiers) {
    totalTiers++
    totalServings += bt.CakeTier.TierSize?.servings || 0

    const sizeName = bt.CakeTier.TierSize?.name || '8 inch round'
    const diameterInches = parseDiameterFromSize(sizeName)
    const surfaceArea = calculateSurfaceArea(diameterInches)
    const complexity = bt.CakeTier.frostingComplexity || 2
    const buttercreamOz = estimateButtercreamOz(surfaceArea, complexity)

    totalSurfaceArea += surfaceArea
    totalButtercream += buttercreamOz
  }

  await prisma.productionBatch.update({
    where: { id: batchId },
    data: {
      totalTiers,
      totalServings,
      totalSurfaceArea,
      totalButtercream
    }
  })
}

// PUT /api/production/batches/manage - Update a batch (schedule, status, assign)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, scheduledDate, status, assignedToId, assignedTo, notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Batch id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null
    if (status !== undefined) updateData.status = status
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (notes !== undefined) updateData.notes = notes

    // Auto-update status based on scheduledDate
    if (scheduledDate && !status) {
      updateData.status = 'SCHEDULED'
    }

    const batch = await prisma.productionBatch.update({
      where: { id },
      data: updateData,
      include: {
        ProductionBatchTier: {
          include: {
            CakeTier: {
              include: {
                CakeOrder: {
                  select: { id: true, customerName: true, eventDate: true }
                },
                TierSize: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('Failed to update production batch:', error)
    return NextResponse.json(
      { error: 'Failed to update batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE is handled in [id]/route.ts
