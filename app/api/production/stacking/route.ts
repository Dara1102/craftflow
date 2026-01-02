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
        cakesByDate: [],
        cakeboardTypes: []
      })
    }

    // Fetch orders with cake tier details and prep signoff status
    const ordersRaw = await prisma.cakeOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        Customer: true,
        CakeTier: {
          include: {
            TierSize: true,
            Recipe_CakeTier_batterRecipeIdToRecipe: true,
            Recipe_CakeTier_frostingRecipeIdToRecipe: true,
            Recipe_CakeTier_fillingRecipeIdToRecipe: true,
            CakeboardType: true
          },
          orderBy: { tierIndex: 'asc' }
        },
        ProductionPrepSignoff: {
          include: {
            SignedBy: {
              select: { id: true, name: true }
            }
          }
        },
        OrderAssignment: {
          include: {
            Staff: {
              select: { id: true, name: true }
            }
          }
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
        fillingRecipe: tier.Recipe_CakeTier_fillingRecipeIdToRecipe,
        cakeboardType: tier.CakeboardType
      })),
      prepSignoff: order.ProductionPrepSignoff ? {
        status: order.ProductionPrepSignoff.status,
        signedAt: order.ProductionPrepSignoff.signedAt,
        signedByName: order.ProductionPrepSignoff.SignedBy?.name || null,
        lockedAt: order.ProductionPrepSignoff.lockedAt
      } : null,
      assignment: order.OrderAssignment ? {
        staffId: order.OrderAssignment.Staff.id,
        staffName: order.OrderAssignment.Staff.name,
        assignedAt: order.OrderAssignment.assignedAt
      } : null
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
        isDelivery: boolean
        tierCount: number
        tiers: {
          tierId: number
          tierIndex: number
          size: string
          shape: string
          flavor: string
          flavorAbbrev: string
          frosting: string
          filling: string | null
          boardSize: string | null
          drumSize: string | null
          notes: string | null
          // Cakeboard fields
          cakeboardTypeId: number | null
          cakeboardTypeName: string | null
          cakeboardShape: string | null
          cakeboardSizeInches: number | null
          cakeboardNotes: string | null
        }[]
        cakeStyle: string | null
        cakeColors: string | null
        servings: number | null
        notes: string | null
        prepSignoff: {
          status: string
          signedAt: Date | null
          signedByName: string | null
          lockedAt: Date | null
        } | null
        assignment: {
          staffId: number
          staffName: string
          assignedAt: Date
        } | null
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

      const tiers = order.cakeTiers.map((tier, idx) => {
        // Get diameter in inches (convert from cm)
        const diameterCm = tier.tierSize?.diameterCm ? Number(tier.tierSize.diameterCm) : null
        const diameterInches = diameterCm ? Math.round(diameterCm / 2.54) : null

        // Default cakeboard size: same as tier for boards, +2" for bottom tier drum
        const isBottomTier = idx === order.cakeTiers.length - 1
        const defaultBoardSize = diameterInches
        const defaultDrumSize = isBottomTier && diameterInches ? diameterInches + 2 : null

        return {
          tierId: tier.id,
          tierIndex: tier.tierIndex,
          size: tier.tierSize?.name || 'Unknown',
          shape: tier.tierSize?.shape || 'round',
          // Use tier's flavor field first, fallback to batter recipe name
          flavor: tier.flavor || tier.batterRecipe?.name || 'Unknown',
          flavorAbbrev: abbreviateFlavor(tier.flavor || tier.batterRecipe?.name || 'Unknown'),
          // Use tier's finishType first, fallback to frosting recipe name
          frosting: tier.finishType || tier.frostingRecipe?.name || 'Unknown',
          // Use tier's filling field first, fallback to filling recipe name
          filling: tier.filling || tier.fillingRecipe?.name || null,
          // Board is same size as tier (for display reference)
          boardSize: defaultBoardSize ? `${defaultBoardSize}"` : null,
          // Drum is typically 2" larger than bottom tier only (for display reference)
          drumSize: defaultDrumSize ? `${defaultDrumSize}"` : null,
          notes: null,
          // Cakeboard fields (editable by BOH)
          cakeboardTypeId: tier.cakeboardTypeId || null,
          cakeboardTypeName: tier.cakeboardType?.name || null,
          cakeboardShape: tier.cakeboardShape || tier.tierSize?.shape || 'round',
          cakeboardSizeInches: tier.cakeboardSizeInches || (isBottomTier ? defaultDrumSize : defaultBoardSize),
          cakeboardNotes: tier.cakeboardNotes || null
        }
      })

      dateGroup.cakes.push({
        orderId: order.id,
        customerName: order.customer?.name || order.customerName || 'Unknown Customer',
        eventDate: order.eventDate.toISOString(),
        eventTime: order.isDelivery
          ? (order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null)
          : (order.pickupTime ? new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null),
        isDelivery: order.isDelivery,
        tierCount: order.cakeTiers.length,
        tiers,
        // Use order's colors and theme for style display
        cakeStyle: order.theme || null,
        cakeColors: order.colors || null,
        servings: order.servingsTarget || order.desiredServings || null,
        notes: order.notes || null,
        prepSignoff: order.prepSignoff,
        assignment: order.assignment
      })
    }

    // Convert map to sorted array
    const sortedCakes = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Fetch cakeboard types for inline editing
    const cakeboardTypes = await prisma.cakeboardType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        availableShapes: true,
        availableSizes: true
      }
    })

    return NextResponse.json({
      orderIds,
      orderCount: orders.length,
      generatedAt: new Date().toISOString(),
      cakesByDate: sortedCakes,
      cakeboardTypes
    })
  } catch (error) {
    console.error('Failed to generate stacking report:', error)
    return NextResponse.json(
      { error: 'Failed to generate stacking report' },
      { status: 500 }
    )
  }
}
