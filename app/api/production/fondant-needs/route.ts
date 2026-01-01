import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseTierSize,
  calculateTierSurfaceArea,
} from '@/lib/production-settings'

// Estimate fondant weight needed (rough: 1 oz per 10 sq inches)
function estimateFondantOunces(surfaceAreaSqIn: number): number {
  return Math.round(surfaceAreaSqIn / 10 * 10) / 10 // oz, rounded to 1 decimal
}

interface FondantTier {
  orderId: number
  customerName: string
  tierIndex: number
  tierSize: string
  diameterInches: number
  surfaceAreaSqIn: number
  fondantOunces: number
  finishType: string
  dueDate: string
  isDelivery: boolean
}

interface FondantSummary {
  finishType: string
  totalTiers: number
  totalSurfaceArea: number
  totalFondantOunces: number
  tiers: FondantTier[]
}

// GET /api/production/fondant-needs - Get fondant requirements for upcoming orders
export async function GET() {
  try {
    // Get all confirmed/in-progress orders with fondant finishes
    const orders = await prisma.cakeOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        Customer: { select: { name: true } },
        CakeTier: {
          include: {
            TierSize: true,
          },
          orderBy: { tierIndex: 'asc' }
        },
      },
      orderBy: { eventDate: 'asc' }
    })

    // Group fondant needs by finish type (which includes color info)
    const fondantByType: Record<string, FondantSummary> = {}

    for (const order of orders) {
      const customerName = order.Customer?.name || order.customerName || 'Unknown'

      for (const tier of order.CakeTier) {
        const finishType = tier.finishType || ''

        // Only include fondant finishes
        if (!finishType.toLowerCase().includes('fondant')) continue

        // Get size info
        const tierSize = tier.TierSize
        const sizeName = tierSize?.name || 'Unknown'

        // Parse tier size using centralized function
        const { diameterInches, shape } = parseTierSize(sizeName)

        // For fondant, only external surface area matters (no internal filling layers)
        const { totalArea: surfaceAreaSqIn } = calculateTierSurfaceArea(diameterInches, 4, shape)
        const fondantOunces = estimateFondantOunces(surfaceAreaSqIn)

        const tierDetail: FondantTier = {
          orderId: order.id,
          customerName,
          tierIndex: tier.tierIndex,
          tierSize: sizeName,
          diameterInches,
          surfaceAreaSqIn,
          fondantOunces,
          finishType,
          dueDate: order.eventDate.toISOString(),
          isDelivery: order.isDelivery
        }

        if (!fondantByType[finishType]) {
          fondantByType[finishType] = {
            finishType,
            totalTiers: 0,
            totalSurfaceArea: 0,
            totalFondantOunces: 0,
            tiers: []
          }
        }

        fondantByType[finishType].tiers.push(tierDetail)
        fondantByType[finishType].totalTiers++
        fondantByType[finishType].totalSurfaceArea += surfaceAreaSqIn
        fondantByType[finishType].totalFondantOunces += fondantOunces
      }
    }

    // Convert to array and sort by total needed
    const fondantNeeds = Object.values(fondantByType).sort(
      (a, b) => b.totalFondantOunces - a.totalFondantOunces
    )

    // Calculate grand totals
    const grandTotal = {
      totalTiers: fondantNeeds.reduce((s, f) => s + f.totalTiers, 0),
      totalSurfaceArea: fondantNeeds.reduce((s, f) => s + f.totalSurfaceArea, 0),
      totalFondantOunces: fondantNeeds.reduce((s, f) => s + f.totalFondantOunces, 0),
      totalPounds: Math.round(fondantNeeds.reduce((s, f) => s + f.totalFondantOunces, 0) / 16 * 10) / 10
    }

    return NextResponse.json({
      fondantNeeds,
      grandTotal,
      message: `${fondantNeeds.length} fondant type(s) needed for ${grandTotal.totalTiers} tier(s)`
    })
  } catch (error) {
    console.error('Failed to fetch fondant needs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fondant needs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
