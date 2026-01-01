import { prisma } from './db'

export type TaskType = 'BAKE' | 'PREP' | 'STACK' | 'ASSEMBLE' | 'DECORATE' | 'PACKAGE' | 'DELIVERY'

export interface GeneratedTask {
  taskType: TaskType
  taskName: string
  productType: string | null
  itemIndex: number | null
  scheduledDate: Date
  durationMinutes: number
  dependsOnTask: TaskType | null
}

// Task durations in minutes (configurable defaults)
const TASK_DURATIONS: Record<TaskType, number> = {
  BAKE: 60,
  PREP: 30,
  STACK: 45,
  ASSEMBLE: 30,
  DECORATE: 60,
  PACKAGE: 15,
  DELIVERY: 60
}

// Task dependencies - what must be done before this task
const TASK_DEPENDENCIES: Record<TaskType, TaskType | null> = {
  BAKE: null,
  PREP: null,
  STACK: 'BAKE',  // Depends on BAKE and PREP
  ASSEMBLE: 'STACK',
  DECORATE: 'ASSEMBLE',
  PACKAGE: 'DECORATE',
  DELIVERY: 'PACKAGE'
}

/**
 * Generate production tasks for an order
 * Creates a sequence of tasks based on order contents
 */
export async function generateTasksForOrder(orderId: number): Promise<GeneratedTask[]> {
  const order = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      cakeTiers: {
        include: {
          tierSize: true,
          batterRecipe: true
        }
      },
      orderItems: {
        include: {
          productType: true,
          menuItem: true
        }
      }
    }
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  const tasks: GeneratedTask[] = []
  const eventDate = new Date(order.eventDate)

  // Calculate prep day (1 day before event by default, or 2 days for complex orders)
  const isComplex = order.cakeTiers.length >= 3 || order.orderItems.length > 5
  const prepDays = isComplex ? 2 : 1
  const prepDate = new Date(eventDate)
  prepDate.setDate(prepDate.getDate() - prepDays)

  // Generate tasks for cake tiers
  for (let i = 0; i < order.cakeTiers.length; i++) {
    const tier = order.cakeTiers[i]
    const tierName = tier.tierSize?.name || `Tier ${i + 1}`
    const flavorName = tier.batterRecipe?.name || 'cake'

    // Prep task
    tasks.push({
      taskType: 'PREP',
      taskName: `Prep ${tierName} ${flavorName}`,
      productType: 'CAKE',
      itemIndex: i,
      scheduledDate: prepDate,
      durationMinutes: TASK_DURATIONS.PREP,
      dependsOnTask: null
    })

    // Bake task
    tasks.push({
      taskType: 'BAKE',
      taskName: `Bake ${tierName} ${flavorName}`,
      productType: 'CAKE',
      itemIndex: i,
      scheduledDate: prepDate,
      durationMinutes: TASK_DURATIONS.BAKE,
      dependsOnTask: null
    })

    // Stack task (fill & crumb coat)
    const stackDate = isComplex ? prepDate : eventDate
    tasks.push({
      taskType: 'STACK',
      taskName: `Stack & Fill ${tierName}`,
      productType: 'CAKE',
      itemIndex: i,
      scheduledDate: stackDate,
      durationMinutes: TASK_DURATIONS.STACK,
      dependsOnTask: 'BAKE'
    })
  }

  // Assemble task (for multi-tier cakes, or single tier final assembly)
  if (order.cakeTiers.length > 0) {
    tasks.push({
      taskType: 'ASSEMBLE',
      taskName: order.cakeTiers.length > 1
        ? `Assemble ${order.cakeTiers.length}-tier cake`
        : `Final Assembly`,
      productType: 'CAKE',
      itemIndex: null,
      scheduledDate: eventDate,
      durationMinutes: TASK_DURATIONS.ASSEMBLE * order.cakeTiers.length,
      dependsOnTask: 'STACK'
    })

    // Decorate task (once for all tiers)
    tasks.push({
      taskType: 'DECORATE',
      taskName: `Decorate cake`,
      productType: 'CAKE',
      itemIndex: null,
      scheduledDate: eventDate,
      durationMinutes: TASK_DURATIONS.DECORATE * Math.ceil(order.cakeTiers.length / 2),
      dependsOnTask: 'ASSEMBLE'
    })
  }

  // Generate tasks for order items (cupcakes, etc.)
  const itemsByType = new Map<string, typeof order.orderItems>()
  for (const item of order.orderItems) {
    const typeName = item.productType?.name || 'Item'
    const existing = itemsByType.get(typeName) || []
    existing.push(item)
    itemsByType.set(typeName, existing)
  }

  for (const [typeName, items] of itemsByType) {
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

    // Prep
    tasks.push({
      taskType: 'PREP',
      taskName: `Prep ${typeName} (${totalQty})`,
      productType: typeName,
      itemIndex: null,
      scheduledDate: prepDate,
      durationMinutes: Math.ceil(totalQty / 24) * TASK_DURATIONS.PREP,
      dependsOnTask: null
    })

    // Bake
    tasks.push({
      taskType: 'BAKE',
      taskName: `Bake ${typeName} (${totalQty})`,
      productType: typeName,
      itemIndex: null,
      scheduledDate: prepDate,
      durationMinutes: Math.ceil(totalQty / 24) * TASK_DURATIONS.BAKE,
      dependsOnTask: 'PREP'
    })

    // Decorate
    tasks.push({
      taskType: 'DECORATE',
      taskName: `Decorate ${typeName} (${totalQty})`,
      productType: typeName,
      itemIndex: null,
      scheduledDate: eventDate,
      durationMinutes: Math.ceil(totalQty / 12) * TASK_DURATIONS.DECORATE,
      dependsOnTask: 'BAKE'
    })
  }

  // Package task
  tasks.push({
    taskType: 'PACKAGE',
    taskName: `Package order #${orderId}`,
    productType: null,
    itemIndex: null,
    scheduledDate: eventDate,
    durationMinutes: TASK_DURATIONS.PACKAGE,
    dependsOnTask: 'DECORATE'
  })

  // Delivery task (if delivery)
  if (order.deliveryMethod === 'delivery') {
    tasks.push({
      taskType: 'DELIVERY',
      taskName: `Deliver order #${orderId}`,
      productType: null,
      itemIndex: null,
      scheduledDate: eventDate,
      durationMinutes: TASK_DURATIONS.DELIVERY,
      dependsOnTask: 'PACKAGE'
    })
  }

  return tasks
}

/**
 * Save generated tasks to database
 */
export async function saveTasksForOrder(orderId: number, tasks: GeneratedTask[]): Promise<void> {
  // Delete existing tasks for this order
  await prisma.productionTask.deleteMany({
    where: { orderId }
  })

  // Create tasks with dependencies
  const taskMap = new Map<string, number>() // taskType-productType-itemIndex -> taskId

  for (const task of tasks) {
    const key = `${task.taskType}-${task.productType || 'null'}-${task.itemIndex ?? 'null'}`

    // Find dependency
    let dependsOnId: number | null = null
    if (task.dependsOnTask) {
      const depKey = `${task.dependsOnTask}-${task.productType || 'null'}-${task.itemIndex ?? 'null'}`
      dependsOnId = taskMap.get(depKey) || null

      // Fallback: find any task of the dependency type for this product
      if (!dependsOnId) {
        const fallbackKey = `${task.dependsOnTask}-${task.productType || 'null'}-null`
        dependsOnId = taskMap.get(fallbackKey) || null
      }
    }

    const created = await prisma.productionTask.create({
      data: {
        orderId,
        taskType: task.taskType,
        taskName: task.taskName,
        productType: task.productType,
        itemIndex: task.itemIndex,
        scheduledDate: task.scheduledDate,
        durationMinutes: task.durationMinutes,
        dependsOnId,
        status: 'PENDING'
      }
    })

    taskMap.set(key, created.id)
  }
}

/**
 * Get tasks for multiple orders grouped by date
 */
export async function getTasksByDateRange(
  startDate: Date,
  endDate: Date,
  orderIds?: number[]
): Promise<{
  date: string
  tasks: {
    id: number
    orderId: number
    taskType: string
    taskName: string
    productType: string | null
    status: string
    scheduledDate: string
    scheduledStart: string | null
    scheduledEnd: string | null
    durationMinutes: number | null
    assignedTo: string | null
    dependsOnId: number | null
  }[]
}[]> {
  const where: Record<string, unknown> = {
    scheduledDate: {
      gte: startDate,
      lte: endDate
    }
  }

  if (orderIds && orderIds.length > 0) {
    where.orderId = { in: orderIds }
  }

  const tasks = await prisma.productionTask.findMany({
    where,
    orderBy: [
      { scheduledDate: 'asc' },
      { scheduledStart: 'asc' },
      { taskType: 'asc' }
    ]
  })

  // Group by date
  const byDate = new Map<string, typeof tasks>()

  for (const task of tasks) {
    const dateKey = task.scheduledDate.toISOString().split('T')[0]
    const existing = byDate.get(dateKey) || []
    existing.push(task)
    byDate.set(dateKey, existing)
  }

  return Array.from(byDate.entries())
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
        assignedTo: t.assignedTo,
        dependsOnId: t.dependsOnId
      }))
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
