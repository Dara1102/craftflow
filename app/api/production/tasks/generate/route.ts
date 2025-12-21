import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Standard task templates for cake orders with default scheduling
// Sequence: BAKE → PREP (frosting) → STACK (fill & crumb) → COOL → FROST (top coat) → FINAL → PACKAGE
// daysBefore: how many days before the event this task should be scheduled
const TASK_TEMPLATES = [
  { taskType: 'BAKE', taskName: 'Bake Cakes', durationMinutes: 60, order: 1, daysBefore: 2 },
  { taskType: 'PREP', taskName: 'Make Frosting', durationMinutes: 45, order: 2, daysBefore: 2 },
  { taskType: 'STACK', taskName: 'Fill & Crumb Coat', durationMinutes: 45, order: 3, daysBefore: 1 },
  { taskType: 'COOL', taskName: 'Cool & Level Cakes', durationMinutes: 30, order: 4, daysBefore: 1 },
  { taskType: 'FROST', taskName: 'Final Frosting (Top Coat)', durationMinutes: 60, order: 5, daysBefore: 1 },
  { taskType: 'FINAL', taskName: 'Cool & Final Touches', durationMinutes: 30, order: 6, daysBefore: 0 },
  { taskType: 'PACKAGE', taskName: 'Package for Pickup/Delivery', durationMinutes: 15, order: 7, daysBefore: 0 },
]

// POST /api/production/tasks/generate - Generate standard tasks for an order
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, scheduledDate, includeTypes } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      )
    }

    // Get the order to determine the scheduled date
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      select: { eventDate: true }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const eventDate = new Date(order.eventDate)

    // Helper to calculate task date based on days before event
    const getTaskDate = (daysBefore: number) => {
      const date = new Date(eventDate)
      date.setDate(date.getDate() - daysBefore)
      return date
    }

    // Filter templates if specific types requested
    const templates = includeTypes && includeTypes.length > 0
      ? TASK_TEMPLATES.filter(t => includeTypes.includes(t.taskType))
      : TASK_TEMPLATES

    // Check for existing tasks to avoid duplicates
    const existingTasks = await prisma.productionTask.findMany({
      where: { orderId },
      select: { taskType: true }
    })
    const existingTypes = new Set(existingTasks.map(t => t.taskType))

    // Create tasks that don't already exist
    const tasksToCreate = templates.filter(t => !existingTypes.has(t.taskType))

    if (tasksToCreate.length === 0) {
      return NextResponse.json({
        message: 'All standard tasks already exist for this order',
        created: 0,
        tasks: []
      })
    }

    // If scheduledDate is provided, use it for all tasks (manual override)
    // Otherwise, use daysBefore to calculate each task's date
    const tasks = await prisma.productionTask.createManyAndReturn({
      data: tasksToCreate.map(template => ({
        orderId,
        taskType: template.taskType,
        taskName: template.taskName,
        durationMinutes: template.durationMinutes,
        scheduledDate: scheduledDate
          ? new Date(scheduledDate)
          : getTaskDate(template.daysBefore),
        status: 'PENDING',
        updatedAt: new Date()
      }))
    })

    return NextResponse.json({
      message: `Created ${tasks.length} tasks`,
      created: tasks.length,
      tasks
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to generate tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}

// GET /api/production/tasks/generate - Get available task templates
export async function GET() {
  return NextResponse.json({
    templates: TASK_TEMPLATES
  })
}
