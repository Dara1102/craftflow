import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productTypeId = searchParams.get('productTypeId')

    const menuItems = await prisma.menuItem.findMany({
      where: {
        isActive: true,
        ...(productTypeId ? { productTypeId: parseInt(productTypeId) } : {})
      },
      include: {
        ProductType: true,
        Recipe_MenuItem_batterRecipeIdToRecipe: true,
        Recipe_MenuItem_fillingRecipeIdToRecipe: true,
        Recipe_MenuItem_frostingRecipeIdToRecipe: true,
        LaborRole: true,
        Packaging: true
      },
      orderBy: [
        { productTypeId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform to expected format for frontend
    const transformed = menuItems.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ProductType, Recipe_MenuItem_batterRecipeIdToRecipe, Recipe_MenuItem_fillingRecipeIdToRecipe, Recipe_MenuItem_frostingRecipeIdToRecipe, LaborRole, Packaging, ...rest } = item
      return {
        ...rest,
        productType: ProductType,
        batterRecipe: Recipe_MenuItem_batterRecipeIdToRecipe,
        fillingRecipe: Recipe_MenuItem_fillingRecipeIdToRecipe,
        frostingRecipe: Recipe_MenuItem_frostingRecipeIdToRecipe,
        laborRole: LaborRole,
        defaultPackaging: Packaging
      }
    })

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const menuItem = await prisma.menuItem.create({
      data: {
        productTypeId: data.productTypeId,
        name: data.name,
        description: data.description || null,
        batterRecipeId: data.batterRecipeId || null,
        fillingRecipeId: data.fillingRecipeId || null,
        frostingRecipeId: data.frostingRecipeId || null,
        yieldsPerRecipe: data.yieldsPerRecipe || null,
        menuPrice: data.menuPrice,
        laborMinutes: data.laborMinutes || null,
        laborRoleId: data.laborRoleId || null,
        decorationLevel: data.decorationLevel || null,
        defaultPackagingId: data.defaultPackagingId || null,
        isActive: true,
        sortOrder: data.sortOrder || 0,
        imageUrl: data.imageUrl || null
      },
      include: {
        productType: true,
        batterRecipe: true,
        fillingRecipe: true,
        frostingRecipe: true
      }
    })

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    )
  }
}
