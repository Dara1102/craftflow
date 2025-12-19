import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Get signoffs for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const signoffs = await prisma.taskSignoff.findMany({
      where: { taskId: parseInt(id) },
      orderBy: { signedAt: 'asc' }
    })

    return NextResponse.json(signoffs)
  } catch (error) {
    console.error('Failed to get signoffs:', error)
    return NextResponse.json(
      { error: 'Failed to get signoffs' },
      { status: 500 }
    )
  }
}

// POST - Add signoff to task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { signoffType, signedBy, notes } = body

    if (!signoffType || !signedBy) {
      return NextResponse.json(
        { error: 'signoffType and signedBy are required' },
        { status: 400 }
      )
    }

    // Verify task exists
    const task = await prisma.productionTask.findUnique({
      where: { id: parseInt(id) }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Create signoff
    const signoff = await prisma.taskSignoff.create({
      data: {
        taskId: parseInt(id),
        signoffType,
        signedBy,
        notes: notes || null
      }
    })

    // Update task status based on signoff type
    if (signoffType === 'START' && task.status === 'PENDING') {
      await prisma.productionTask.update({
        where: { id: parseInt(id) },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      })
    } else if (signoffType === 'COMPLETE' && task.status !== 'COMPLETED') {
      await prisma.productionTask.update({
        where: { id: parseInt(id) },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: signedBy
        }
      })

      // Unblock dependent tasks
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

    return NextResponse.json(signoff, { status: 201 })
  } catch (error) {
    console.error('Failed to create signoff:', error)
    return NextResponse.json(
      { error: 'Failed to create signoff' },
      { status: 500 }
    )
  }
}
