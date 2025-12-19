import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const packaging = await prisma.packaging.findMany({
      where: {
        isActive: true,
        ...(type ? { type: type as any } : {})
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(packaging)
  } catch (error) {
    console.error('Error fetching packaging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const packaging = await prisma.packaging.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description || null,
        capacity: data.capacity || null,
        sizeFit: data.sizeFit || null,
        costPerUnit: data.costPerUnit,
        vendor: data.vendor || null,
        sku: data.sku || null,
        reorderUrl: data.reorderUrl || null,
        isActive: true,
        sortOrder: data.sortOrder || 0
      }
    })

    return NextResponse.json(packaging)
  } catch (error) {
    console.error('Error creating packaging:', error)
    return NextResponse.json(
      { error: 'Failed to create packaging' },
      { status: 500 }
    )
  }
}
