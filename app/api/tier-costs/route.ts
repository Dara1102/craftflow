import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

export interface TierCost {
  tierSizeId: number
  name: string
  servings: number
  batterCost: number
  frostingCost: number
  totalIngredientCost: number
}

// GET /api/tier-costs - Get ingredient costs for all tier sizes
export async function GET() {
  try {
    const tierSizes = await prisma.tierSize.findMany({
      include: {
        batterRecipe: {
          include: {
            recipeIngredients: {
              include: {
                ingredient: true
              }
            }
          }
        },
        frostingRecipe: {
          include: {
            recipeIngredients: {
              include: {
                ingredient: true
              }
            }
          }
        }
      },
      orderBy: {
        diameterCm: 'asc'
      }
    })

    const tierCosts: TierCost[] = tierSizes.map(ts => {
      let batterCost = 0
      let frostingCost = 0

      // Calculate batter cost
      if (ts.batterRecipe) {
        for (const ri of ts.batterRecipe.recipeIngredients) {
          const quantity = new Decimal(ri.quantity)
            .mul(new Decimal(ts.batterMultiplier))
            .toNumber()
          const cost = quantity * Number(ri.ingredient.costPerUnit)
          batterCost += cost
        }
      }

      // Calculate frosting cost
      if (ts.frostingRecipe && ts.frostingMultiplier) {
        for (const ri of ts.frostingRecipe.recipeIngredients) {
          const quantity = new Decimal(ri.quantity)
            .mul(new Decimal(ts.frostingMultiplier))
            .toNumber()
          const cost = quantity * Number(ri.ingredient.costPerUnit)
          frostingCost += cost
        }
      }

      return {
        tierSizeId: ts.id,
        name: ts.name,
        servings: ts.servings,
        batterCost: Math.round(batterCost * 100) / 100,
        frostingCost: Math.round(frostingCost * 100) / 100,
        totalIngredientCost: Math.round((batterCost + frostingCost) * 100) / 100
      }
    })

    return NextResponse.json(tierCosts)
  } catch (error) {
    console.error('Failed to fetch tier costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tier costs' },
      { status: 500 }
    )
  }
}
