import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const productTypes = await prisma.productType.findMany({
      where: { isActive: true },
      include: {
        Recipe: true,
        _count: {
          select: { MenuItem: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    // Transform to expected format for frontend
    const transformed = productTypes.map(pt => ({
      ...pt,
      defaultRecipe: pt.Recipe,
      _count: { menuItems: pt._count.MenuItem }
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching product types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const productType = await prisma.productType.create({
      data: {
        name: data.name,
        category: data.category,
        baseUnit: data.baseUnit,
        description: data.description || null,
        defaultRecipeId: data.defaultRecipeId || null,
        isActive: true,
        sortOrder: data.sortOrder || 0
      }
    })

    return NextResponse.json(productType)
  } catch (error) {
    console.error('Error creating product type:', error)
    return NextResponse.json(
      { error: 'Failed to create product type' },
      { status: 500 }
    )
  }
}
