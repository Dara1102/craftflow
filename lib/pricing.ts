/**
 * Pricing Calculations - Single Source of Truth
 *
 * All pricing-related calculations should be in this file.
 * This ensures consistency across quotes, orders, and displays.
 */

/**
 * Round to 2 decimal places (for currency)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate markup amount
 *
 * @param cost - Base cost before markup
 * @param markupPercent - Markup as decimal (e.g., 0.7 for 70%)
 * @returns Markup amount in dollars
 */
export function calculateMarkup(cost: number, markupPercent: number): number {
  return roundCurrency(cost * markupPercent)
}

/**
 * Calculate suggested price (cost + markup)
 *
 * @param cost - Base cost before markup
 * @param markupPercent - Markup as decimal (e.g., 0.7 for 70%)
 * @returns Suggested price rounded to 2 decimal places
 */
export function calculateSuggestedPrice(cost: number, markupPercent: number): number {
  return roundCurrency(cost * (1 + markupPercent))
}

/**
 * Calculate discount amount based on type
 *
 * @param price - Price before discount (usually suggestedPrice)
 * @param discountType - 'PERCENT' or 'FIXED'
 * @param discountValue - Discount value (percentage or dollar amount)
 * @returns Discount amount in dollars
 */
export function calculateDiscountAmount(
  price: number,
  discountType: 'PERCENT' | 'FIXED' | null,
  discountValue: number | null
): number {
  if (!discountType || !discountValue) {
    return 0
  }

  if (discountType === 'PERCENT') {
    return roundCurrency(price * (discountValue / 100))
  }

  return roundCurrency(discountValue)
}

/**
 * Calculate final price after markup, discount, and delivery
 *
 * This is the SINGLE SOURCE OF TRUTH for final price calculation.
 * All places that calculate final price should use this function.
 *
 * @param totalCostBeforeDelivery - Sum of all costs (ingredients, labor, decorations, etc.)
 * @param markupPercent - Markup as decimal (e.g., 0.7 for 70%)
 * @param discountType - 'PERCENT' or 'FIXED' or null
 * @param discountValue - Discount value or null
 * @param deliveryCost - Delivery fee (added after markup/discount)
 * @returns Pricing breakdown
 */
export function calculatePricing(
  totalCostBeforeDelivery: number,
  markupPercent: number,
  discountType: 'PERCENT' | 'FIXED' | null = null,
  discountValue: number | null = null,
  deliveryCost: number = 0
): {
  suggestedPrice: number
  discountAmount: number
  finalPrice: number
  markupAmount: number
} {
  const suggestedPriceBeforeDelivery = calculateSuggestedPrice(totalCostBeforeDelivery, markupPercent)
  const suggestedPrice = suggestedPriceBeforeDelivery // Delivery added to final, not suggested

  const discountAmount = calculateDiscountAmount(suggestedPrice, discountType, discountValue)
  const finalPrice = roundCurrency(suggestedPrice - discountAmount + deliveryCost)
  const markupAmount = roundCurrency(suggestedPriceBeforeDelivery - totalCostBeforeDelivery)

  return {
    suggestedPrice,
    discountAmount,
    finalPrice,
    markupAmount,
  }
}

/**
 * Calculate price per serving
 *
 * @param totalPrice - Total price (cost, suggested, or final)
 * @param servings - Number of servings
 * @returns Price per serving, or 0 if no servings
 */
export function calculatePricePerServing(totalPrice: number, servings: number): number {
  if (servings <= 0) {
    return 0
  }
  return roundCurrency(totalPrice / servings)
}

/**
 * Adjust suggested price when costs change
 * Used in edit forms to update pricing in real-time
 *
 * @param currentSuggestedPrice - Current suggested price
 * @param costDifference - Change in cost (positive = cost increased)
 * @param markupPercent - Markup as decimal
 * @returns New suggested price
 */
export function adjustSuggestedPrice(
  currentSuggestedPrice: number,
  costDifference: number,
  markupPercent: number
): number {
  return roundCurrency(currentSuggestedPrice + (costDifference * (1 + markupPercent)))
}

/**
 * Volume factors for recipe types (relative to tier cake volume)
 *
 * - BATTER: 100% of tier cake volume (3 layers × 2.5")
 * - FROSTING: ~36% - covers internal layers + crumb coat + final coat
 * - FILLING: ~12% - thin layer between cake layers (if separate from frosting)
 */
export const RECIPE_VOLUME_FACTORS: Record<string, number> = {
  BATTER: 1.0,
  FROSTING: 0.36,
  FILLING: 0.12,
}

/**
 * Calculate recipe multiplier for scaling ingredients
 *
 * @param recipeYieldVolumeMl - How much the recipe produces
 * @param tierVolumeMl - Tier volume (from database or calculated)
 * @param recipeType - BATTER, FILLING, or FROSTING
 * @returns Multiplier to scale recipe (e.g., 2.5 means 2.5x the base recipe)
 */
export function calculateRecipeMultiplier(
  recipeYieldVolumeMl: number | null,
  tierVolumeMl: number | null,
  recipeType: 'BATTER' | 'FILLING' | 'FROSTING'
): number {
  const factor = RECIPE_VOLUME_FACTORS[recipeType] || 1.0

  if (recipeYieldVolumeMl && tierVolumeMl) {
    const neededVolume = tierVolumeMl * factor
    const multiplier = neededVolume / recipeYieldVolumeMl
    return Math.round(multiplier * 100) / 100 // Round to 2 decimal places
  }

  // Fallback: use a default multiplier of 1.0
  return 1.0
}

/**
 * Calculate decoration size scaling factor
 * Based on surface area comparison between tier and base cake size
 *
 * @param tierDiameterCm - Tier diameter in cm
 * @param baseSizeInches - Base cake size in inches (e.g., 6)
 * @param tierShape - 'Round' or 'Square'
 * @returns Scaling factor (1.0 = same size, >1.0 = larger tier)
 */
export function calculateDecorationScaleFactor(
  tierDiameterCm: number | null,
  baseSizeInches: number,
  tierShape: string = 'Round'
): number {
  if (!tierDiameterCm || baseSizeInches <= 0) {
    return 1.0
  }

  const baseSizeCm = baseSizeInches * 2.54

  if (tierShape === 'Round') {
    const tierRadiusCm = tierDiameterCm / 2
    const baseRadiusCm = baseSizeCm / 2

    const tierArea = Math.PI * tierRadiusCm * tierRadiusCm
    const baseArea = Math.PI * baseRadiusCm * baseRadiusCm

    if (baseArea > 0) {
      return Math.round((tierArea / baseArea) * 100) / 100
    }
  } else {
    // Square: area = side²
    const tierArea = tierDiameterCm * tierDiameterCm
    const baseArea = baseSizeCm * baseSizeCm

    if (baseArea > 0) {
      return Math.round((tierArea / baseArea) * 100) / 100
    }
  }

  return 1.0
}
