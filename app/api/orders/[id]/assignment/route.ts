import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  try {
    const assignment = await prisma.orderAssignment.findUnique({
      where: { orderId },
      include: {
        Staff: {
          include: {
            StaffRole: {
              include: {
                LaborRole: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ assigned: false, staff: null })
    }

    return NextResponse.json({
      assigned: true,
      id: assignment.id,
      staffId: assignment.staffId,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      notes: assignment.notes,
      staff: {
        id: assignment.Staff.id,
        name: assignment.Staff.name,
        email: assignment.Staff.email,
        isManager: assignment.Staff.isManager,
        roles: assignment.Staff.StaffRole.map(sr => ({
          id: sr.LaborRole.id,
          name: sr.LaborRole.name,
          isPrimary: sr.isPrimary
        }))
      }
    })
  } catch (error) {
    console.error('Failed to fetch order assignment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order assignment' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { staffId, assignedBy, notes } = body

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })
    }

    // Verify order exists
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Upsert assignment (create or update)
    const assignment = await prisma.orderAssignment.upsert({
      where: { orderId },
      create: {
        orderId,
        staffId,
        assignedBy: assignedBy || null,
        notes: notes || null
      },
      update: {
        staffId,
        assignedBy: assignedBy || null,
        notes: notes || null,
        assignedAt: new Date()
      },
      include: {
        Staff: {
          include: {
            StaffRole: {
              include: {
                LaborRole: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      id: assignment.id,
      staffId: assignment.staffId,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      notes: assignment.notes,
      staff: {
        id: assignment.Staff.id,
        name: assignment.Staff.name,
        email: assignment.Staff.email,
        isManager: assignment.Staff.isManager,
        roles: assignment.Staff.StaffRole.map(sr => ({
          id: sr.LaborRole.id,
          name: sr.LaborRole.name,
          isPrimary: sr.isPrimary
        }))
      }
    })
  } catch (error) {
    console.error('Failed to assign order:', error)
    return NextResponse.json(
      { error: 'Failed to assign order' },
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

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  try {
    const assignment = await prisma.orderAssignment.findUnique({
      where: { orderId }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'No assignment found for this order' }, { status: 404 })
    }

    await prisma.orderAssignment.delete({
      where: { orderId }
    })

    return NextResponse.json({
      success: true,
      message: 'Order assignment removed'
    })
  } catch (error) {
    console.error('Failed to remove order assignment:', error)
    return NextResponse.json(
      { error: 'Failed to remove order assignment' },
      { status: 500 }
    )
  }
}
