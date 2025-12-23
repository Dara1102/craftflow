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

// GET /api/production/batches/manage/[id] - Get a single batch
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const batchId = parseInt(id)

  if (isNaN(batchId)) {
    return NextResponse.json({ error: 'Invalid batch id' }, { status: 400 })
  }

  try {
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
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
        }
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('Failed to fetch batch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/production/batches/manage/[id] - Add tiers to a batch
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const batchId = parseInt(id)

  if (isNaN(batchId)) {
    return NextResponse.json({ error: 'Invalid batch id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { tierIds, addedBy } = body

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return NextResponse.json(
        { error: 'tierIds array is required' },
        { status: 400 }
      )
    }

    // Verify batch exists
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Add tiers (ignore duplicates)
    const results = await Promise.allSettled(
      tierIds.map((tierId: number) =>
        prisma.productionBatchTier.create({
          data: {
            batchId,
            tierId,
            addedBy
          }
        })
      )
    )

    const added = results.filter(r => r.status === 'fulfilled').length
    const skipped = results.filter(r => r.status === 'rejected').length

    // Recalculate totals
    await recalculateBatchTotals(batchId)

    // Fetch updated batch
    const updatedBatch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
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

    return NextResponse.json({
      batch: updatedBatch,
      added,
      skipped,
      message: `Added ${added} tier(s), skipped ${skipped} duplicate(s)`
    })
  } catch (error) {
    console.error('Failed to add tiers to batch:', error)
    return NextResponse.json(
      { error: 'Failed to add tiers', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/production/batches/manage/[id] - Remove tiers from a batch
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const batchId = parseInt(id)

  if (isNaN(batchId)) {
    return NextResponse.json({ error: 'Invalid batch id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { tierIds } = body

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return NextResponse.json(
        { error: 'tierIds array is required' },
        { status: 400 }
      )
    }

    // Remove tiers from batch
    const result = await prisma.productionBatchTier.deleteMany({
      where: {
        batchId,
        tierId: { in: tierIds }
      }
    })

    // Recalculate totals
    await recalculateBatchTotals(batchId)

    // Fetch updated batch
    const updatedBatch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
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

    return NextResponse.json({
      batch: updatedBatch,
      removed: result.count,
      message: `Removed ${result.count} tier(s) from batch`
    })
  } catch (error) {
    console.error('Failed to remove tiers from batch:', error)
    return NextResponse.json(
      { error: 'Failed to remove tiers', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/production/batches/manage/[id] - Delete a batch
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const batchId = parseInt(id)

  if (isNaN(batchId)) {
    return NextResponse.json({ error: 'Invalid batch id' }, { status: 400 })
  }

  try {
    // Check if batch exists
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Delete batch (cascade deletes ProductionBatchTier)
    await prisma.productionBatch.delete({
      where: { id: batchId }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted batch "${batch.name}"`
    })
  } catch (error) {
    console.error('Failed to delete batch:', error)
    return NextResponse.json(
      { error: 'Failed to delete batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
