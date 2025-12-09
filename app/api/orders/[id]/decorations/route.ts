import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)
  const body = await request.json()

  const { decorationTechniqueId, quantity = 1 } = body

  try {
    const orderDecoration = await prisma.orderDecoration.create({
      data: {
        cakeOrderId: orderId,
        decorationTechniqueId,
        quantity
      },
      include: {
        decorationTechnique: true
      }
    })

    return NextResponse.json(orderDecoration)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add decoration' },
      { status: 500 }
    )
  }
}
