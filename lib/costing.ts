import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'

export interface IngredientCostDetail {
  ingredientId: number
  name: string
  quantity: number
  unit: string
  cost: number
}

export interface DecorationCostDetail {
  techniqueId: number
  sku: string
  name: string
  category: string
  quantity: number
  unit: string
  materialCost: number
  laborMinutes: number
  laborCost: number
  totalCost: number
}

export interface CostingResult {
  totalServings: number
  ingredients: IngredientCostDetail[]
  decorations: DecorationCostDetail[]
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  baseLaborCost: number
  totalLaborCost: number
  totalCost: number
  markupPercent: number
  suggestedPrice: number
  costPerServing: number
  suggestedPricePerServing: number
}

export async function calculateOrderCosting(orderId: number): Promise<CostingResult> {
  // Get order with all related data
  const order = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      cakeTiers: {
        include: {
          tierSize: {
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
            }
          }
        }
      },
      orderDecorations: {
        include: {
          decorationTechnique: true
        }
      }
    }
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  // Get settings
  const laborRateSetting = await prisma.setting.findUnique({
    where: { key: 'LaborRatePerHour' }
  })
  const markupSetting = await prisma.setting.findUnique({
    where: { key: 'MarkupPercent' }
  })

  const laborRatePerHour = laborRateSetting ? parseFloat(laborRateSetting.value) : 20
  const markupPercent = markupSetting ? parseFloat(markupSetting.value) : 0.7

  // Calculate total servings
  const totalServings = order.cakeTiers.reduce((sum, tier) => sum + tier.tierSize.servings, 0)
  const tierCount = order.cakeTiers.length

  // Aggregate ingredients
  const ingredientMap = new Map<number, {
    ingredient: any,
    totalQuantity: number
  }>()

  for (const tier of order.cakeTiers) {
    const { tierSize } = tier

    // Process batter recipe
    if (tierSize.batterRecipe) {
      for (const ri of tierSize.batterRecipe.recipeIngredients) {
        const quantity = new Decimal(ri.quantity)
          .mul(new Decimal(tierSize.batterMultiplier))
          .toNumber()

        const existing = ingredientMap.get(ri.ingredientId)
        if (existing) {
          existing.totalQuantity += quantity
        } else {
          ingredientMap.set(ri.ingredientId, {
            ingredient: ri.ingredient,
            totalQuantity: quantity
          })
        }
      }
    }

    // Process frosting recipe
    if (tierSize.frostingRecipe && tierSize.frostingMultiplier) {
      for (const ri of tierSize.frostingRecipe.recipeIngredients) {
        const quantity = new Decimal(ri.quantity)
          .mul(new Decimal(tierSize.frostingMultiplier))
          .toNumber()

        const existing = ingredientMap.get(ri.ingredientId)
        if (existing) {
          existing.totalQuantity += quantity
        } else {
          ingredientMap.set(ri.ingredientId, {
            ingredient: ri.ingredient,
            totalQuantity: quantity
          })
        }
      }
    }
  }

  // Calculate ingredient costs
  const ingredients: IngredientCostDetail[] = []
  let ingredientCost = 0

  for (const [id, data] of ingredientMap) {
    const cost = new Decimal(data.totalQuantity)
      .mul(new Decimal(data.ingredient.costPerUnit))
      .toNumber()

    ingredients.push({
      ingredientId: id,
      name: data.ingredient.name,
      quantity: Math.round(data.totalQuantity * 100) / 100,
      unit: data.ingredient.unit,
      cost: Math.round(cost * 100) / 100
    })

    ingredientCost += cost
  }

  // Calculate decoration costs from order decorations
  const decorations: DecorationCostDetail[] = []
  let decorationMaterialCost = 0
  let decorationLaborMinutes = 0

  for (const orderDec of order.orderDecorations) {
    const technique = orderDec.decorationTechnique

    // Determine quantity multiplier based on unit type
    let quantityMultiplier = orderDec.quantity
    if (technique.unit === 'TIER') {
      quantityMultiplier = orderDec.quantity * tierCount
    }
    // CAKE and SET units use the base quantity

    const materialCost = new Decimal(technique.defaultCostPerUnit)
      .mul(quantityMultiplier)
      .toNumber()

    const laborMins = technique.laborMinutes * quantityMultiplier
    const laborCost = (laborMins / 60) * laborRatePerHour

    decorations.push({
      techniqueId: technique.id,
      sku: technique.sku,
      name: technique.name,
      category: technique.category,
      quantity: quantityMultiplier,
      unit: technique.unit.toLowerCase(),
      materialCost: Math.round(materialCost * 100) / 100,
      laborMinutes: laborMins,
      laborCost: Math.round(laborCost * 100) / 100,
      totalCost: Math.round((materialCost + laborCost) * 100) / 100
    })

    decorationMaterialCost += materialCost
    decorationLaborMinutes += laborMins
  }

  // Calculate decoration labor cost
  const decorationLaborCost = (decorationLaborMinutes / 60) * laborRatePerHour

  // Calculate base labor cost (from estimated hours, minus decoration labor)
  const totalEstimatedHours = new Decimal(order.estimatedHours).toNumber()
  const decorationLaborHours = decorationLaborMinutes / 60
  const baseLaborHours = Math.max(0, totalEstimatedHours - decorationLaborHours)
  const baseLaborCost = baseLaborHours * laborRatePerHour

  // Total labor = base + decoration
  const totalLaborCost = baseLaborCost + decorationLaborCost

  // Calculate totals
  const totalCost = ingredientCost + decorationMaterialCost + totalLaborCost
  const suggestedPrice = totalCost * (1 + markupPercent)
  const costPerServing = totalServings > 0 ? totalCost / totalServings : 0
  const suggestedPricePerServing = totalServings > 0 ? suggestedPrice / totalServings : 0

  return {
    totalServings,
    ingredients,
    decorations,
    ingredientCost: Math.round(ingredientCost * 100) / 100,
    decorationMaterialCost: Math.round(decorationMaterialCost * 100) / 100,
    decorationLaborCost: Math.round(decorationLaborCost * 100) / 100,
    baseLaborCost: Math.round(baseLaborCost * 100) / 100,
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    markupPercent,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    costPerServing: Math.round(costPerServing * 100) / 100,
    suggestedPricePerServing: Math.round(suggestedPricePerServing * 100) / 100,
  }
}
