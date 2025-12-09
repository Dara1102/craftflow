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
    heightCm: Number(ts.heightCm),
    servings: ts.servings,
    batterRecipeId: ts.batterRecipeId,
    batterMultiplier: Number(ts.batterMultiplier),
    frostingRecipeId: ts.frostingRecipeId,
    frostingMultiplier: ts.frostingMultiplier ? Number(ts.frostingMultiplier) : null,
  }))

  return NextResponse.json(plainTierSizes)
}