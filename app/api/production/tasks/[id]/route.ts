import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Get single task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const taskRaw = await prisma.productionTask.findUnique({
      where: { id: parseInt(id) },
      include: {
        CakeOrder: {
          include: { Customer: true }
        },
        ProductionTask: true,
        other_ProductionTask: true,
        TaskSignoff: true
      }
    })

    // Transform to expected format
    const task = taskRaw ? {
      ...taskRaw,
      order: taskRaw.CakeOrder ? {
        ...taskRaw.CakeOrder,
        customer: taskRaw.CakeOrder.Customer
      } : null,
      dependsOn: taskRaw.ProductionTask,
      blockedTasks: taskRaw.other_ProductionTask,
      signoffs: taskRaw.TaskSignoff
    } : null

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to get task:', error)
    return NextResponse.json(
      { error: 'Failed to get task' },
      { status: 500 }
    )
  }
}

// PATCH - Update task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { status, assignedTo, notes, scheduledStart, scheduledEnd } = body

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      updateData.status = status

      // Set timestamps based on status
      if (status === 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
        if (body.completedBy) {
          updateData.completedBy = body.completedBy
        }
      }
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (scheduledStart !== undefined) {
      updateData.scheduledStart = scheduledStart ? new Date(scheduledStart) : null
    }

    if (scheduledEnd !== undefined) {
      updateData.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null
    }

    const taskRaw2 = await prisma.productionTask.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        CakeOrder: {
          include: { Customer: true }
        }
      }
    })

    // Transform to expected format
    const task = {
      ...taskRaw2,
      order: taskRaw2.CakeOrder ? {
        ...taskRaw2.CakeOrder,
        customer: taskRaw2.CakeOrder.Customer
      } : null
    }

    // If task is completed, check if any blocked tasks can now start
    if (status === 'COMPLETED') {
      await prisma.productionTask.updateMany({
        where: {
          dependsOnId: parseInt(id),
          status: 'BLOCKED'
        },
        data: {
          status: 'PENDING'
        }
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE - Delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.productionTask.delete({
      where: { id: parseInt(id) }
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
