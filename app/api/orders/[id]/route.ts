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
      CakeTier: {
        include: {
          TierSize: true
        }
      },
      OrderDecoration: {
        include: {
          DecorationTechnique: true
        }
      }
    }
  })

  if (!orderRaw) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Transform to expected format for frontend
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
