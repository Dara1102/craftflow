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

export interface TopperCostDetail {
  type: string
  text: string | null
  cost: number
}

export interface DeliveryCostDetail {
  zoneName: string
  baseFee: number
  perMileFee: number | null
  estimatedDistance: number | null
  totalFee: number
}

export interface CostingResult {
  totalServings: number
  ingredients: IngredientCostDetail[]
  decorations: DecorationCostDetail[]
  topper: TopperCostDetail | null
  delivery: DeliveryCostDetail | null
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  topperCost: number
  deliveryCost: number
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
      },
      deliveryZone: true
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

  // Calculate topper cost
  let topperCost = 0
  let topper: TopperCostDetail | null = null

  if (order.topperType) {
    // Standard toppers have a base cost, custom toppers use the customTopperFee
    const standardTopperCost = 5 // Base cost for standard toppers like "Happy Birthday", etc.

    if (order.topperType === 'custom' && order.customTopperFee) {
      topperCost = new Decimal(order.customTopperFee).toNumber()
    } else if (order.topperType !== 'none' && order.topperType !== '') {
      topperCost = standardTopperCost
    }

    topper = {
      type: order.topperType,
      text: order.topperText,
      cost: topperCost
    }
  }

  // Calculate delivery cost
  let deliveryCost = 0
  let delivery: DeliveryCostDetail | null = null

  if (order.isDelivery && order.deliveryZone) {
    const zone = order.deliveryZone
    const baseFee = new Decimal(zone.baseFee).toNumber()
    const perMileFee = zone.perMileFee ? new Decimal(zone.perMileFee).toNumber() : null
    const distance = order.deliveryDistance ? new Decimal(order.deliveryDistance).toNumber() : null

    // Calculate delivery cost: base fee + (per mile fee * distance)
    deliveryCost = baseFee
    if (perMileFee && distance) {
      deliveryCost += perMileFee * distance
    }

    delivery = {
      zoneName: zone.name,
      baseFee: baseFee,
      perMileFee: perMileFee,
      estimatedDistance: distance,
      totalFee: deliveryCost
    }
  }

  // Calculate base labor cost (from estimated hours, minus decoration labor)
  const totalEstimatedHours = new Decimal(order.estimatedHours).toNumber()
  const decorationLaborHours = decorationLaborMinutes / 60
  const baseLaborHours = Math.max(0, totalEstimatedHours - decorationLaborHours)
  const baseLaborCost = baseLaborHours * laborRatePerHour

  // Total labor = base + decoration
  const totalLaborCost = baseLaborCost + decorationLaborCost

  // Calculate totals (delivery cost is NOT marked up - it's a pass-through cost)
  const totalCostBeforeDelivery = ingredientCost + decorationMaterialCost + topperCost + totalLaborCost
  const suggestedPriceBeforeDelivery = totalCostBeforeDelivery * (1 + markupPercent)
  const totalCost = totalCostBeforeDelivery + deliveryCost
  const suggestedPrice = suggestedPriceBeforeDelivery + deliveryCost
  const costPerServing = totalServings > 0 ? totalCost / totalServings : 0
  const suggestedPricePerServing = totalServings > 0 ? suggestedPrice / totalServings : 0

  return {
    totalServings,
    ingredients,
    decorations,
    topper,
    delivery,
    ingredientCost: Math.round(ingredientCost * 100) / 100,
    decorationMaterialCost: Math.round(decorationMaterialCost * 100) / 100,
    decorationLaborCost: Math.round(decorationLaborCost * 100) / 100,
    topperCost: Math.round(topperCost * 100) / 100,
    deliveryCost: Math.round(deliveryCost * 100) / 100,
    baseLaborCost: Math.round(baseLaborCost * 100) / 100,
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    markupPercent,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    costPerServing: Math.round(costPerServing * 100) / 100,
    suggestedPricePerServing: Math.round(suggestedPricePerServing * 100) / 100,
  }
}
