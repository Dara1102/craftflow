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
  laborRole: string
  laborRate: number
  laborCost: number
  totalCost: number
}

export interface LaborBreakdown {
  role: string
  hours: number
  rate: number
  cost: number
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

export interface DiscountDetail {
  type: 'PERCENT' | 'FIXED'
  value: number
  reason: string | null
  amount: number
}

export interface CostingResult {
  totalServings: number
  ingredients: IngredientCostDetail[]
  decorations: DecorationCostDetail[]
  topper: TopperCostDetail | null
  delivery: DeliveryCostDetail | null
  discount: DiscountDetail | null
  laborBreakdown: LaborBreakdown[]
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
  discountAmount: number
  finalPrice: number
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
          decorationTechnique: {
            include: {
              laborRole: true
            }
          }
        }
      },
      deliveryZone: true
    }
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  // Get settings
  const markupSetting = await prisma.setting.findUnique({
    where: { key: 'MarkupPercent' }
  })
  const markupPercent = markupSetting ? parseFloat(markupSetting.value) : 0.7

  // Get labor roles for rate lookups
  const laborRoles = await prisma.laborRole.findMany({
    where: { isActive: true }
  })
  const laborRoleMap = new Map(laborRoles.map(r => [r.id, r]))

  // Get default rates by role name (fallbacks)
  const decoratorRole = laborRoles.find(r => r.name === 'Decorator')
  const bakerRole = laborRoles.find(r => r.name === 'Baker')
  const assistantRole = laborRoles.find(r => r.name === 'Bakery Assistant')

  const decoratorRate = decoratorRole ? new Decimal(decoratorRole.hourlyRate).toNumber() : 30
  const bakerRate = bakerRole ? new Decimal(bakerRole.hourlyRate).toNumber() : 21
  const assistantRate = assistantRole ? new Decimal(assistantRole.hourlyRate).toNumber() : 18

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
  let decorationLaborCost = 0

  // Track labor minutes by role for breakdown
  const laborMinutesByRole = new Map<string, { minutes: number; rate: number }>()

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

    // Get the labor rate for this technique's role
    let laborRole = 'Decorator' // Default to decorator for decorations
    let laborRate = decoratorRate
    if (technique.laborRole) {
      laborRole = technique.laborRole.name
      laborRate = new Decimal(technique.laborRole.hourlyRate).toNumber()
    }

    const laborCost = (laborMins / 60) * laborRate

    // Track for breakdown
    const existing = laborMinutesByRole.get(laborRole)
    if (existing) {
      existing.minutes += laborMins
    } else {
      laborMinutesByRole.set(laborRole, { minutes: laborMins, rate: laborRate })
    }

    decorations.push({
      techniqueId: technique.id,
      sku: technique.sku,
      name: technique.name,
      category: technique.category,
      quantity: quantityMultiplier,
      unit: technique.unit.toLowerCase(),
      materialCost: Math.round(materialCost * 100) / 100,
      laborMinutes: laborMins,
      laborRole,
      laborRate,
      laborCost: Math.round(laborCost * 100) / 100,
      totalCost: Math.round((materialCost + laborCost) * 100) / 100
    })

    decorationMaterialCost += materialCost
    decorationLaborCost += laborCost
  }

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

  // Calculate base labor cost using role-specific rates
  // If bakerHours/assistantHours are set, use those; otherwise fall back to estimatedHours at baker rate
  const bakerHours = order.bakerHours ? new Decimal(order.bakerHours).toNumber() : 0
  const assistantHours = order.assistantHours ? new Decimal(order.assistantHours).toNumber() : 0

  let baseLaborCost = 0

  if (bakerHours > 0 || assistantHours > 0) {
    // Use the new role-specific hours
    baseLaborCost = (bakerHours * bakerRate) + (assistantHours * assistantRate)

    // Add to labor breakdown
    if (bakerHours > 0) {
      const existing = laborMinutesByRole.get('Baker')
      if (existing) {
        existing.minutes += bakerHours * 60
      } else {
        laborMinutesByRole.set('Baker', { minutes: bakerHours * 60, rate: bakerRate })
      }
    }
    if (assistantHours > 0) {
      const existing = laborMinutesByRole.get('Bakery Assistant')
      if (existing) {
        existing.minutes += assistantHours * 60
      } else {
        laborMinutesByRole.set('Bakery Assistant', { minutes: assistantHours * 60, rate: assistantRate })
      }
    }
  } else {
    // Fall back to legacy estimatedHours at baker rate
    const totalEstimatedHours = new Decimal(order.estimatedHours).toNumber()
    // Subtract decoration labor hours from total to get base hours
    const decorationLaborHours = decorationLaborCost / decoratorRate // Approximate
    const baseLaborHours = Math.max(0, totalEstimatedHours - decorationLaborHours)
    baseLaborCost = baseLaborHours * bakerRate

    if (baseLaborHours > 0) {
      const existing = laborMinutesByRole.get('Baker')
      if (existing) {
        existing.minutes += baseLaborHours * 60
      } else {
        laborMinutesByRole.set('Baker', { minutes: baseLaborHours * 60, rate: bakerRate })
      }
    }
  }

  // Total labor = base + decoration
  const totalLaborCost = baseLaborCost + decorationLaborCost

  // Build labor breakdown array
  const laborBreakdown: LaborBreakdown[] = []
  for (const [role, data] of laborMinutesByRole) {
    const hours = data.minutes / 60
    laborBreakdown.push({
      role,
      hours: Math.round(hours * 100) / 100,
      rate: data.rate,
      cost: Math.round(hours * data.rate * 100) / 100
    })
  }
  // Sort by cost descending
  laborBreakdown.sort((a, b) => b.cost - a.cost)

  // Calculate totals (delivery cost is NOT marked up - it's a pass-through cost)
  const totalCostBeforeDelivery = ingredientCost + decorationMaterialCost + topperCost + totalLaborCost
  const suggestedPriceBeforeDelivery = totalCostBeforeDelivery * (1 + markupPercent)
  const totalCost = totalCostBeforeDelivery + deliveryCost
  const suggestedPrice = suggestedPriceBeforeDelivery

  // Calculate discount
  let discountAmount = 0
  let discount: DiscountDetail | null = null

  if (order.discountType && order.discountValue) {
    const discountVal = new Decimal(order.discountValue).toNumber()
    if (order.discountType === 'PERCENT') {
      discountAmount = suggestedPrice * (discountVal / 100)
    } else {
      discountAmount = discountVal
    }

    discount = {
      type: order.discountType,
      value: discountVal,
      reason: order.discountReason,
      amount: Math.round(discountAmount * 100) / 100
    }
  }

  // Final price = suggested price - discount + delivery (delivery not discounted)
  const finalPrice = suggestedPrice - discountAmount + deliveryCost

  const costPerServing = totalServings > 0 ? totalCost / totalServings : 0
  const finalPricePerServing = totalServings > 0 ? finalPrice / totalServings : 0

  return {
    totalServings,
    ingredients,
    decorations,
    topper,
    delivery,
    discount,
    laborBreakdown,
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
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    costPerServing: Math.round(costPerServing * 100) / 100,
    suggestedPricePerServing: Math.round(finalPricePerServing * 100) / 100,
  }
}
