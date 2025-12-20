import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orderIdsParam = searchParams.get('orderIds')

  try {
    let orderIds: number[] = []

    if (orderIdsParam) {
      orderIds = orderIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    } else if (startDate && endDate) {
      const orders = await prisma.cakeOrder.findMany({
        where: {
          eventDate: {
            gte: new Date(startDate),
            lte: new Date(endDate + 'T23:59:59')
          },
          status: { notIn: ['CANCELLED'] }
        },
        select: { id: true }
      })
      orderIds = orders.map(o => o.id)
    } else {
      // Default: next 14 days
      const now = new Date()
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + 14)

      const orders = await prisma.cakeOrder.findMany({
        where: {
          eventDate: {
            gte: now,
            lte: futureDate
          },
          status: { notIn: ['CANCELLED'] }
        },
        select: { id: true }
      })
      orderIds = orders.map(o => o.id)
    }

    if (orderIds.length === 0) {
      return NextResponse.json({
        orders: [],
        stats: {
          total: 0,
          assigned: 0,
          unassigned: 0
        }
      })
    }

    // Fetch orders with assignments and prep signoff status
    const orders = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        Customer: true,
        OrderAssignment: {
          include: {
            Staff: {
              select: {
                id: true,
                name: true,
                isManager: true
              }
            }
          }
        },
        ProductionPrepSignoff: true,
        CakeTier: {
          select: {
            id: true,
            cakeboardTypeId: true
          }
        },
        ProductionTask: {
          select: {
            id: true,
            assignedToId: true
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    const transformedOrders = orders.map(order => {
      const tierCount = order.CakeTier.length
      const tiersWithCakeboard = order.CakeTier.filter(t => t.cakeboardTypeId).length
      const taskCount = order.ProductionTask.length
      const assignedTasks = order.ProductionTask.filter(t => t.assignedToId).length

      return {
        id: order.id,
        customerName: order.Customer?.name || order.customerName || 'Unknown',
        eventDate: order.eventDate.toISOString(),
        eventTime: order.isDelivery
          ? (order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null)
          : (order.pickupTime ? new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null),
        isDelivery: order.isDelivery,
        status: order.status,
        // Assignment info
        orderLead: order.OrderAssignment ? {
          id: order.OrderAssignment.Staff.id,
          name: order.OrderAssignment.Staff.name,
          isManager: order.OrderAssignment.Staff.isManager,
          assignedAt: order.OrderAssignment.assignedAt
        } : null,
        // Prep status
        prepStatus: order.ProductionPrepSignoff?.status || 'NOT_STARTED',
        prepSignoff: order.ProductionPrepSignoff ? {
          signedAt: order.ProductionPrepSignoff.signedAt,
          lockedAt: order.ProductionPrepSignoff.lockedAt
        } : null,
        // Counts for progress
        tierCount,
        tiersWithCakeboard,
        taskCount,
        assignedTasks
      }
    })

    const assigned = transformedOrders.filter(o => o.orderLead !== null).length
    const unassigned = transformedOrders.filter(o => o.orderLead === null).length

    return NextResponse.json({
      orders: transformedOrders,
      stats: {
        total: transformedOrders.length,
        assigned,
        unassigned,
        signedOff: transformedOrders.filter(o => o.prepStatus === 'SIGNED_OFF').length,
        inReview: transformedOrders.filter(o => o.prepStatus === 'IN_REVIEW').length,
        notStarted: transformedOrders.filter(o => o.prepStatus === 'NOT_STARTED').length
      }
    })
  } catch (error) {
    console.error('Failed to fetch assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { assignments, assignedBy } = body

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: 'Assignments array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const { orderId, staffId } of assignments) {
      if (!orderId || !staffId) continue

      try {
        const assignment = await prisma.orderAssignment.upsert({
          where: { orderId },
          create: {
            orderId,
            staffId,
            assignedBy: assignedBy || null
          },
          update: {
            staffId,
            assignedBy: assignedBy || null,
            assignedAt: new Date()
          },
          include: {
            Staff: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })

        results.push({
          orderId,
          success: true,
          staffName: assignment.Staff.name
        })
      } catch (err) {
        results.push({
          orderId,
          success: false,
          error: 'Failed to assign'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    })
  } catch (error) {
    console.error('Failed to bulk assign:', error)
    return NextResponse.json(
      { error: 'Failed to bulk assign orders' },
      { status: 500 }
    )
  }
}
