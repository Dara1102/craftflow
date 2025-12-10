import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/delivery-zones - Get all delivery zones
export async function GET() {
  try {
    const zones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // Convert Decimal to number for client
    const plainZones = zones.map(z => ({
      ...z,
      minDistance: z.minDistance ? Number(z.minDistance) : null,
      maxDistance: z.maxDistance ? Number(z.maxDistance) : null,
      baseFee: Number(z.baseFee),
      perMileFee: z.perMileFee ? Number(z.perMileFee) : null,
    }))

    return NextResponse.json(plainZones)
  } catch (error) {
    console.error('Failed to fetch delivery zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery zones' },
      { status: 500 }
    )
  }
}

// POST /api/delivery-zones - Create a new delivery zone
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, minDistance, maxDistance, baseFee, perMileFee, sortOrder } = body

    if (!name || baseFee === undefined) {
      return NextResponse.json(
        { error: 'Name and base fee are required' },
        { status: 400 }
      )
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        name,
        description: description || null,
        minDistance: minDistance || null,
        maxDistance: maxDistance || null,
        baseFee,
        perMileFee: perMileFee || null,
        sortOrder: sortOrder || 0,
        isActive: true,
      },
    })

    return NextResponse.json({
      ...zone,
      minDistance: zone.minDistance ? Number(zone.minDistance) : null,
      maxDistance: zone.maxDistance ? Number(zone.maxDistance) : null,
      baseFee: Number(zone.baseFee),
      perMileFee: zone.perMileFee ? Number(zone.perMileFee) : null,
    })
  } catch (error) {
    console.error('Failed to create delivery zone:', error)
    return NextResponse.json(
      { error: 'Failed to create delivery zone' },
      { status: 500 }
    )
  }
}
