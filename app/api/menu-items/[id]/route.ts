import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const menuItemId = parseInt(id)

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        productType: true,
        batterRecipe: {
          include: {
            recipeIngredients: {
              include: { ingredient: true }
            }
          }
        },
        fillingRecipe: {
          include: {
            recipeIngredients: {
              include: { ingredient: true }
            }
          }
        },
        frostingRecipe: {
          include: {
            recipeIngredients: {
              include: { ingredient: true }
            }
          }
        },
        laborRole: true,
        defaultPackaging: true
      }
    })

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const menuItemId = parseInt(id)
    const data = await request.json()

    const menuItem = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        ...(data.productTypeId !== undefined && { productTypeId: data.productTypeId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.batterRecipeId !== undefined && { batterRecipeId: data.batterRecipeId }),
        ...(data.fillingRecipeId !== undefined && { fillingRecipeId: data.fillingRecipeId }),
        ...(data.frostingRecipeId !== undefined && { frostingRecipeId: data.frostingRecipeId }),
        ...(data.yieldsPerRecipe !== undefined && { yieldsPerRecipe: data.yieldsPerRecipe }),
        ...(data.menuPrice !== undefined && { menuPrice: data.menuPrice }),
        ...(data.laborMinutes !== undefined && { laborMinutes: data.laborMinutes }),
        ...(data.laborRoleId !== undefined && { laborRoleId: data.laborRoleId }),
        ...(data.decorationLevel !== undefined && { decorationLevel: data.decorationLevel }),
        ...(data.defaultPackagingId !== undefined && { defaultPackagingId: data.defaultPackagingId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl })
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
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const menuItemId = parseInt(id)

    // Soft delete by setting isActive to false
    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}
