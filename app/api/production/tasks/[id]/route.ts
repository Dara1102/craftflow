import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TaskStatus } from '@prisma/client'

// GET /api/production/tasks/[id] - Get a single task
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
    const task = await prisma.productionTask.findUnique({
      where: { id: taskId },
      include: {
        AssignedToStaff: {
          select: { id: true, name: true }
        },
        CompletedByStaff: {
          select: { id: true, name: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PATCH /api/production/tasks/[id] - Update a task
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
    const {
      taskName,
      scheduledDate,
      scheduledStart,
      scheduledEnd,
      durationMinutes,
      status,
      assignedToId,
      notes,
      // For marking complete
      completedById,
      startedAt,
      completedAt
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (taskName !== undefined) updateData.taskName = taskName
    if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate)
    if (scheduledStart !== undefined) updateData.scheduledStart = scheduledStart ? new Date(scheduledStart) : null
    if (scheduledEnd !== undefined) updateData.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes
    if (status !== undefined) updateData.status = status as TaskStatus
    if (notes !== undefined) updateData.notes = notes

    // Handle assignment
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId || null
      if (assignedToId) {
        const staff = await prisma.staff.findUnique({
          where: { id: assignedToId },
          select: { name: true }
        })
        updateData.assignedTo = staff?.name || null
      } else {
        updateData.assignedTo = null
      }
    }

    // Handle start
    if (startedAt !== undefined) {
      updateData.startedAt = startedAt ? new Date(startedAt) : null
      if (startedAt && status === undefined) {
        updateData.status = 'IN_PROGRESS'
      }
    }

    // Handle completion
    if (completedAt !== undefined) {
      updateData.completedAt = completedAt ? new Date(completedAt) : null
      if (completedAt && status === undefined) {
        updateData.status = 'COMPLETED'
      }
    }
    if (completedById !== undefined) {
      updateData.completedById = completedById || null
      if (completedById) {
        const staff = await prisma.staff.findUnique({
          where: { id: completedById },
          select: { name: true }
        })
        updateData.completedBy = staff?.name || null
      } else {
        updateData.completedBy = null
      }
    }

    const task = await prisma.productionTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        AssignedToStaff: {
          select: { id: true, name: true }
        },
        CompletedByStaff: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE /api/production/tasks/[id] - Delete a task
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
    await prisma.productionTask.delete({
      where: { id: taskId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
