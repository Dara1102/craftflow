import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const orderIds = searchParams.get('orderIds')

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Filter by date range if provided
    if (startDate && endDate) {
      where.eventDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z') // Include the entire end date
      }
    }

    // Filter by specific order IDs if provided
    if (orderIds) {
      const ids = orderIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      if (ids.length > 0) {
        where.id = { in: ids }
      }
    }

    const orders = await prisma.cakeOrder.findMany({
      where,
      include: {
        Customer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        eventDate: 'asc'
      }
    })

    // Transform to expected format
    const result = orders.map(order => ({
      id: order.id,
      customer: order.Customer,
      customerName: order.customerName,
      eventDate: order.eventDate.toISOString(),
      status: order.status
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
