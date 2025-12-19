import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Flavor abbreviations for compact display
const flavorAbbreviations: Record<string, string> = {
  'vanilla': 'van',
  'chocolate': 'choc',
  'red velvet': 'rv',
  'carrot': 'cc',
  'carrot cake': 'cc',
  'lemon': 'lem',
  'strawberry': 'straw',
  'marble': 'marb',
  'funfetti': 'fun',
  'almond': 'alm',
  'coconut': 'coco',
  'banana': 'ban',
  'pumpkin': 'pump',
  'spice': 'spc',
  'white': 'wht',
  'yellow': 'yel',
  'butter': 'but',
  'pound': 'lb',
}

function abbreviateFlavor(flavor: string): string {
  const lower = flavor.toLowerCase()
  for (const [full, abbrev] of Object.entries(flavorAbbreviations)) {
    if (lower.includes(full)) {
      return abbrev
    }
  }
  // Return first 4 chars if no match
  return flavor.slice(0, 4).toLowerCase()
}

// Get day color for visual grouping
function getDayColor(date: Date): string {
  const day = date.getDay()
  const colors = [
    'bg-red-50',    // Sunday
    'bg-blue-50',   // Monday
    'bg-green-50',  // Tuesday
    'bg-yellow-50', // Wednesday
    'bg-purple-50', // Thursday
    'bg-pink-50',   // Friday
    'bg-orange-50', // Saturday
  ]
  return colors[day]
}

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
        cakesByDate: []
      })
    }

    // Fetch orders with cake tier details
    const ordersRaw = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        Customer: true,
        CakeTier: {
          include: {
            TierSize: true,
            Recipe_CakeTier_batterRecipeIdToRecipe: true,
            Recipe_CakeTier_frostingRecipeIdToRecipe: true,
            Recipe_CakeTier_fillingRecipeIdToRecipe: true
          },
          orderBy: { tierIndex: 'asc' }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    // Transform to expected format
    const orders = ordersRaw.map(order => ({
      ...order,
      customer: order.Customer,
      cakeTiers: order.CakeTier.map(tier => ({
        ...tier,
        tierSize: tier.TierSize,
        batterRecipe: tier.Recipe_CakeTier_batterRecipeIdToRecipe,
        frostingRecipe: tier.Recipe_CakeTier_frostingRecipeIdToRecipe,
        fillingRecipe: tier.Recipe_CakeTier_fillingRecipeIdToRecipe
      }))
    }))

    // Group cakes by event date
    const cakesByDate: {
      date: string
      dayName: string
      dayColor: string
      cakes: {
        orderId: number
        customerName: string
        eventDate: string
        eventTime: string | null
        tierCount: number
        tiers: {
          tierIndex: number
          size: string
          shape: string
          flavor: string
          flavorAbbrev: string
          frosting: string
          filling: string | null
          boardSize: string | null
          drumSize: string | null
          color: string | null
          notes: string | null
        }[]
        cakeStyle: string | null
        cakeTheme: string | null
        servings: number | null
        notes: string | null
      }[]
    }[] = []

    const dateMap = new Map<string, typeof cakesByDate[0]>()

    for (const order of orders) {
      // Skip orders with no cake tiers
      if (order.cakeTiers.length === 0) continue

      const dateKey = order.eventDate.toISOString().split('T')[0]

      if (!dateMap.has(dateKey)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        dateMap.set(dateKey, {
          date: dateKey,
          dayName: dayNames[order.eventDate.getDay()],
          dayColor: getDayColor(order.eventDate),
          cakes: []
        })
      }

      const dateGroup = dateMap.get(dateKey)!

      const tiers = order.cakeTiers.map(tier => ({
        tierIndex: tier.tierIndex,
        size: tier.tierSize?.name || `${tier.tierSize?.diameter}" ${tier.tierSize?.shape}`,
        shape: tier.tierSize?.shape || 'round',
        flavor: tier.batterRecipe?.name || 'Unknown',
        flavorAbbrev: abbreviateFlavor(tier.batterRecipe?.name || 'Unknown'),
        frosting: tier.frostingRecipe?.name || 'Unknown',
        filling: tier.fillingRecipe?.name || null,
        boardSize: tier.tierSize ? `${tier.tierSize.diameter}"` : null,
        drumSize: tier.tierIndex === 0 && tier.tierSize ? `${Number(tier.tierSize.diameter) + 2}"` : null,
        color: tier.color || null,
        notes: tier.notes || null
      }))

      dateGroup.cakes.push({
        orderId: order.id,
        customerName: order.customer?.name || 'Unknown Customer',
        eventDate: order.eventDate.toISOString(),
        eventTime: order.eventTime || null,
        tierCount: order.cakeTiers.length,
        tiers,
        cakeStyle: order.cakeStyle || null,
        cakeTheme: order.cakeTheme || null,
        servings: order.servings || null,
        notes: order.notes || null
      })
    }

    // Convert map to sorted array
    const sortedCakes = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      orderIds,
      orderCount: orders.length,
      generatedAt: new Date().toISOString(),
      cakesByDate: sortedCakes
    })
  } catch (error) {
    console.error('Failed to generate stacking report:', error)
    return NextResponse.json(
      { error: 'Failed to generate stacking report' },
      { status: 500 }
    )
  }
}
