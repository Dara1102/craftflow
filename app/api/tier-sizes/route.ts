import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const tierSizes = await prisma.tierSize.findMany({
    orderBy: {
      diameterCm: 'asc'
    }
  })

  // Convert Decimal to number for JSON serialization
  const plainTierSizes = tierSizes.map(ts => ({
    id: ts.id,
    name: ts.name,
    shape: ts.shape,
    diameterCm: Number(ts.diameterCm),
    lengthCm: ts.lengthCm ? Number(ts.lengthCm) : null,
    widthCm: ts.widthCm ? Number(ts.widthCm) : null,
    heightCm: Number(ts.heightCm),
    volumeMl: ts.volumeMl,
    servings: ts.servings,
    assemblyMinutes: ts.assemblyMinutes,
    assemblyRoleId: ts.assemblyRoleId,
  }))

  return NextResponse.json(plainTierSizes)
}
