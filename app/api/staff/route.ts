import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const roleId = searchParams.get('roleId')
  const isManager = searchParams.get('isManager')

  try {
    const where: {
      isActive?: boolean
      isManager?: boolean
      StaffRole?: { some: { laborRoleId: number } }
    } = {}

    if (!includeInactive) {
      where.isActive = true
    }

    if (isManager === 'true') {
      where.isManager = true
    } else if (isManager === 'false') {
      where.isManager = false
    }

    if (roleId) {
      where.StaffRole = {
        some: { laborRoleId: parseInt(roleId) }
      }
    }

    const staff = await prisma.staff.findMany({
      where,
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
            OrderAssignment: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform to include role names directly
    const transformedStaff = staff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      isActive: s.isActive,
      isManager: s.isManager,
      hireDate: s.hireDate,
      notes: s.notes,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt,
      roles: s.StaffRole.map(sr => ({
        id: sr.LaborRole.id,
        name: sr.LaborRole.name,
        isPrimary: sr.isPrimary
      })),
      orderCount: s._count.OrderAssignment
    }))

    return NextResponse.json(transformedStaff)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, isManager, hireDate, notes, roleIds } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.staff.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A staff member with this name already exists' },
        { status: 400 }
      )
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await prisma.staff.findUnique({
        where: { email: email.trim() }
      })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'A staff member with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Get max sort order
    const maxSort = await prisma.staff.aggregate({
      _max: { sortOrder: true }
    })

    const staff = await prisma.staff.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        isManager: isManager || false,
        hireDate: hireDate ? new Date(hireDate) : null,
        notes: notes?.trim() || null,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
        isActive: true,
        StaffRole: roleIds && roleIds.length > 0 ? {
          create: roleIds.map((roleId: number, index: number) => ({
            laborRoleId: roleId,
            isPrimary: index === 0 // First role is primary
          }))
        } : undefined
      },
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
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create staff:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create staff member: ${errorMessage}` },
      { status: 500 }
    )
  }
}
