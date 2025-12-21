import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TaskStatus } from '@prisma/client'

// GET /api/production/tasks - List tasks for orders
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  const orderIds = searchParams.get('orderIds')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const groupByDate = searchParams.get('groupByDate') !== 'false' // default true for Gantt

  try {
    // Build where clause
    const where: Record<string, unknown> = {}

    if (orderId) {
      // Single order (from TaskManager)
      where.orderId = parseInt(orderId)
    } else if (orderIds) {
      // Multiple orders (from Gantt/reports)
      where.orderId = { in: orderIds.split(',').map(id => parseInt(id)) }
    } else if (startDate && endDate) {
      // Date range (from Gantt/reports)
      where.CakeOrder = {
        eventDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    }

    const tasks = await prisma.productionTask.findMany({
      where,
      include: {
        AssignedToStaff: {
          select: { id: true, name: true }
        },
        CompletedByStaff: {
          select: { id: true, name: true }
        },
        CakeOrder: {
          select: {
            id: true,
            customerName: true,
            eventDate: true,
            deliveryTime: true,
            pickupTime: true,
            isDelivery: true,
            size: true,
            isBulkOrder: true,
            bulkQuantity: true,
            Customer: { select: { name: true } },
            _count: { select: { CakeTier: true } },
            CakeTier: {
              select: {
                tierIndex: true,
                flavor: true,
                filling: true,
                Recipe_CakeTier_batterRecipeIdToRecipe: { select: { name: true } },
                Recipe_CakeTier_fillingRecipeIdToRecipe: { select: { name: true } },
                Recipe_CakeTier_frostingRecipeIdToRecipe: { select: { name: true } }
              },
              orderBy: { tierIndex: 'asc' }
            }
          }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledStart: 'asc' },
        { taskType: 'asc' }
      ]
    })

    // If single orderId, return flat array (for TaskManager)
    if (orderId) {
      return NextResponse.json(tasks)
    }

    // Group by date for Gantt view
    const tasksByDate: Record<string, typeof tasks> = {}
    for (const task of tasks) {
      const dateKey = task.scheduledDate.toISOString().split('T')[0]
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = []
      }
      tasksByDate[dateKey].push(task)
    }

    // Convert to array of { date, tasks }
    const groupedTasks = Object.entries(tasksByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateTasks]) => ({
        date,
        tasks: dateTasks.map(t => ({
          id: t.id,
          orderId: t.orderId,
          taskType: t.taskType,
          taskName: t.taskName,
          productType: t.productType,
          status: t.status,
          scheduledDate: t.scheduledDate.toISOString(),
          scheduledStart: t.scheduledStart?.toISOString() || null,
          scheduledEnd: t.scheduledEnd?.toISOString() || null,
          durationMinutes: t.durationMinutes,
          assignedTo: t.AssignedToStaff?.name || t.assignedTo,
          dependsOnId: t.dependsOnId,
          customerName: t.CakeOrder?.Customer?.name || t.CakeOrder?.customerName || 'Unknown',
          // Order details for batch planner
          eventDate: t.CakeOrder?.eventDate?.toISOString() || null,
          eventTime: t.CakeOrder?.isDelivery
            ? t.CakeOrder?.deliveryTime?.toISOString() || null
            : t.CakeOrder?.pickupTime?.toISOString() || null,
          isDelivery: t.CakeOrder?.isDelivery || false,
          cakeSize: t.CakeOrder?.size || null,
          tierCount: t.CakeOrder?._count?.CakeTier || 0,
          isBulkOrder: t.CakeOrder?.isBulkOrder || false,
          bulkQuantity: t.CakeOrder?.bulkQuantity || null,
          // Tier flavor details - aggregate unique flavors across tiers
          flavors: (() => {
            const tiers = t.CakeOrder?.CakeTier || []
            const batters = new Set<string>()
            const fillings = new Set<string>()
            const frostings = new Set<string>()
            for (const tier of tiers) {
              const batter = tier.flavor || tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name
              const filling = tier.filling || tier.Recipe_CakeTier_fillingRecipeIdToRecipe?.name
              const frosting = tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name
              if (batter) batters.add(batter)
              if (filling) fillings.add(filling)
              if (frosting) frostings.add(frosting)
            }
            return {
              batters: Array.from(batters),
              fillings: Array.from(fillings),
              frostings: Array.from(frostings)
            }
          })()
        }))
      }))

    return NextResponse.json({ tasks: groupedTasks })
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/production/tasks - Create a new task
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderId,
      taskType,
      taskName,
      productType,
      itemIndex,
      scheduledDate,
      scheduledStart,
      scheduledEnd,
      durationMinutes,
      assignedToId,
      dependsOnId,
      notes
    } = body

    if (!orderId || !taskType || !taskName || !scheduledDate) {
      return NextResponse.json(
        { error: 'orderId, taskType, taskName, and scheduledDate are required' },
        { status: 400 }
      )
    }

    // Get staff name if assigned
    let assignedTo = null
    if (assignedToId) {
      const staff = await prisma.staff.findUnique({
        where: { id: assignedToId },
        select: { name: true }
      })
      assignedTo = staff?.name || null
    }

    const task = await prisma.productionTask.create({
      data: {
        orderId,
        taskType,
        taskName,
        productType: productType || null,
        itemIndex: itemIndex || null,
        scheduledDate: new Date(scheduledDate),
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        durationMinutes: durationMinutes || null,
        status: 'PENDING',
        assignedToId: assignedToId || null,
        assignedTo,
        dependsOnId: dependsOnId || null,
        notes: notes || null,
        updatedAt: new Date()
      },
      include: {
        AssignedToStaff: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

// Standard task templates for cake orders
// Sequence: BAKE → PREP → STACK → COOL → FROST → FINAL → PACKAGE
export const TASK_TEMPLATES = [
  { taskType: 'BAKE', taskName: 'Bake Cakes', durationMinutes: 60 },
  { taskType: 'PREP', taskName: 'Make Frosting', durationMinutes: 45 },
  { taskType: 'STACK', taskName: 'Fill & Crumb Coat', durationMinutes: 45 },
  { taskType: 'COOL', taskName: 'Cool & Level Cakes', durationMinutes: 30 },
  { taskType: 'FROST', taskName: 'Final Frosting (Top Coat)', durationMinutes: 60 },
  { taskType: 'FINAL', taskName: 'Cool & Final Touches', durationMinutes: 30 },
  { taskType: 'PACKAGE', taskName: 'Package for Pickup/Delivery', durationMinutes: 15 },
]
