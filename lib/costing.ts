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
    // Full recipe data for production (baker needs these)
    instructions?: string | null        // JSON array of step-by-step instructions
    prepMinutes?: number | null         // Prep time breakdown
    bakeMinutes?: number | null         // Bake time breakdown
    coolMinutes?: number | null         // Cool time breakdown
    yieldDescription?: string           // Recipe yield description
  }
  multiplier: number
  // Scaled ingredients for this tier (production use)
  scaledIngredients?: {
    ingredientId: number
    name: string
    quantity: number
    unit: string
  }[]
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
  // Full recipe data for production (when includeFullRecipes = true)
  productionRecipes?: {
    tierId: number
    tierIndex: number
    tierName: string
    batter?: RecipeMatch & {
      scaledPrepMinutes?: number | null
      scaledBakeMinutes?: number | null
      scaledCoolMinutes?: number | null
      scaledLaborMinutes?: number | null
    }
    filling?: RecipeMatch & {
      scaledPrepMinutes?: number | null
      scaledBakeMinutes?: number | null
      scaledCoolMinutes?: number | null
      scaledLaborMinutes?: number | null
    }
    frosting?: RecipeMatch & {
      scaledPrepMinutes?: number | null
      scaledBakeMinutes?: number | null
      scaledCoolMinutes?: number | null
      scaledLaborMinutes?: number | null
    }
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

/**
 * Calculate decoration size scaling factor based on tier size vs base cake size
 * Uses surface area for round cakes (π × r²), area for rectangular cakes
 * 
 * @param tierSize - The tier size being decorated
 * @param baseCakeSize - The base cake size the decoration is priced for (e.g., "6\" round")
 * @returns Scaling factor (1.0 = same size, >1.0 = larger tier needs more material/labor)
 */
function calculateDecorationSizeMultiplier(
  tierSize: { diameterCm: number | null; lengthCm: number | null; widthCm: number | null; shape: string },
  baseCakeSize: string | null
): number {
  if (!baseCakeSize) {
    return 1.0 // No base size specified, use 1.0
  }

  // Parse base cake size (e.g., "6\" round" -> 6 inches)
  const baseSizeMatch = baseCakeSize.match(/(\d+(?:\.\d+)?)\s*["']?\s*(?:inch|in|"|')?/i)
  if (!baseSizeMatch) {
    return 1.0 // Can't parse, use 1.0
  }

  const baseSizeInches = parseFloat(baseSizeMatch[1])
  const baseSizeCm = baseSizeInches * 2.54 // Convert to cm

  // Calculate surface area for round cakes
  if (tierSize.shape === 'Round' && tierSize.diameterCm) {
    const tierRadiusCm = Number(tierSize.diameterCm) / 2
    const baseRadiusCm = baseSizeCm / 2
    
    // Surface area = π × r² (for top surface)
    // For decorations, we typically care about surface area
    const tierArea = Math.PI * tierRadiusCm * tierRadiusCm
    const baseArea = Math.PI * baseRadiusCm * baseRadiusCm
    
    if (baseArea > 0) {
      return Math.round((tierArea / baseArea) * 100) / 100
    }
  }

  // For rectangular cakes, use length × width
  if (tierSize.shape === 'Sheet' || tierSize.shape === 'Rectangle') {
    if (tierSize.lengthCm && tierSize.widthCm) {
      // Assume base is square with baseSizeCm sides
      const tierArea = Number(tierSize.lengthCm) * Number(tierSize.widthCm)
      const baseArea = baseSizeCm * baseSizeCm
      
      if (baseArea > 0) {
        return Math.round((tierArea / baseArea) * 100) / 100
      }
    }
  }

  // Fallback: use diameter ratio squared (approximation)
  if (tierSize.diameterCm) {
    const ratio = Number(tierSize.diameterCm) / baseSizeCm
    return Math.round((ratio * ratio) * 100) / 100
  }

  return 1.0
}

/**
 * Calculate order costing
 * 
 * @param orderId - Order ID to calculate costing for
 * @param includeFullRecipes - If true, includes full recipe data with instructions for production use
 *                             (instructions, prepMinutes, bakeMinutes, coolMinutes, scaled ingredients)
 * @returns CostingResult with cost breakdown and optionally full recipe data for production
 */
export async function calculateOrderCosting(
  orderId: number,
  includeFullRecipes: boolean = false
): Promise<CostingResult> {
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
  const defaultMarkupPercent = markupSetting ? parseFloat(markupSetting.value) : 0.7
  // Use order's markup if set, otherwise use default from settings
  const markupPercent = order.markupPercent ? new Decimal(order.markupPercent).toNumber() : defaultMarkupPercent

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
    const batterMatch: RecipeMatch | null = batterRecipe ? {
      recipe: {
        ...batterRecipe,
        // Include full recipe data if requested (for production)
        ...(includeFullRecipes ? {
          instructions: batterRecipe.instructions || null,
          prepMinutes: batterRecipe.prepMinutes || null,
          bakeMinutes: batterRecipe.bakeMinutes || null,
          coolMinutes: batterRecipe.coolMinutes || null,
          yieldDescription: batterRecipe.yieldDescription || null
        } : {})
      },
      multiplier: batterMultiplier || 1,
      // Include scaled ingredients for production
      ...(includeFullRecipes && batterMultiplier ? {
        scaledIngredients: batterRecipe.recipeIngredients.map(ri => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Math.round(Number(ri.quantity) * batterMultiplier * 100) / 100,
          unit: ri.ingredient.unit
        }))
      } : {})
    } : null

    const fillingMatch: RecipeMatch | null = fillingRecipe ? {
      recipe: {
        ...fillingRecipe,
        ...(includeFullRecipes ? {
          instructions: fillingRecipe.instructions || null,
          prepMinutes: fillingRecipe.prepMinutes || null,
          bakeMinutes: fillingRecipe.bakeMinutes || null,
          coolMinutes: fillingRecipe.coolMinutes || null,
          yieldDescription: fillingRecipe.yieldDescription || null
        } : {})
      },
      multiplier: fillingMultiplier || 1,
      ...(includeFullRecipes && fillingMultiplier ? {
        scaledIngredients: fillingRecipe.recipeIngredients.map(ri => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Math.round(Number(ri.quantity) * fillingMultiplier * 100) / 100,
          unit: ri.ingredient.unit
        }))
      } : {})
    } : null

    const frostingMatch: RecipeMatch | null = frostingRecipe ? {
      recipe: {
        ...frostingRecipe,
        ...(includeFullRecipes ? {
          instructions: frostingRecipe.instructions || null,
          prepMinutes: frostingRecipe.prepMinutes || null,
          bakeMinutes: frostingRecipe.bakeMinutes || null,
          coolMinutes: frostingRecipe.coolMinutes || null,
          yieldDescription: frostingRecipe.yieldDescription || null
        } : {})
      },
      multiplier: frostingMultiplier || 1,
      ...(includeFullRecipes && frostingMultiplier ? {
        scaledIngredients: frostingRecipe.recipeIngredients.map(ri => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: Math.round(Number(ri.quantity) * frostingMultiplier * 100) / 100,
          unit: ri.ingredient.unit
        }))
      } : {})
    } : null

    recipeMatches.push({
      tierId: tier.id,
      tierName: tierSize.name,
      tierVolumeMl: tierVolume,
      batter: batterMatch,
      filling: fillingMatch,
      frosting: frostingMatch
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

    // Use unit override if stored in order decoration (future: add unitOverride field to OrderDecoration)
    // For now, use technique's default unit
    const effectiveUnit = technique.unit

    // Determine quantity multiplier based on unit type
    let quantityMultiplier = orderDec.quantity
    
    // SINGLE: Per-item decorations (e.g., sugar flowers, sculpted balloons, toppers)
    // Quantity = number of items, no size scaling
    if (effectiveUnit === 'SINGLE') {
      // No scaling - quantity is already the number of items
    }
    // CAKE: Whole cake surface design (e.g., fondant quilt design)
    // Applies to entire cake (all tiers), scales by total surface area
    else if (effectiveUnit === 'CAKE' && technique.baseCakeSize && order.cakeTiers.length > 0) {
      // Calculate total surface area multiplier across ALL tiers
      let totalSurfaceArea = 0
      let baseSurfaceArea = 0
      
      for (const tier of order.cakeTiers) {
        // Calculate surface area for this tier
        let tierSurfaceArea = 0
        if (tier.tierSize.shape === 'Round' && tier.tierSize.diameterCm) {
          const radius = Number(tier.tierSize.diameterCm) / 2
          tierSurfaceArea = Math.PI * radius * radius // Top surface
          const circumference = Math.PI * Number(tier.tierSize.diameterCm)
          const height = Number(tier.tierSize.heightCm)
          tierSurfaceArea += circumference * height // Side surface
        } else if (tier.tierSize.lengthCm && tier.tierSize.widthCm) {
          tierSurfaceArea = Number(tier.tierSize.lengthCm) * Number(tier.tierSize.widthCm) // Top surface
          const perimeter = 2 * (Number(tier.tierSize.lengthCm) + Number(tier.tierSize.widthCm))
          const height = Number(tier.tierSize.heightCm)
          tierSurfaceArea += perimeter * height // Side surface
        }
        totalSurfaceArea += tierSurfaceArea
      }
      
      // Calculate base surface area from baseCakeSize
      const baseSizeMatch = technique.baseCakeSize.match(/(\d+)"\s*(round|square)/i)
      if (baseSizeMatch) {
        const baseDiameter = parseFloat(baseSizeMatch[1]) * 2.54 // Convert inches to cm
        const baseRadius = baseDiameter / 2
        baseSurfaceArea = Math.PI * baseRadius * baseRadius // Top surface
        const baseCircumference = Math.PI * baseDiameter
        const baseHeight = 10 // Assume 10cm height for base calculation
        baseSurfaceArea += baseCircumference * baseHeight // Side surface
        
        if (baseSurfaceArea > 0) {
          const totalSurfaceMultiplier = totalSurfaceArea / baseSurfaceArea
          quantityMultiplier = quantityMultiplier * totalSurfaceMultiplier
        }
      }
    }
    // TIER: Per-tier decoration (e.g., ombre buttercream on specific tiers)
    // Quantity = number of tiers this applies to, scales by tier size
    else if (effectiveUnit === 'TIER') {
      // Quantity already represents number of tiers
      // Scale by tier size if baseCakeSize is specified
      if (technique.baseCakeSize && order.cakeTiers.length > 0) {
        // Calculate average size multiplier across all tiers
        let totalSizeMultiplier = 0
        for (const tier of order.cakeTiers) {
          const sizeMultiplier = calculateDecorationSizeMultiplier(
            {
              diameterCm: tier.tierSize.diameterCm ? Number(tier.tierSize.diameterCm) : null,
              lengthCm: tier.tierSize.lengthCm ? Number(tier.tierSize.lengthCm) : null,
              widthCm: tier.tierSize.widthCm ? Number(tier.tierSize.widthCm) : null,
              shape: tier.tierSize.shape
            },
            technique.baseCakeSize
          )
          totalSizeMultiplier += sizeMultiplier
        }
        // For TIER unit, quantity = number of tiers to apply to
        // Calculate average multiplier for those tiers
        const avgSizeMultiplier = totalSizeMultiplier / order.cakeTiers.length
        quantityMultiplier = quantityMultiplier * avgSizeMultiplier
      }
    }
    // SET units use the base quantity (no size scaling)

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

  // Build production recipes array if requested (for baker/production use)
  const productionRecipes: CostingResult['productionRecipes'] = includeFullRecipes
    ? order.cakeTiers.map(tier => {
        const tierSize = tier.tierSize
        const tierVolume = tierSize.volumeMl

        // Get recipes and multipliers (same logic as above)
        let batterRecipe: any = tier.batterRecipe || null
        let batterMultiplier = tier.batterMultiplier ? Number(tier.batterMultiplier) : null
        if (!batterRecipe && tier.flavor) {
          batterRecipe = allRecipes.find(r =>
            r.type === 'BATTER' &&
            (r.name.toLowerCase().includes(tier.flavor?.toLowerCase() || '') ||
              tier.flavor?.toLowerCase().includes(r.name.toLowerCase().split(' ')[0]))
          )
        }
        if (batterRecipe && !batterMultiplier) {
          batterMultiplier = calculateMultiplier(batterRecipe.yieldVolumeMl, tierVolume, 'BATTER')
        }

        let fillingRecipe: any = tier.fillingRecipe || null
        let fillingMultiplier = tier.fillingMultiplier ? Number(tier.fillingMultiplier) : null
        if (!fillingRecipe && tier.filling) {
          fillingRecipe = allRecipes.find(r =>
            r.type === 'FILLING' &&
            (r.name.toLowerCase().includes(tier.filling?.toLowerCase() || '') ||
              tier.filling?.toLowerCase().includes(r.name.toLowerCase().split(' ')[0]))
          )
        }
        if (fillingRecipe && !fillingMultiplier) {
          fillingMultiplier = calculateMultiplier(fillingRecipe.yieldVolumeMl, tierVolume, 'FILLING')
        }

        let frostingRecipe: any = tier.frostingRecipe || null
        let frostingMultiplier = tier.frostingMultiplier ? Number(tier.frostingMultiplier) : null
        if (!frostingRecipe && tier.finishType) {
          frostingRecipe = allRecipes.find(r =>
            r.type === 'FROSTING' &&
            (r.name.toLowerCase().includes(tier.finishType?.toLowerCase() || '') ||
              tier.finishType?.toLowerCase().includes(r.name.toLowerCase().split(' ')[0]))
          )
        }
        if (frostingRecipe && !frostingMultiplier) {
          frostingMultiplier = calculateMultiplier(frostingRecipe.yieldVolumeMl, tierVolume, 'FROSTING')
        }

        return {
          tierId: tier.id,
          tierIndex: tier.tierIndex,
          tierName: tierSize.name,
          batter: batterRecipe && batterMultiplier ? {
            recipe: {
              ...batterRecipe,
              instructions: batterRecipe.instructions || null,
              prepMinutes: batterRecipe.prepMinutes || null,
              bakeMinutes: batterRecipe.bakeMinutes || null,
              coolMinutes: batterRecipe.coolMinutes || null,
              yieldDescription: batterRecipe.yieldDescription || null,
              laborMinutes: batterRecipe.laborMinutes || null,
              laborRole: batterRecipe.laborRole ? {
                name: batterRecipe.laborRole.name,
                hourlyRate: batterRecipe.laborRole.hourlyRate
              } : null,
              recipeIngredients: batterRecipe.recipeIngredients.map((ri: any) => ({
                ingredientId: ri.ingredientId,
                quantity: ri.quantity,
                ingredient: {
                  id: ri.ingredient.id,
                  name: ri.ingredient.name,
                  unit: ri.ingredient.unit,
                  costPerUnit: ri.ingredient.costPerUnit
                }
              }))
            },
            multiplier: batterMultiplier,
            scaledIngredients: batterRecipe.recipeIngredients.map((ri: any) => ({
              ingredientId: ri.ingredientId,
              name: ri.ingredient.name,
              quantity: Math.round(Number(ri.quantity) * batterMultiplier * 100) / 100,
              unit: ri.ingredient.unit
            })),
            scaledPrepMinutes: batterRecipe.prepMinutes
              ? Math.round(batterRecipe.prepMinutes * batterMultiplier)
              : null,
            scaledBakeMinutes: batterRecipe.bakeMinutes
              ? Math.round(batterRecipe.bakeMinutes * batterMultiplier)
              : null,
            scaledCoolMinutes: batterRecipe.coolMinutes
              ? Math.round(batterRecipe.coolMinutes * batterMultiplier)
              : null,
            scaledLaborMinutes: batterRecipe.laborMinutes
              ? Math.round(batterRecipe.laborMinutes * batterMultiplier * 100) / 100
              : null
          } : undefined,
          filling: fillingRecipe && fillingMultiplier ? {
            recipe: {
              ...fillingRecipe,
              instructions: fillingRecipe.instructions || null,
              prepMinutes: fillingRecipe.prepMinutes || null,
              bakeMinutes: fillingRecipe.bakeMinutes || null,
              coolMinutes: fillingRecipe.coolMinutes || null,
              yieldDescription: fillingRecipe.yieldDescription || null,
              laborMinutes: fillingRecipe.laborMinutes || null,
              laborRole: fillingRecipe.laborRole ? {
                name: fillingRecipe.laborRole.name,
                hourlyRate: fillingRecipe.laborRole.hourlyRate
              } : null,
              recipeIngredients: fillingRecipe.recipeIngredients.map((ri: any) => ({
                ingredientId: ri.ingredientId,
                quantity: ri.quantity,
                ingredient: {
                  id: ri.ingredient.id,
                  name: ri.ingredient.name,
                  unit: ri.ingredient.unit,
                  costPerUnit: ri.ingredient.costPerUnit
                }
              }))
            },
            multiplier: fillingMultiplier,
            scaledIngredients: fillingRecipe.recipeIngredients.map((ri: any) => ({
              ingredientId: ri.ingredientId,
              name: ri.ingredient.name,
              quantity: Math.round(Number(ri.quantity) * fillingMultiplier * 100) / 100,
              unit: ri.ingredient.unit
            })),
            scaledPrepMinutes: fillingRecipe.prepMinutes
              ? Math.round(fillingRecipe.prepMinutes * fillingMultiplier)
              : null,
            scaledBakeMinutes: fillingRecipe.bakeMinutes
              ? Math.round(fillingRecipe.bakeMinutes * fillingMultiplier)
              : null,
            scaledCoolMinutes: fillingRecipe.coolMinutes
              ? Math.round(fillingRecipe.coolMinutes * fillingMultiplier)
              : null,
            scaledLaborMinutes: fillingRecipe.laborMinutes
              ? Math.round(fillingRecipe.laborMinutes * fillingMultiplier * 100) / 100
              : null
          } : undefined,
          frosting: frostingRecipe && frostingMultiplier ? {
            recipe: {
              ...frostingRecipe,
              instructions: frostingRecipe.instructions || null,
              prepMinutes: frostingRecipe.prepMinutes || null,
              bakeMinutes: frostingRecipe.bakeMinutes || null,
              coolMinutes: frostingRecipe.coolMinutes || null,
              yieldDescription: frostingRecipe.yieldDescription || null,
              laborMinutes: frostingRecipe.laborMinutes || null,
              laborRole: frostingRecipe.laborRole ? {
                name: frostingRecipe.laborRole.name,
                hourlyRate: frostingRecipe.laborRole.hourlyRate
              } : null,
              recipeIngredients: frostingRecipe.recipeIngredients.map((ri: any) => ({
                ingredientId: ri.ingredientId,
                quantity: ri.quantity,
                ingredient: {
                  id: ri.ingredient.id,
                  name: ri.ingredient.name,
                  unit: ri.ingredient.unit,
                  costPerUnit: ri.ingredient.costPerUnit
                }
              }))
            },
            multiplier: frostingMultiplier,
            scaledIngredients: frostingRecipe.recipeIngredients.map((ri: any) => ({
              ingredientId: ri.ingredientId,
              name: ri.ingredient.name,
              quantity: Math.round(Number(ri.quantity) * frostingMultiplier * 100) / 100,
              unit: ri.ingredient.unit
            })),
            scaledPrepMinutes: frostingRecipe.prepMinutes
              ? Math.round(frostingRecipe.prepMinutes * frostingMultiplier)
              : null,
            scaledBakeMinutes: frostingRecipe.bakeMinutes
              ? Math.round(frostingRecipe.bakeMinutes * frostingMultiplier)
              : null,
            scaledCoolMinutes: frostingRecipe.coolMinutes
              ? Math.round(frostingRecipe.coolMinutes * frostingMultiplier)
              : null,
            scaledLaborMinutes: frostingRecipe.laborMinutes
              ? Math.round(frostingRecipe.laborMinutes * frostingMultiplier * 100) / 100
              : null
          } : undefined
        }
      })
    : undefined

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
    productionRecipes // Include full recipe data for production when requested
  }
}

/**
 * Quote input data structure for calculating costs without persisting to database
 */
export interface QuoteInput {
  // Customer info
  customerId?: number | null
  customerName: string
  
  // Event details
  eventDate: Date
  
  // Tiers
  tiers: {
    tierSizeId: number
    tierIndex: number
    batterRecipeId?: number | null
    batterMultiplier?: number | null
    fillingRecipeId?: number | null
    fillingMultiplier?: number | null
    frostingRecipeId?: number | null
    frostingMultiplier?: number | null
    flavor?: string | null
    filling?: string | null
    finishType?: string | null
  }[]
  
  // Decorations
  decorations?: {
    decorationTechniqueId: number
    quantity: number
    unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' // Optional override of decoration's default unit
    tierIndices?: number[] // For TIER unit: which tier indices this decoration applies to (e.g., [1, 2])
  }[]
  
  // Delivery
  isDelivery?: boolean
  deliveryZoneId?: number | null
  deliveryDistance?: number | null
  
  // Labor
  bakerHours?: number | null
  assistantHours?: number | null
  
  // Topper
  topperType?: string | null
  topperText?: string | null
  customTopperFee?: number | null
  
  // Pricing
  markupPercent?: number  // Override default markup
  discountType?: 'PERCENT' | 'FIXED' | null
  discountValue?: number | null
  discountReason?: string | null
}

/**
 * Calculate quote costing from draft data (no database writes)
 * This function works with in-memory data structures and calculates costs
 * the same way as calculateOrderCosting, but without requiring a persisted order.
 * 
 * @param quoteData - Quote input data with tiers, decorations, etc.
 * @returns CostingResult with cost breakdown
 */
export async function calculateQuoteCost(
  quoteData: QuoteInput
): Promise<CostingResult> {
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

  // Get all tier sizes
  const tierSizeIds = quoteData.tiers.map(t => t.tierSizeId)
  const tierSizes = await prisma.tierSize.findMany({
    where: { id: { in: tierSizeIds } },
    include: {
      assemblyRole: true
    }
  })

  // Get all decoration techniques
  const decorationIds = quoteData.decorations?.map(d => d.decorationTechniqueId) || []
  const decorationTechniques = decorationIds.length > 0
    ? await prisma.decorationTechnique.findMany({
        where: { id: { in: decorationIds } },
        include: {
          laborRole: true
        }
      })
    : []

  // Get delivery zone if specified
  const deliveryZone = quoteData.isDelivery && quoteData.deliveryZoneId
    ? await prisma.deliveryZone.findUnique({
        where: { id: quoteData.deliveryZoneId }
      })
    : null

  // Get settings
  const markupSetting = await prisma.setting.findUnique({
    where: { key: 'MarkupPercent' }
  })
  const defaultMarkupPercent = markupSetting ? parseFloat(markupSetting.value) : 0.7
  const markupPercent = quoteData.markupPercent ?? defaultMarkupPercent

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
  const totalServings = tierSizes.reduce((sum, ts) => {
    const tier = quoteData.tiers.find(t => t.tierSizeId === ts.id)
    return tier ? sum + ts.servings : sum
  }, 0)
  const tierCount = quoteData.tiers.length

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

  for (const tierInput of quoteData.tiers) {
    const tierSize = tierSizes.find(ts => ts.id === tierInput.tierSizeId)
    if (!tierSize) continue

    const tierVolume = tierSize.volumeMl

    // Resolve batter recipe
    let batterRecipe: typeof allRecipes[0] | null = null
    let batterMultiplier = tierInput.batterMultiplier ?? null

    if (tierInput.batterRecipeId) {
      batterRecipe = allRecipes.find(r => r.id === tierInput.batterRecipeId) || null
    } else if (tierInput.flavor) {
      batterRecipe = await findMatchingRecipe(tierInput.flavor, 'BATTER', allRecipes)
    }

    if (batterRecipe && !batterMultiplier) {
      batterMultiplier = calculateMultiplier(batterRecipe.yieldVolumeMl, tierVolume, 'BATTER')
    }

    // Resolve filling recipe
    let fillingRecipe: typeof allRecipes[0] | null = null
    let fillingMultiplier = tierInput.fillingMultiplier ?? null

    if (tierInput.fillingRecipeId) {
      fillingRecipe = allRecipes.find(r => r.id === tierInput.fillingRecipeId) || null
    } else if (tierInput.filling) {
      fillingRecipe = await findMatchingRecipe(tierInput.filling, 'FILLING', allRecipes)
    }

    if (fillingRecipe && !fillingMultiplier) {
      fillingMultiplier = calculateMultiplier(fillingRecipe.yieldVolumeMl, tierVolume, 'FILLING')
    }

    // Resolve frosting recipe
    let frostingRecipe: typeof allRecipes[0] | null = null
    let frostingMultiplier = tierInput.frostingMultiplier ?? null

    if (tierInput.frostingRecipeId) {
      frostingRecipe = allRecipes.find(r => r.id === tierInput.frostingRecipeId) || null
    } else if (tierInput.finishType) {
      frostingRecipe = await findMatchingRecipe(tierInput.finishType, 'FROSTING', allRecipes)
    }

    if (frostingRecipe && !frostingMultiplier) {
      frostingMultiplier = calculateMultiplier(frostingRecipe.yieldVolumeMl, tierVolume, 'FROSTING')
    }

    // Store debug info
    const batterMatch: RecipeMatch | null = batterRecipe ? {
      recipe: {
        ...batterRecipe,
        yieldVolumeMl: batterRecipe.yieldVolumeMl,
        laborMinutes: batterRecipe.laborMinutes,
        laborRole: batterRecipe.laborRole,
        recipeIngredients: batterRecipe.recipeIngredients
      },
      multiplier: batterMultiplier || 1
    } : null

    const fillingMatch: RecipeMatch | null = fillingRecipe ? {
      recipe: {
        ...fillingRecipe,
        yieldVolumeMl: fillingRecipe.yieldVolumeMl,
        laborMinutes: fillingRecipe.laborMinutes,
        laborRole: fillingRecipe.laborRole,
        recipeIngredients: fillingRecipe.recipeIngredients
      },
      multiplier: fillingMultiplier || 1
    } : null

    const frostingMatch: RecipeMatch | null = frostingRecipe ? {
      recipe: {
        ...frostingRecipe,
        yieldVolumeMl: frostingRecipe.yieldVolumeMl,
        laborMinutes: frostingRecipe.laborMinutes,
        laborRole: frostingRecipe.laborRole,
        recipeIngredients: frostingRecipe.recipeIngredients
      },
      multiplier: frostingMultiplier || 1
    } : null

    recipeMatches.push({
      tierId: tierInput.tierSizeId,
      tierName: tierSize.name,
      tierVolumeMl: tierVolume,
      batter: batterMatch,
      filling: fillingMatch,
      frosting: frostingMatch
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

    // Tier assembly labor
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

  // Calculate decoration costs
  const decorations: DecorationCostDetail[] = []
  let decorationMaterialCost = 0
  let decorationLaborCost = 0

  for (const decInput of quoteData.decorations || []) {
    const technique = decorationTechniques.find(dt => dt.id === decInput.decorationTechniqueId)
    if (!technique) continue

    // Use unit override if provided, otherwise use decoration's default unit
    const effectiveUnit = (decInput as any).unitOverride || technique.unit

    // Determine quantity multiplier based on unit type
    let quantityMultiplier = decInput.quantity || 1
    
    // SINGLE: Per-item decorations (e.g., sugar flowers, sculpted balloons, toppers)
    // Quantity = number of items, no size scaling
    // Example: quantity = 5 means "5 sugar flowers"
    if (effectiveUnit === 'SINGLE') {
      // No scaling - quantity is already the number of items
      // Cost = quantity × baseCost
    }
    // CAKE: Whole cake surface design (e.g., fondant quilt design)
    // Applies to entire cake (all tiers), scales by total surface area
    // Quantity = number of instances of this design on the whole cake
    else if (effectiveUnit === 'CAKE' && technique.baseCakeSize && quoteData.tiers.length > 0) {
      // Calculate total surface area multiplier across ALL tiers
      // This represents the entire cake surface area vs the base size
      let totalSurfaceArea = 0
      let baseSurfaceArea = 0
      let validTiers = 0
      
      for (const tierInput of quoteData.tiers) {
        const tierSize = tierSizes.find(ts => ts.id === tierInput.tierSizeId)
        if (!tierSize) continue
        
        // Calculate surface area for this tier
        let tierSurfaceArea = 0
        if (tierSize.shape === 'Round' && tierSize.diameterCm) {
          const radius = Number(tierSize.diameterCm) / 2
          tierSurfaceArea = Math.PI * radius * radius // Top surface
          const circumference = Math.PI * Number(tierSize.diameterCm)
          const height = Number(tierSize.heightCm)
          tierSurfaceArea += circumference * height // Side surface
        } else if (tierSize.lengthCm && tierSize.widthCm) {
          tierSurfaceArea = Number(tierSize.lengthCm) * Number(tierSize.widthCm) // Top surface
          const perimeter = 2 * (Number(tierSize.lengthCm) + Number(tierSize.widthCm))
          const height = Number(tierSize.heightCm)
          tierSurfaceArea += perimeter * height // Side surface
        }
        
        totalSurfaceArea += tierSurfaceArea
        validTiers++
      }
      
      // Calculate base surface area from baseCakeSize
      const baseSizeMatch = technique.baseCakeSize.match(/(\d+)"\s*(round|square)/i)
      if (baseSizeMatch && validTiers > 0) {
        const baseDiameter = parseFloat(baseSizeMatch[1]) * 2.54 // Convert inches to cm
        const baseRadius = baseDiameter / 2
        baseSurfaceArea = Math.PI * baseRadius * baseRadius // Top surface
        const baseCircumference = Math.PI * baseDiameter
        const baseHeight = 10 // Assume 10cm height for base calculation
        baseSurfaceArea += baseCircumference * baseHeight // Side surface
        
        if (baseSurfaceArea > 0) {
          const totalSurfaceMultiplier = totalSurfaceArea / baseSurfaceArea
          quantityMultiplier = quantityMultiplier * totalSurfaceMultiplier
        }
      }
    }
    // TIER: Per-tier decoration (e.g., ombre buttercream on specific tiers)
    // Quantity = number of tiers this applies to, scales by tier size
    // Example: quantity = 2 means "apply to 2 tiers"
    else if (effectiveUnit === 'TIER' && technique.baseCakeSize && quoteData.tiers.length > 0) {
      // Get tier indices this decoration applies to (if specified)
      const tierIndices = (decInput as any).tierIndices as number[] | undefined
      
      // Filter tiers to only those selected (if tierIndices specified)
      const relevantTiers = tierIndices && tierIndices.length > 0
        ? quoteData.tiers.filter(t => tierIndices.includes(t.tierIndex))
        : quoteData.tiers // Fallback to all tiers if not specified
      
      // Calculate average size multiplier across selected tiers
      // This scales the cost based on how much larger/smaller the actual tiers are
      // compared to the base size the decoration is priced for
      let totalSizeMultiplier = 0
      let validTiers = 0
      for (const tierInput of relevantTiers) {
        const tierSize = tierSizes.find(ts => ts.id === tierInput.tierSizeId)
        if (!tierSize) continue
        
        const sizeMultiplier = calculateDecorationSizeMultiplier(
          {
            diameterCm: tierSize.diameterCm ? Number(tierSize.diameterCm) : null,
            lengthCm: tierSize.lengthCm ? Number(tierSize.lengthCm) : null,
            widthCm: tierSize.widthCm ? Number(tierSize.widthCm) : null,
            shape: tierSize.shape
          },
          technique.baseCakeSize
        )
        totalSizeMultiplier += sizeMultiplier
        validTiers++
      }
      if (validTiers > 0) {
        const avgSizeMultiplier = totalSizeMultiplier / validTiers
        // Scale the quantity by size multiplier
        // e.g., if tiers are 2x larger than base, need 2x material/labor
        quantityMultiplier = quantityMultiplier * avgSizeMultiplier
      }
    }

    const materialCost = new Decimal(technique.defaultCostPerUnit)
      .mul(quantityMultiplier)
      .toNumber()

    const laborMins = technique.laborMinutes * quantityMultiplier

    // Get the labor rate for this technique's role
    let laborRole = 'Decorator'
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

  if (quoteData.topperType) {
    const standardTopperCost = 5

    if (quoteData.topperType === 'custom' && quoteData.customTopperFee) {
      topperCost = new Decimal(quoteData.customTopperFee).toNumber()
    } else if (quoteData.topperType !== 'none' && quoteData.topperType !== '') {
      topperCost = standardTopperCost
    }

    topper = {
      type: quoteData.topperType,
      text: quoteData.topperText || null,
      cost: topperCost
    }
  }

  // Calculate delivery cost
  let deliveryCost = 0
  let delivery: DeliveryCostDetail | null = null

  if (quoteData.isDelivery && deliveryZone) {
    const baseFee = new Decimal(deliveryZone.baseFee).toNumber()
    const perMileFee = deliveryZone.perMileFee ? new Decimal(deliveryZone.perMileFee).toNumber() : null
    const distance = quoteData.deliveryDistance ? new Decimal(quoteData.deliveryDistance).toNumber() : null

    deliveryCost = baseFee
    if (perMileFee && distance) {
      deliveryCost += perMileFee * distance
    }

    delivery = {
      zoneName: deliveryZone.name,
      baseFee: baseFee,
      perMileFee: perMileFee,
      estimatedDistance: distance,
      totalFee: deliveryCost
    }
  }

  // Calculate manual labor
  const bakerHours = quoteData.bakerHours ? new Decimal(quoteData.bakerHours).toNumber() : 0
  const assistantHours = quoteData.assistantHours ? new Decimal(quoteData.assistantHours).toNumber() : 0

  let manualLaborCost = 0

  if (bakerHours > 0 || assistantHours > 0) {
    manualLaborCost = (bakerHours * bakerRate) + (assistantHours * assistantRate)

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
  laborBreakdown.sort((a, b) => b.cost - a.cost)

  // Calculate totals
  const totalCostBeforeDelivery = ingredientCost + decorationMaterialCost + topperCost + totalLaborCost
  const suggestedPriceBeforeDelivery = totalCostBeforeDelivery * (1 + markupPercent)
  const totalCost = totalCostBeforeDelivery + deliveryCost
  const suggestedPrice = suggestedPriceBeforeDelivery

  // Calculate discount
  let discountAmount = 0
  let discount: DiscountDetail | null = null

  if (quoteData.discountType && quoteData.discountValue) {
    const discountVal = new Decimal(quoteData.discountValue).toNumber()
    if (quoteData.discountType === 'PERCENT') {
      discountAmount = suggestedPrice * (discountVal / 100)
    } else {
      discountAmount = discountVal
    }

    discount = {
      type: quoteData.discountType,
      value: discountVal,
      reason: quoteData.discountReason || null,
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
    recipeMatches
  }
}
