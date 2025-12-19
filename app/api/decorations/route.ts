import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const decorations = await prisma.decorationTechnique.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { subcategory: 'asc' },
      { name: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      category: true,
      subcategory: true,
      defaultCostPerUnit: true,
      unit: true,
      baseCakeSize: true,
      imageReference: true
    }
  })

  return NextResponse.json(decorations)
}
