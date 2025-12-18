import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/recipes
 * Get all recipes, optionally filtered by type
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'BATTER', 'FILLING', or 'FROSTING'

    const where: any = {}
    if (type) {
      where.type = type
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        laborRole: true,
        recipeIngredients: {
          include: {
            ingredient: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
