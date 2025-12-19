import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateTasksForOrder, saveTasksForOrder, getTasksByDateRange } from '@/lib/production-tasks'

// GET - Get tasks by date range or order IDs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orderIdsParam = searchParams.get('orderIds')

  try {
    let orderIds: number[] | undefined

    if (orderIdsParam) {
      orderIds = orderIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    }

    if (!startDate || !endDate) {
      // If no date range, use 7 days around today
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 3)
      const end = new Date(today)
      end.setDate(end.getDate() + 7)

      const tasks = await getTasksByDateRange(start, end, orderIds)
      return NextResponse.json({ tasks, startDate: start.toISOString(), endDate: end.toISOString() })
    }

    const tasks = await getTasksByDateRange(
      new Date(startDate),
      new Date(endDate + 'T23:59:59'),
      orderIds
    )

    return NextResponse.json({ tasks, startDate, endDate })
  } catch (error) {
    console.error('Failed to get tasks:', error)
    return NextResponse.json(
      { error: 'Failed to get tasks' },
      { status: 500 }
    )
  }
}

// POST - Generate tasks for orders
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderIds } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required' },
        { status: 400 }
      )
    }

    const results: { orderId: number; taskCount: number; error?: string }[] = []

    for (const orderId of orderIds) {
      try {
        const tasks = await generateTasksForOrder(orderId)
        await saveTasksForOrder(orderId, tasks)
        results.push({ orderId, taskCount: tasks.length })
      } catch (err) {
        results.push({
          orderId,
          taskCount: 0,
          error: err instanceof Error ? err.message : 'Failed to generate tasks'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalTasks: results.reduce((sum, r) => sum + r.taskCount, 0)
    })
  } catch (error) {
    console.error('Failed to generate tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tasks for orders
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderIdsParam = searchParams.get('orderIds')

  try {
    if (!orderIdsParam) {
      return NextResponse.json(
        { error: 'orderIds parameter is required' },
        { status: 400 }
      )
    }

    const orderIds = orderIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

    const deleted = await prisma.productionTask.deleteMany({
      where: { orderId: { in: orderIds } }
    })

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count
    })
  } catch (error) {
    console.error('Failed to delete tasks:', error)
    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    )
  }
}
