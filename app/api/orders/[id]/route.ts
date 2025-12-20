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
