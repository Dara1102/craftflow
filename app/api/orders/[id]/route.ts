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
