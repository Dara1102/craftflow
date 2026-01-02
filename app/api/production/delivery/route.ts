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
      return NextResponse.json(
        { error: 'Either orderIds or startDate/endDate is required' },
        { status: 400 }
      )
    }

    if (orderIds.length === 0) {
      return NextResponse.json({
        orderIds: [],
        orderCount: 0,
        generatedAt: new Date().toISOString(),
        deliveriesByDate: [],
        totals: { totalDeliveries: 0, totalPickups: 0 }
      })
    }

    // Fetch orders with delivery info
    const ordersRaw = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        Customer: true,
        DeliveryZone: true,
        CakeTier: {
          include: { TierSize: true }
        },
        OrderItem: {
          include: {
            MenuItem: true,
            ProductType: true
          }
        }
      },
      orderBy: [{ eventDate: 'asc' }]
    })

    // Transform to expected format
    const orders = ordersRaw.map(order => ({
      ...order,
      customer: order.Customer,
      venue: order.DeliveryZone,
      cakeTiers: order.CakeTier.map(tier => ({
        ...tier,
        tierSize: tier.TierSize
      })),
      orderItems: order.OrderItem.map(item => ({
        ...item,
        menuItem: item.MenuItem,
        productType: item.ProductType
      }))
    }))

    // Group by date
    const deliveriesByDate: {
      date: string
      dayName: string
      deliveries: {
        orderId: number
        customerName: string
        customerPhone: string | null
        eventDate: string
        eventTime: string | null
        deliveryMethod: string
        venue: {
          name: string
          address: string | null
        } | null
        customAddress: string | null
        items: string[]
        notes: string | null
      }[]
    }[] = []

    const dateMap = new Map<string, typeof deliveriesByDate[0]>()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    let totalDeliveries = 0
    let totalPickups = 0

    for (const order of orders) {
      const dateKey = order.eventDate.toISOString().split('T')[0]

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dayName: dayNames[order.eventDate.getDay()],
          deliveries: []
        })
      }

      const dateGroup = dateMap.get(dateKey)!

      // Determine delivery method
      const deliveryMethod = order.isDelivery ? 'delivery' : 'pickup'
      if (order.isDelivery) {
        totalDeliveries++
      } else {
        totalPickups++
      }

      // Build items list
      const items: string[] = []

      // Add cake tiers
      if (order.cakeTiers.length > 0) {
        const tierDesc = order.cakeTiers.length === 1
          ? `1-tier cake (${order.cakeTiers[0].tierSize?.name || 'custom'})`
          : `${order.cakeTiers.length}-tier cake`
        items.push(tierDesc)
      }

      // Add order items (cupcakes, etc.)
      for (const item of order.orderItems) {
        const name = item.menuItem?.name || item.productType?.name || 'Item'
        items.push(`${item.quantity}× ${name}`)
      }

      // Determine event time based on delivery/pickup
      const eventTime = order.isDelivery
        ? (order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null)
        : (order.pickupTime ? new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null)

      dateGroup.deliveries.push({
        orderId: order.id,
        customerName: order.customer?.name || 'Unknown Customer',
        customerPhone: order.customer?.phone || null,
        eventDate: order.eventDate.toISOString(),
        eventTime,
        deliveryMethod,
        venue: order.venue ? {
          name: order.venue.name,
          address: order.venue.description || null
        } : null,
        customAddress: order.deliveryAddress || null,
        items,
        notes: order.notes || null
      })
    }

    // Sort deliveries within each date by time
    for (const group of dateMap.values()) {
      group.deliveries.sort((a, b) => {
        if (!a.eventTime && !b.eventTime) return 0
        if (!a.eventTime) return 1
        if (!b.eventTime) return -1
        return a.eventTime.localeCompare(b.eventTime)
      })
    }

    // Convert to sorted array
    const sortedDeliveries = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      orderIds,
      orderCount: orders.length,
      generatedAt: new Date().toISOString(),
      deliveriesByDate: sortedDeliveries,
      totals: { totalDeliveries, totalPickups }
    })
  } catch (error) {
    console.error('Failed to generate delivery report:', error)
    return NextResponse.json(
      { error: 'Failed to generate delivery report' },
      { status: 500 }
    )
  }
}
