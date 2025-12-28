import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  const orderRaw = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      Customer: true,
      CakeTier: {
        include: {
          TierSize: true,
          Recipe_CakeTier_batterRecipeIdToRecipe: { select: { name: true } },
          Recipe_CakeTier_fillingRecipeIdToRecipe: { select: { name: true } },
          Recipe_CakeTier_frostingRecipeIdToRecipe: { select: { name: true } },
          CakeboardType: { select: { name: true } }
        },
        orderBy: { tierIndex: 'asc' }
      },
      OrderDecoration: {
        include: {
          DecorationTechnique: true
        }
      },
      OrderItem: {
        include: {
          ProductType: true,
          MenuItem: true
        }
      },
      OrderAssignment: {
        include: {
          Staff: { select: { id: true, name: true } }
        }
      },
      ProductionTask: {
        orderBy: { scheduledDate: 'asc' }
      }
    }
  })

  if (!orderRaw) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Transform to expected format for frontend (backwards compatible)
  const order = {
    ...orderRaw,
    cakeTiers: orderRaw.CakeTier.map(tier => ({
      ...tier,
      tierSize: tier.TierSize
    })),
    orderDecorations: orderRaw.OrderDecoration.map(dec => ({
      ...dec,
      decorationTechnique: dec.DecorationTechnique
    }))
  }

  return NextResponse.json(order)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  try {
    const body = await request.json()

    // Only allow certain fields to be updated
    const allowedFields = [
      'imageUrl', 'status', 'notes', 'isBulkOrder', 'bulkQuantity', 'productionDays',
      'customerName', 'eventDate', 'occasion', 'theme', 'colors', 'accentColors',
      'topperType', 'topperText', 'isDelivery', 'deliveryAddress', 'deliveryTime', 'pickupTime'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const order = await prisma.cakeOrder.update({
      where: { id: orderId },
      data: updateData
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Failed to update order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  try {
    // Check if order exists
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        CakeTier: {
          include: {
            ProductionBatchTier: true
          }
        },
        ProductionTask: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if any tiers are in production batches
    const hasScheduledTiers = order.CakeTier.some(tier => tier.ProductionBatchTier.length > 0)
    if (hasScheduledTiers) {
      return NextResponse.json(
        { error: 'Cannot delete order with scheduled tiers. Unschedule all tiers first.' },
        { status: 400 }
      )
    }

    // Delete in order: decorations, tiers, items, assignments, production tasks, then order
    await prisma.$transaction(async (tx) => {
      // Delete order decorations
      await tx.orderDecoration.deleteMany({ where: { cakeOrderId: orderId } })

      // Delete cake tiers
      await tx.cakeTier.deleteMany({ where: { cakeOrderId: orderId } })

      // Delete order items
      await tx.orderItem.deleteMany({ where: { cakeOrderId: orderId } })

      // Delete order assignments
      await tx.orderAssignment.deleteMany({ where: { orderId: orderId } })

      // Delete production tasks
      await tx.productionTask.deleteMany({ where: { orderId: orderId } })

      // Delete order packaging
      await tx.orderPackaging.deleteMany({ where: { cakeOrderId: orderId } })

      // Finally delete the order
      await tx.cakeOrder.delete({ where: { id: orderId } })
    })

    return NextResponse.json({ success: true, message: `Order #${orderId} deleted` })
  } catch (error) {
    console.error('Failed to delete order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
