import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateShoppingList } from '@/lib/shopping-list'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orderIdsParam = searchParams.get('orderIds')

  try {
    let orderIds: number[] = []

    if (orderIdsParam) {
      // Manual order selection
      orderIds = orderIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    } else if (startDate && endDate) {
      // Date range selection
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
        vendorGroups: [],
        grandTotal: 0,
        unlinkedIngredients: []
      })
    }

    const shoppingList = await generateShoppingList(orderIds)
    return NextResponse.json(shoppingList)
  } catch (error) {
    console.error('Failed to generate shopping list:', error)
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    )
  }
}
