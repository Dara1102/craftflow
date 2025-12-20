import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { signedById, managerNotes } = body

    if (!signedById) {
      return NextResponse.json({ error: 'Manager ID is required' }, { status: 400 })
    }

    // Verify order exists
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        ProductionPrepSignoff: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if already signed off
    if (order.ProductionPrepSignoff?.signedAt) {
      return NextResponse.json(
        { error: 'Order already signed off' },
        { status: 400 }
      )
    }

    // Verify manager exists and is a manager
    const manager = await prisma.staff.findUnique({
      where: { id: signedById }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
    }

    if (!manager.isManager) {
      return NextResponse.json(
        { error: 'Only managers can sign off orders' },
        { status: 403 }
      )
    }

    const now = new Date()

    // Upsert prep signoff with signed status
    const prepSignoff = await prisma.productionPrepSignoff.upsert({
      where: { orderId },
      create: {
        orderId,
        status: 'SIGNED_OFF',
        signedById,
        signedAt: now,
        managerNotes: managerNotes || null,
        lockedAt: now
      },
      update: {
        status: 'SIGNED_OFF',
        signedById,
        signedAt: now,
        managerNotes: managerNotes || null,
        lockedAt: now
      },
      include: {
        SignedBy: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      signoff: {
        id: prepSignoff.id,
        orderId: prepSignoff.orderId,
        status: prepSignoff.status,
        signedById: prepSignoff.signedById,
        signedByName: prepSignoff.SignedBy?.name,
        signedAt: prepSignoff.signedAt,
        managerNotes: prepSignoff.managerNotes,
        lockedAt: prepSignoff.lockedAt
      }
    })
  } catch (error) {
    console.error('Failed to sign off order:', error)
    return NextResponse.json(
      { error: 'Failed to sign off order' },
      { status: 500 }
    )
  }
}
