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

export interface RecipeMatch {
  recipe: {
    id: number
    name: string
    type: string
    yieldVolumeMl: number | null
    laborMinutes: number | null
    laborRole: { name: string; hourlyRate: Decimal } | null
    recipeIngredients: {
      ingredientId: number
      quantity: Decimal
      ingredient: { id: number; name: string; unit: string; costPerUnit: Decimal }
    }[]
  }
  multiplier: number
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
  // Debug info for recipe matching
  recipeMatches?: {
    tierId: number
    tierName: string
    tierVolumeMl: number | null
    batter: RecipeMatch | null
    filling: RecipeMatch | null
    frosting: RecipeMatch | null
  }[]
}

/**
 * Find the best matching recipe based on flavor/filling name and type
 * Falls back to first recipe of that type if no name match
 */
async function findMatchingRecipe(
  flavorName: string | null,
  recipeType: 'BATTER' | 'FILLING' | 'FROSTING',
  allRecipes: {
    id: number
    name: string
    type: string
    yieldVolumeMl: number | null
    laborMinutes: number | null
    laborRole: { name: string; hourlyRate: Decimal } | null
    recipeIngredients: {
      ingredientId: number
      quantity: Decimal
      ingredient: { id: number; name: string; unit: string; costPerUnit: Decimal }
    }[]
  }[]
): Promise<typeof allRecipes[0] | null> {
  const recipesOfType = allRecipes.filter(r => r.type === recipeType)

  if (recipesOfType.length === 0) return null

  if (flavorName) {
    const lowerFlavor = flavorName.toLowerCase()

    // Try exact match first
    const exactMatch = recipesOfType.find(r =>
      r.name.toLowerCase().includes(lowerFlavor) ||
      lowerFlavor.includes(r.name.toLowerCase().replace(' batter', '').replace(' filling', '').replace(' frosting', '').replace(' buttercream', ''))
    )
    if (exactMatch) return exactMatch

    // Try partial match (e.g., "Chocolate" matches "Chocolate Sponge Batter")
    const partialMatch = recipesOfType.find(r => {
      const recipeFlavor = r.name.toLowerCase().split(' ')[0] // First word
      return lowerFlavor.includes(recipeFlavor) || recipeFlavor.includes(lowerFlavor.split(' ')[0])
    })
    if (partialMatch) return partialMatch
  }

  // Fall back to first recipe of this type
  return recipesOfType[0]
}

/**
 * Calculate the multiplier needed to scale a recipe for a given tier size
 * Uses volume-based calculation when both volumes are available
 * Falls back to servings-based calculation otherwise
 */
function calculateMultiplier(
  recipeYieldVolumeMl: number | null,
  tierVolumeMl: number | null,
  recipeType: 'BATTER' | 'FILLING' | 'FROSTING'
): number {
  // For batter: we need the full tier volume
  // For frosting: we need ~36% of tier volume (surface coverage)
  // For filling: we need ~12% of tier volume (thin layer between layers)

  const volumeFactors: Record<string, number> = {
    'BATTER': 1.0,      // Full volume
    'FROSTING': 0.36,   // Surface coverage
    'FILLING': 0.12,    // Thin layer
  }

  const factor = volumeFactors[recipeType] || 1.0

  if (recipeYieldVolumeMl && tierVolumeMl) {
    const neededVolume = tierVolumeMl * factor
    const multiplier = neededVolume / recipeYieldVolumeMl
    return Math.round(multiplier * 100) / 100 // Round to 2 decimal places
  }

  // Fallback: use a default multiplier of 1.0
  // This happens when volume data is missing
  return 1.0
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
              assemblyRole: true
            }
          },
          // Include explicitly set recipes (if any)
          batterRecipe: {
            include: {
              recipeIngredients: {
                include: {
                  ingredient: true
                }
              },
              laborRole: true
            }
          },
          fillingRecipe: {
            include: {
              recipeIngredients: {
                include: {
                  ingredient: true
                }
              },
              laborRole: true
            }
          },
          frostingRecipe: {
            include: {
              recipeIngredients: {
                include: {
                  ingredient: true
                }
              },
              laborRole: true
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

  // Get all recipes for auto-matching when explicit recipe not set
  const allRecipes = await prisma.recipe.findMany({
    include: {
      recipeIngredients: {
        include: {
          ingredient: true
        }
      },
      laborRole: true
    }
  })

  // Get settings
  const markupSetting = await prisma.setting.findUnique({
    where: { key: 'MarkupPercent' }
  })
  const markupPercent = markupSetting ? parseFloat(markupSetting.value) : 0.7

  // Get labor roles for rate lookups
  const laborRoles = await prisma.laborRole.findMany({
    where: { isActive: true }
  })

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
    ingredient: { id: number; name: string; unit: string; costPerUnit: Decimal },
    totalQuantity: number
  }>()

  // Track labor minutes by role for breakdown
  const laborMinutesByRole = new Map<string, { minutes: number; rate: number }>()

  // Calculate recipe labor and assembly labor
  let recipeLaborCost = 0
  let assemblyLaborCost = 0

  // Debug: track recipe matches
  const recipeMatches: CostingResult['recipeMatches'] = []

  for (const tier of order.cakeTiers) {
    const { tierSize } = tier
    const tierVolume = tierSize.volumeMl

    // Resolve batter recipe: use explicit or auto-match based on flavor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let batterRecipe: any = tier.batterRecipe || null
    let batterMultiplier = tier.batterMultiplier ? Number(tier.batterMultiplier) : null

    if (!batterRecipe && tier.flavor) {
      batterRecipe = await findMatchingRecipe(tier.flavor, 'BATTER', allRecipes)
    }
    if (batterRecipe && !batterMultiplier) {
      batterMultiplier = calculateMultiplier(batterRecipe.yieldVolumeMl, tierVolume, 'BATTER')
    }

    // Resolve filling recipe: use explicit or auto-match based on filling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fillingRecipe: any = tier.fillingRecipe || null
    let fillingMultiplier = tier.fillingMultiplier ? Number(tier.fillingMultiplier) : null

    if (!fillingRecipe && tier.filling) {
      fillingRecipe = await findMatchingRecipe(tier.filling, 'FILLING', allRecipes)
    }
    if (fillingRecipe && !fillingMultiplier) {
      fillingMultiplier = calculateMultiplier(fillingRecipe.yieldVolumeMl, tierVolume, 'FILLING')
    }

    // Resolve frosting recipe: use explicit or auto-match based on finishType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let frostingRecipe: any = tier.frostingRecipe || null
    let frostingMultiplier = tier.frostingMultiplier ? Number(tier.frostingMultiplier) : null

    if (!frostingRecipe && tier.finishType) {
      // Try to match frosting based on finish type (e.g., "Buttercream" -> Vanilla Buttercream)
      frostingRecipe = await findMatchingRecipe(tier.finishType, 'FROSTING', allRecipes)
    }
    if (frostingRecipe && !frostingMultiplier) {
      frostingMultiplier = calculateMultiplier(frostingRecipe.yieldVolumeMl, tierVolume, 'FROSTING')
    }

    // Store debug info
    recipeMatches.push({
      tierId: tier.id,
      tierName: tierSize.name,
      tierVolumeMl: tierVolume,
      batter: batterRecipe ? {
        recipe: batterRecipe,
        multiplier: batterMultiplier || 1
      } : null,
      filling: fillingRecipe ? {
        recipe: fillingRecipe,
        multiplier: fillingMultiplier || 1
      } : null,
      frosting: frostingRecipe ? {
        recipe: frostingRecipe,
        multiplier: frostingMultiplier || 1
      } : null,
    })

    // Process batter recipe ingredients
    if (batterRecipe && batterMultiplier) {
      for (const ri of batterRecipe.recipeIngredients) {
        const quantity = new Decimal(ri.quantity)
          .mul(new Decimal(batterMultiplier))
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

      // Batter labor
      if (batterRecipe.laborMinutes) {
        const scaledMinutes = batterRecipe.laborMinutes * batterMultiplier
        const role = batterRecipe.laborRole
        const roleName = role?.name || 'Baker'
        const roleRate = role ? Number(role.hourlyRate) : bakerRate

        recipeLaborCost += (scaledMinutes / 60) * roleRate

        const existing = laborMinutesByRole.get(roleName)
        if (existing) {
          existing.minutes += scaledMinutes
        } else {
          laborMinutesByRole.set(roleName, { minutes: scaledMinutes, rate: roleRate })
        }
      }
    }

    // Process filling recipe ingredients
    if (fillingRecipe && fillingMultiplier) {
      for (const ri of fillingRecipe.recipeIngredients) {
        const quantity = new Decimal(ri.quantity)
          .mul(new Decimal(fillingMultiplier))
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

      // Filling labor
      if (fillingRecipe.laborMinutes) {
        const scaledMinutes = fillingRecipe.laborMinutes * fillingMultiplier
        const role = fillingRecipe.laborRole
        const roleName = role?.name || 'Baker'
        const roleRate = role ? Number(role.hourlyRate) : bakerRate

        recipeLaborCost += (scaledMinutes / 60) * roleRate

        const existing = laborMinutesByRole.get(roleName)
        if (existing) {
          existing.minutes += scaledMinutes
        } else {
          laborMinutesByRole.set(roleName, { minutes: scaledMinutes, rate: roleRate })
        }
      }
    }

    // Process frosting recipe ingredients
    if (frostingRecipe && frostingMultiplier) {
      for (const ri of frostingRecipe.recipeIngredients) {
        const quantity = new Decimal(ri.quantity)
          .mul(new Decimal(frostingMultiplier))
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

      // Frosting labor
      if (frostingRecipe.laborMinutes) {
        const scaledMinutes = frostingRecipe.laborMinutes * frostingMultiplier
        const role = frostingRecipe.laborRole
        const roleName = role?.name || 'Baker'
        const roleRate = role ? Number(role.hourlyRate) : bakerRate

        recipeLaborCost += (scaledMinutes / 60) * roleRate

        const existing = laborMinutesByRole.get(roleName)
        if (existing) {
          existing.minutes += scaledMinutes
        } else {
          laborMinutesByRole.set(roleName, { minutes: scaledMinutes, rate: roleRate })
        }
      }
    }

    // Tier assembly labor (fill, stack, crumb coat per tier)
    if (tierSize.assemblyMinutes) {
      const role = tierSize.assemblyRole
      const roleName = role?.name || 'Baker'
      const roleRate = role ? Number(role.hourlyRate) : bakerRate

      assemblyLaborCost += (tierSize.assemblyMinutes / 60) * roleRate

      const existing = laborMinutesByRole.get(roleName)
      if (existing) {
        existing.minutes += tierSize.assemblyMinutes
      } else {
        laborMinutesByRole.set(roleName, { minutes: tierSize.assemblyMinutes, rate: roleRate })
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

  // Calculate additional manual labor (beyond auto-calculated recipe/assembly/decoration)
  // Manual hours are for misc tasks not covered by recipes, assembly, or decoration techniques
  const bakerHours = order.bakerHours ? new Decimal(order.bakerHours).toNumber() : 0
  const assistantHours = order.assistantHours ? new Decimal(order.assistantHours).toNumber() : 0

  let manualLaborCost = 0

  if (bakerHours > 0 || assistantHours > 0) {
    // Use the manual role-specific hours for additional work
    manualLaborCost = (bakerHours * bakerRate) + (assistantHours * assistantRate)

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
  }

  // baseLaborCost = recipe labor + assembly labor + manual adjustments (excludes decoration)
  const baseLaborCost = recipeLaborCost + assemblyLaborCost + manualLaborCost

  // Total labor = base (recipe + assembly + manual) + decoration
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
    recipeMatches, // Include debug info
  }
}
