import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export interface TierInfo {
  tierSizeId: number
  name: string
  shape: string
  servings: number
  volumeMl: number | null
  // Dimensions for decoration size scaling
  diameterCm: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  // Assembly labor data (this is tied to tier size)
  assemblyMinutes: number
  assemblyRole: string | null
  assemblyRate: number | null
  assemblyLaborCost: number
}

// GET /api/tier-costs - Get tier size info (without recipe costs - those are calculated per order now)
export async function GET() {
  try {
    const tierSizes = await prisma.tierSize.findMany({
      include: {
        LaborRole: true
      },
      orderBy: {
        diameterCm: 'asc'
      }
    })

    const defaultRate = 21 // Default Baker rate

    const tierInfo: TierInfo[] = tierSizes.map(ts => {
      const assemblyMinutes = ts.assemblyMinutes || 0
      const assemblyRole = ts.LaborRole?.name || null
      const assemblyRate = ts.LaborRole
        ? Number(ts.LaborRole.hourlyRate)
        : null

      const assemblyLaborCost = (assemblyMinutes / 60) * (assemblyRate || defaultRate)

      return {
        tierSizeId: ts.id,
        name: ts.name,
        shape: ts.shape,
        servings: ts.servings,
        volumeMl: ts.volumeMl,
        diameterCm: ts.diameterCm ? Number(ts.diameterCm) : null,
        lengthCm: ts.lengthCm ? Number(ts.lengthCm) : null,
        widthCm: ts.widthCm ? Number(ts.widthCm) : null,
        heightCm: ts.heightCm ? Number(ts.heightCm) : null,
        assemblyMinutes,
        assemblyRole,
        assemblyRate,
        assemblyLaborCost: Math.round(assemblyLaborCost * 100) / 100
      }
    })

    return NextResponse.json(tierInfo)
  } catch (error) {
    console.error('Failed to fetch tier info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tier info' },
      { status: 500 }
    )
  }
}
