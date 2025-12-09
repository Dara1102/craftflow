import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const decorations = await prisma.decorationTechnique.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { subcategory: 'asc' },
      { name: 'asc' }
    ]
  })

  return NextResponse.json(decorations)
}
