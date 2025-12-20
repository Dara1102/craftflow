import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const staffId = parseInt(id)

  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 })
  }

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        StaffRole: {
          include: {
            LaborRole: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            OrderAssignment: true,
            ProductionTask_assigned: true,
            TaskSignoff: true
          }
        }
      }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      isActive: staff.isActive,
      isManager: staff.isManager,
      hireDate: staff.hireDate,
      notes: staff.notes,
      sortOrder: staff.sortOrder,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      roles: staff.StaffRole.map(sr => ({
        id: sr.LaborRole.id,
        name: sr.LaborRole.name,
        isPrimary: sr.isPrimary
      })),
      stats: {
        ordersAssigned: staff._count.OrderAssignment,
        tasksAssigned: staff._count.ProductionTask_assigned,
        signoffs: staff._count.TaskSignoff
      }
    })
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff member' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const staffId = parseInt(id)

  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, isManager, isActive, hireDate, notes, sortOrder, roleIds, primaryRoleId } = body

    // Verify staff exists
    const existing = await prisma.staff.findUnique({
      where: { id: staffId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.staff.findUnique({
        where: { name: name.trim() }
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A staff member with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate email if email is being changed
    if (email && email !== existing.email) {
      const duplicate = await prisma.staff.findUnique({
        where: { email: email.trim() }
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A staff member with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: {
      name?: string
      email?: string | null
      phone?: string | null
      isManager?: boolean
      isActive?: boolean
      hireDate?: Date | null
      notes?: string | null
      sortOrder?: number
    } = {}

    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (isManager !== undefined) updateData.isManager = isManager
    if (isActive !== undefined) updateData.isActive = isActive
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    // Update staff member
    const staff = await prisma.staff.update({
      where: { id: staffId },
      data: updateData,
      include: {
        StaffRole: {
          include: {
            LaborRole: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Update roles if provided
    if (roleIds !== undefined) {
      // Delete existing roles
      await prisma.staffRole.deleteMany({
        where: { staffId }
      })

      // Create new roles
      if (roleIds && roleIds.length > 0) {
        await prisma.staffRole.createMany({
          data: roleIds.map((roleId: number) => ({
            staffId,
            laborRoleId: roleId,
            isPrimary: primaryRoleId ? roleId === primaryRoleId : false
          }))
        })
      }

      // Fetch updated staff with new roles
      const updatedStaff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          StaffRole: {
            include: {
              LaborRole: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      return NextResponse.json({
        id: updatedStaff!.id,
        name: updatedStaff!.name,
        email: updatedStaff!.email,
        phone: updatedStaff!.phone,
        isActive: updatedStaff!.isActive,
        isManager: updatedStaff!.isManager,
        hireDate: updatedStaff!.hireDate,
        notes: updatedStaff!.notes,
        roles: updatedStaff!.StaffRole.map(sr => ({
          id: sr.LaborRole.id,
          name: sr.LaborRole.name,
          isPrimary: sr.isPrimary
        }))
      })
    }

    return NextResponse.json({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      isActive: staff.isActive,
      isManager: staff.isManager,
      hireDate: staff.hireDate,
      notes: staff.notes,
      roles: staff.StaffRole.map(sr => ({
        id: sr.LaborRole.id,
        name: sr.LaborRole.name,
        isPrimary: sr.isPrimary
      }))
    })
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const staffId = parseInt(id)

  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 })
  }

  try {
    // Verify staff exists
    const existing = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        _count: {
          select: {
            OrderAssignment: true,
            ProductionTask_assigned: true
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    // If staff has assignments, soft delete instead
    if (existing._count.OrderAssignment > 0 || existing._count.ProductionTask_assigned > 0) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { isActive: false }
      })
      return NextResponse.json({
        success: true,
        message: 'Staff member deactivated (has existing assignments)'
      })
    }

    // Otherwise, hard delete
    await prisma.staff.delete({
      where: { id: staffId }
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted'
    })
  } catch (error) {
    console.error('Failed to delete staff:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}
