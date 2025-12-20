import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffIdStr = searchParams.get('staffId')
    const range = searchParams.get('range') || 'week'

    if (!staffIdStr) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const staffId = parseInt(staffIdStr)

    // Get staff info
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, isManager: true }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (range) {
      case 'week':
        // Start of current week (Sunday)
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)
        // End of week (Saturday)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 7)
        break
      case 'month':
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        // End of month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      default:
        // All - past month to future month
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - 1)
        endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() + 1)
    }

    // Get orders where this staff is the lead
    const leadOrders = await prisma.orderAssignment.findMany({
      where: {
        staffId,
        Order: {
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      include: {
        Order: {
          include: {
            Customer: { select: { name: true } },
            CakeTier: { select: { id: true } },
            ProductionTask: {
              where: {
                assignedToId: staffId
              },
              orderBy: { scheduledDate: 'asc' }
            }
          }
        }
      }
    })

    // Get tasks assigned to this staff (including tasks for orders they don't lead)
    const assignedTasks = await prisma.productionTask.findMany({
      where: {
        assignedToId: staffId,
        scheduledDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        Order: {
          include: {
            Customer: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { id: 'asc' }
      ]
    })

    // Build order assignments map
    const orderMap = new Map<number, {
      orderId: number
      customerName: string
      eventDate: Date
      theme: string | null
      colors: string | null
      status: string
      isLead: boolean
      tierCount: number
      tasks: typeof assignedTasks
    }>()

    // Add lead orders
    for (const assignment of leadOrders) {
      const order = assignment.Order
      orderMap.set(order.id, {
        orderId: order.id,
        customerName: order.Customer?.name || order.customerName || 'Unknown',
        eventDate: order.eventDate,
        theme: order.theme,
        colors: order.colors,
        status: order.status,
        isLead: true,
        tierCount: order.CakeTier.length,
        tasks: order.ProductionTask
      })
    }

    // Add/update with assigned tasks
    for (const task of assignedTasks) {
      const order = task.Order
      const existing = orderMap.get(order.id)

      if (existing) {
        // Check if task is already in the list
        if (!existing.tasks.find(t => t.id === task.id)) {
          existing.tasks.push(task)
        }
      } else {
        orderMap.set(order.id, {
          orderId: order.id,
          customerName: order.Customer?.name || order.customerName || 'Unknown',
          eventDate: order.eventDate,
          theme: order.theme,
          colors: order.colors,
          status: order.status,
          isLead: false,
          tierCount: 0,
          tasks: [task]
        })
      }
    }

    // Convert to array and sort by event date
    const assignments = Array.from(orderMap.values())
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
      .map(a => ({
        ...a,
        eventDate: a.eventDate.toISOString(),
        tasks: a.tasks.map(t => ({
          id: t.id,
          taskType: t.taskType,
          taskName: t.taskName,
          scheduledDate: t.scheduledDate.toISOString(),
          scheduledStart: t.scheduledStart?.toISOString() || null,
          scheduledEnd: t.scheduledEnd?.toISOString() || null,
          durationMinutes: t.durationMinutes,
          status: t.status,
          notes: t.notes,
          orderId: t.orderId,
          order: {
            id: t.orderId,
            customerName: a.customerName,
            eventDate: a.eventDate.toString(),
            theme: a.theme,
            colors: a.colors
          }
        }))
      }))

    // Calculate stats
    const allTasks = assignments.flatMap(a => a.tasks)
    const stats = {
      totalOrders: assignments.length,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'COMPLETED').length,
      pendingTasks: allTasks.filter(t => t.status === 'PENDING').length,
      inProgressTasks: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      totalMinutes: allTasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0)
    }

    return NextResponse.json({
      staff,
      assignments,
      stats
    })
  } catch (error) {
    console.error('Failed to fetch worker assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch worker assignments' },
      { status: 500 }
    )
  }
}
