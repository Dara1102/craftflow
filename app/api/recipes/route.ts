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
    const name = searchParams.get('name') // Exact name match
    const search = searchParams.get('search') // Partial name match

    const where: Record<string, unknown> = {}
    if (type) {
      where.type = type
    }
    if (name) {
      where.name = name
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const recipesRaw = await prisma.recipe.findMany({
      where,
      include: {
        LaborRole: true,
        RecipeIngredient: {
          include: {
            Ingredient: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform to expected format for frontend
    const recipes = recipesRaw.map(recipe => ({
      ...recipe,
      laborRole: recipe.LaborRole,
      recipeIngredients: recipe.RecipeIngredient.map(ri => ({
        ...ri,
        ingredient: ri.Ingredient
      }))
    }))

    // Return in { recipes: [...] } format for consistency
    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

