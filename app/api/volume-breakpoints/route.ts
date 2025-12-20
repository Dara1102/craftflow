import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/volume-breakpoints - List all breakpoints
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const menuItemId = searchParams.get('menuItemId')
  const productTypeId = searchParams.get('productTypeId')

  try {
    const where: Record<string, unknown> = { isActive: true }
    if (menuItemId) where.menuItemId = parseInt(menuItemId)
    if (productTypeId) where.productTypeId = parseInt(productTypeId)

    const breakpoints = await prisma.volumeBreakpoint.findMany({
      where,
      include: {
        MenuItem: { select: { id: true, name: true } },
        ProductType: { select: { id: true, name: true } }
      },
      orderBy: { minQuantity: 'asc' }
    })

    return NextResponse.json(breakpoints)
  } catch (error) {
    console.error('Failed to fetch volume breakpoints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch volume breakpoints' },
      { status: 500 }
    )
  }
}

// POST /api/volume-breakpoints - Create a new breakpoint
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      menuItemId,
      productTypeId,
      minQuantity,
      maxQuantity,
      discountPercent,
      pricePerUnit
    } = body

    if (!minQuantity) {
      return NextResponse.json(
        { error: 'minQuantity is required' },
        { status: 400 }
      )
    }

    if (!menuItemId && !productTypeId) {
      return NextResponse.json(
        { error: 'Either menuItemId or productTypeId is required' },
        { status: 400 }
      )
    }

    const breakpoint = await prisma.volumeBreakpoint.create({
      data: {
        menuItemId: menuItemId || null,
        productTypeId: productTypeId || null,
        minQuantity,
        maxQuantity: maxQuantity || null,
        discountPercent: discountPercent || 0,
        pricePerUnit: pricePerUnit || null,
        isActive: true
      },
      include: {
        MenuItem: { select: { id: true, name: true } },
        ProductType: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(breakpoint, { status: 201 })
  } catch (error) {
    console.error('Failed to create volume breakpoint:', error)
    return NextResponse.json(
      { error: 'Failed to create volume breakpoint' },
      { status: 500 }
    )
  }
}
