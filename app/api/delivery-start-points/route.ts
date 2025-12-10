import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const startPoints = await prisma.deliveryStartPoint.findMany({
    where: { isActive: true },
    orderBy: [
      { isDefault: 'desc' },
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })

  // Convert Decimal to number for JSON serialization
  const plainStartPoints = startPoints.map(sp => ({
    ...sp,
    latitude: sp.latitude ? Number(sp.latitude) : null,
    longitude: sp.longitude ? Number(sp.longitude) : null,
  }))

  return NextResponse.json(plainStartPoints)
}
