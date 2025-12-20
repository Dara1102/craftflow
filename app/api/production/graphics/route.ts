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
        orderGraphics: [],
        totals: { totalDecorations: 0, totalToppers: 0 }
      })
    }

    // Fetch orders with decorations and topper info
    const ordersRaw = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        Customer: true,
        OrderDecoration: {
          include: {
            DecorationTechnique: true
          }
        },
        CakeTier: {
          include: {
            TierSize: true
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    // Transform to expected format
    const orders = ordersRaw.map(order => ({
      ...order,
      customer: order.Customer,
      orderDecorations: order.OrderDecoration.map(d => ({
        ...d,
        decorationTechnique: d.DecorationTechnique
      })),
      cakeTiers: order.CakeTier.map(tier => ({
        ...tier,
        tierSize: tier.TierSize
      }))
    }))

    // Process orders to extract graphics work
    const orderGraphics: {
      orderId: number
      customerName: string
      eventDate: string
      eventTime: string | null
      isDelivery: boolean
      decorations: {
        id: number
        techniqueName: string
        category: string | null
        customText: string | null
        quantity: number
        notes: string | null
      }[]
      topper: {
        type: string | null
        text: string | null
        customText: string | null
      } | null
      cakeStyle: string | null
      cakeTheme: string | null
      colors: string[]
      notes: string | null
    }[] = []

    let totalDecorations = 0
    let totalToppers = 0

    for (const order of orders) {
      // Skip orders with no decorations and no topper
      const hasDecorations = order.orderDecorations.length > 0
      const hasTopper = order.topperType && order.topperType !== 'none'

      if (!hasDecorations && !hasTopper) continue

      const decorations = order.orderDecorations.map(d => ({
        id: d.id,
        techniqueName: d.decorationTechnique.name,
        category: d.decorationTechnique.category || null,
        customText: d.customText || null,
        quantity: d.quantity || 1,
        notes: d.notes || null
      }))

      totalDecorations += decorations.length

      let topper = null
      if (hasTopper) {
        totalToppers++
        topper = {
          type: order.topperType,
          text: order.topperText || null,
          customText: order.customTopperText || null
        }
      }

      // Collect colors from tiers
      const colors = order.cakeTiers
        .map(t => t.color)
        .filter((c): c is string => !!c)

      // Get appropriate time based on delivery/pickup
      let eventTime: string | null = null
      if (order.isDelivery && order.deliveryTime) {
        eventTime = new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      } else if (!order.isDelivery && order.pickupTime) {
        eventTime = new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }

      orderGraphics.push({
        orderId: order.id,
        customerName: order.customer?.name || 'Unknown Customer',
        eventDate: order.eventDate.toISOString(),
        eventTime,
        isDelivery: order.isDelivery,
        decorations,
        topper,
        cakeStyle: order.cakeStyle || null,
        cakeTheme: order.cakeTheme || null,
        colors: [...new Set(colors)],
        notes: order.notes || null
      })
    }

    // Sort by event date
    orderGraphics.sort((a, b) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    )

    return NextResponse.json({
      orderIds,
      orderCount: orderGraphics.length,
      generatedAt: new Date().toISOString(),
      orderGraphics,
      totals: { totalDecorations, totalToppers }
    })
  } catch (error) {
    console.error('Failed to generate graphics report:', error)
    return NextResponse.json(
      { error: 'Failed to generate graphics report' },
      { status: 500 }
    )
  }
}
