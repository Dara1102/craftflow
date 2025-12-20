import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock-tasks/[id] - Get a single stock task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const task = await prisma.stockProductionTask.findUnique({
      where: { id: taskId },
      include: {
        InventoryItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            productType: true,
            flavor: true,
            currentStock: true,
            minStock: true,
            maxStock: true,
            shelfLifeDays: true
          }
        },
        AssignedToStaff: {
          select: { id: true, name: true }
        },
        InventoryLot: {
          select: { id: true, quantity: true, producedAt: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to fetch stock task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock task' },
      { status: 500 }
    )
  }
}

// PATCH /api/stock-tasks/[id] - Update a stock task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    // Standard field updates
    if (body.taskName !== undefined) updateData.taskName = body.taskName
    if (body.targetQuantity !== undefined) updateData.targetQuantity = body.targetQuantity
    if (body.scheduledDate !== undefined) updateData.scheduledDate = new Date(body.scheduledDate)
    if (body.scheduledStart !== undefined) updateData.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null
    if (body.scheduledEnd !== undefined) updateData.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null
    if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status

    // Handle assignment
    if (body.assignedToId !== undefined) {
      updateData.assignedToId = body.assignedToId || null
      if (body.assignedToId) {
        const staff = await prisma.staff.findUnique({
          where: { id: body.assignedToId },
          select: { name: true }
        })
        updateData.assignedTo = staff?.name || null
      } else {
        updateData.assignedTo = null
      }
    }

    // Handle starting task
    if (body.startedAt !== undefined) {
      updateData.startedAt = body.startedAt ? new Date(body.startedAt) : null
      if (body.startedAt && body.status === undefined) {
        updateData.status = 'IN_PROGRESS'
      }
    }

    // Handle progress update
    if (body.completedQuantity !== undefined) {
      updateData.completedQuantity = body.completedQuantity
    }

    // Handle completion
    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null
      if (body.completedAt && body.status === undefined) {
        updateData.status = 'COMPLETED'
      }
    }

    const task = await prisma.stockProductionTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        InventoryItem: {
          select: { id: true, name: true, productType: true }
        },
        AssignedToStaff: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update stock task:', error)
    return NextResponse.json(
      { error: 'Failed to update stock task' },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-tasks/[id] - Delete/cancel a stock task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    // Check if task has produced any lots
    const task = await prisma.stockProductionTask.findUnique({
      where: { id: taskId },
      include: { InventoryLot: { select: { id: true } } }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.InventoryLot.length > 0) {
      // Can't delete, just cancel it
      await prisma.stockProductionTask.update({
        where: { id: taskId },
        data: { status: 'CANCELLED' }
      })
      return NextResponse.json({ success: true, cancelled: true })
    }

    // Delete if no lots produced
    await prisma.stockProductionTask.delete({
      where: { id: taskId }
    })

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    console.error('Failed to delete stock task:', error)
    return NextResponse.json(
      { error: 'Failed to delete stock task' },
      { status: 500 }
    )
  }
}

// POST /api/stock-tasks/[id] - Complete task and add stock to inventory
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { completedQuantity, lotNumber, notes } = body

    // Get task with inventory item
    const task = await prisma.stockProductionTask.findUnique({
      where: { id: taskId },
      include: {
        InventoryItem: {
          select: { id: true, shelfLifeDays: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const quantity = completedQuantity || task.targetQuantity

    // Calculate expiration date
    const producedAt = new Date()
    const expiresAt = task.InventoryItem.shelfLifeDays
      ? new Date(producedAt.getTime() + task.InventoryItem.shelfLifeDays * 24 * 60 * 60 * 1000)
      : null

    // Create lot and update task in transaction
    const [lot, updatedTask] = await prisma.$transaction([
      prisma.inventoryLot.create({
        data: {
          inventoryItemId: task.inventoryItemId,
          quantity,
          originalQty: quantity,
          producedAt,
          expiresAt,
          lotNumber: lotNumber || null,
          notes: notes || null,
          producedByTaskId: taskId
        }
      }),
      prisma.stockProductionTask.update({
        where: { id: taskId },
        data: {
          completedQuantity: quantity,
          completedAt: new Date(),
          status: 'COMPLETED'
        }
      }),
      prisma.inventoryItem.update({
        where: { id: task.inventoryItemId },
        data: { currentStock: { increment: quantity } }
      })
    ])

    return NextResponse.json({
      task: updatedTask,
      lot,
      message: `Added ${quantity} units to inventory`
    })
  } catch (error) {
    console.error('Failed to complete stock task:', error)
    return NextResponse.json(
      { error: 'Failed to complete stock task' },
      { status: 500 }
    )
  }
}
