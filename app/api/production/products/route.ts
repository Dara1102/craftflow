import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orderIdsParam = searchParams.get('orderIds')
  const productType = searchParams.get('productType') // "Cupcakes", "Cookies", etc.

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
        productType: productType || 'All',
        generatedAt: new Date().toISOString(),
        itemsByDate: [],
        totals: { totalQuantity: 0, totalItems: 0 }
      })
    }

    // Build where clause for product type filtering
    const productTypeFilter = productType
      ? { productType: { name: { equals: productType, mode: 'insensitive' as const } } }
      : {}

    // Fetch orders with order items matching the product type
    const orders = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        customer: true,
        orderItems: {
          where: {
            itemType: 'MENU_ITEM',
            ...productTypeFilter
          },
          include: {
            menuItem: {
              include: {
                batterRecipe: true,
                fillingRecipe: true,
                frostingRecipe: true
              }
            },
            productType: true,
            packaging: true
          }
        },
        OrderDecoration: {
          include: {
            DecorationTechnique: true
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    // Filter to only orders that have matching items
    const ordersWithItems = orders.filter(o => o.orderItems.length > 0)

    // Group items by event date
    const itemsByDate: {
      date: string
      dayName: string
      items: {
        orderId: number
        orderItemId: number
        customerName: string
        eventDate: string
        eventTime: string | null
        isDelivery: boolean
        productTypeName: string
        menuItemName: string | null
        quantity: number
        batterRecipe: string | null
        fillingRecipe: string | null
        frostingRecipe: string | null
        packaging: string | null
        packagingQty: number | null
        notes: string | null
        style: string | null
        decorations: string | null
      }[]
    }[] = []

    const dateMap = new Map<string, typeof itemsByDate[0]>()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    let totalQuantity = 0
    let totalItems = 0

    for (const order of ordersWithItems) {
      const dateKey = order.eventDate.toISOString().split('T')[0]

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dayName: dayNames[order.eventDate.getDay()],
          items: []
        })
      }

      const dateGroup = dateMap.get(dateKey)!

      for (const item of order.orderItems) {
        totalQuantity += item.quantity
        totalItems++

        // Get appropriate time based on delivery/pickup
        let eventTime: string | null = null
        if (order.isDelivery && order.deliveryTime) {
          eventTime = new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        } else if (!order.isDelivery && order.pickupTime) {
          eventTime = new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }

        // Get decorations for this order
        const decorationNames = order.OrderDecoration
          .map(d => d.DecorationTechnique?.name)
          .filter((n): n is string => !!n)
        const decorationsStr = decorationNames.length > 0 ? decorationNames.join(', ') : null

        dateGroup.items.push({
          orderId: order.id,
          orderItemId: item.id,
          customerName: order.customer?.name || 'Unknown Customer',
          eventDate: order.eventDate.toISOString(),
          eventTime,
          isDelivery: order.isDelivery,
          productTypeName: item.productType?.name || 'Unknown',
          menuItemName: item.menuItem?.name || item.itemName || null,
          quantity: item.quantity,
          batterRecipe: item.menuItem?.batterRecipe?.name || null,
          fillingRecipe: item.menuItem?.fillingRecipe?.name || null,
          frostingRecipe: item.menuItem?.frostingRecipe?.name || null,
          packaging: item.packaging?.name || null,
          packagingQty: item.packagingQty || null,
          notes: item.notes || null,
          style: order.theme || null,
          decorations: decorationsStr
        })
      }
    }

    // Convert to sorted array
    const sortedItems = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      orderIds,
      orderCount: ordersWithItems.length,
      productType: productType || 'All',
      generatedAt: new Date().toISOString(),
      itemsByDate: sortedItems,
      totals: { totalQuantity, totalItems }
    })
  } catch (error) {
    console.error('Failed to generate product report:', error)
    return NextResponse.json(
      { error: 'Failed to generate product report' },
      { status: 500 }
    )
  }
}
