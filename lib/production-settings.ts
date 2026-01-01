/**
 * Production Settings Library
 *
 * Configurable settings for production yield calculations.
 * These values can be overridden via the admin settings panel.
 */

// Default production settings (can be overridden in admin)
export const PRODUCTION_DEFAULTS = {
  // Tier structure
  layersPerTier: 3,                    // Number of cake layers per tier
  layerHeightInches: 2.5,              // Height of each cake layer (before stacking)
  standardTierHeightInches: 6,         // Standard finished tier height (including frosting)

  // Assembly times (minutes) by tier size in inches
  assemblyMinutesBySize: {
    6: 15,
    8: 20,
    10: 25,
    12: 30,
    14: 35,
  } as Record<number, number>,
  defaultAssemblyMinutes: 20,          // Fallback for unknown sizes

  // Batter calculations
  batterGramsPerCubicInch: 14,         // ~0.5 oz = 14g per cubic inch of batter
  batterShrinkageFactor: 0.85,         // Cake shrinks ~15% when baking

  // Buttercream calculations (per tier, scaled by size)
  buttercreamInternalGramsPerLayer: 100,  // Between cake layers (~3.5 oz)
  buttercreamCrumbCoatGramsPerSqInch: 2,  // For outer crumb coat
  buttercreamFinalCoatGramsPerSqInch: 3,  // For final frosting coat

  // Surface area multipliers by complexity
  frostingComplexityMultipliers: {
    1: 1.0,    // Light (smooth)
    2: 1.5,    // Medium (textured)
    3: 2.0,    // Heavy (elaborate piping)
  } as Record<number, number>,

  // Surplus/waste factor
  defaultSurplusPercent: 5,            // Extra to account for waste

  // Display defaults
  defaultUnits: 'grams' as 'grams' | 'ounces',

  // Conversions
  gramsPerOunce: 28.3495,
  cubicInchesPerMl: 0.0610237,
  mlPerCup: 236.588,
}

// Setting keys for database storage
export const PRODUCTION_SETTING_KEYS = {
  layersPerTier: 'ProductionLayersPerTier',
  layerHeightInches: 'ProductionLayerHeightInches',
  standardTierHeightInches: 'ProductionStandardTierHeightInches',
  batterGramsPerCubicInch: 'ProductionBatterGramsPerCubicInch',
  batterShrinkageFactor: 'ProductionBatterShrinkageFactor',
  buttercreamInternalGramsPerLayer: 'ProductionButtercreamInternalGramsPerLayer',
  buttercreamCrumbCoatGramsPerSqInch: 'ProductionButtercreamCrumbCoatGramsPerSqInch',
  buttercreamFinalCoatGramsPerSqInch: 'ProductionButtercreamFinalCoatGramsPerSqInch',
  defaultSurplusPercent: 'ProductionDefaultSurplusPercent',
  defaultUnits: 'ProductionDefaultUnits',
  defaultAssemblyMinutes: 'ProductionDefaultAssemblyMinutes',
  assemblyMinutesBySize: 'ProductionAssemblyMinutesBySize', // JSON string
} as const

export type ProductionSettings = typeof PRODUCTION_DEFAULTS

/**
 * Parse settings from database format to typed ProductionSettings
 */
export function parseProductionSettings(dbSettings: Record<string, string>): ProductionSettings {
  // Parse assemblyMinutesBySize from JSON, or use defaults
  let assemblyMinutesBySize = PRODUCTION_DEFAULTS.assemblyMinutesBySize
  const assemblyJson = dbSettings[PRODUCTION_SETTING_KEYS.assemblyMinutesBySize]
  if (assemblyJson) {
    try {
      assemblyMinutesBySize = JSON.parse(assemblyJson)
    } catch {
      // Use defaults if JSON is invalid
    }
  }

  return {
    layersPerTier: parseInt(dbSettings[PRODUCTION_SETTING_KEYS.layersPerTier]) || PRODUCTION_DEFAULTS.layersPerTier,
    layerHeightInches: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.layerHeightInches]) || PRODUCTION_DEFAULTS.layerHeightInches,
    standardTierHeightInches: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.standardTierHeightInches]) || PRODUCTION_DEFAULTS.standardTierHeightInches,
    batterGramsPerCubicInch: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.batterGramsPerCubicInch]) || PRODUCTION_DEFAULTS.batterGramsPerCubicInch,
    batterShrinkageFactor: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.batterShrinkageFactor]) || PRODUCTION_DEFAULTS.batterShrinkageFactor,
    buttercreamInternalGramsPerLayer: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.buttercreamInternalGramsPerLayer]) || PRODUCTION_DEFAULTS.buttercreamInternalGramsPerLayer,
    buttercreamCrumbCoatGramsPerSqInch: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.buttercreamCrumbCoatGramsPerSqInch]) || PRODUCTION_DEFAULTS.buttercreamCrumbCoatGramsPerSqInch,
    buttercreamFinalCoatGramsPerSqInch: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.buttercreamFinalCoatGramsPerSqInch]) || PRODUCTION_DEFAULTS.buttercreamFinalCoatGramsPerSqInch,
    defaultSurplusPercent: parseFloat(dbSettings[PRODUCTION_SETTING_KEYS.defaultSurplusPercent]) || PRODUCTION_DEFAULTS.defaultSurplusPercent,
    defaultUnits: (dbSettings[PRODUCTION_SETTING_KEYS.defaultUnits] as 'grams' | 'ounces') || PRODUCTION_DEFAULTS.defaultUnits,
    defaultAssemblyMinutes: parseInt(dbSettings[PRODUCTION_SETTING_KEYS.defaultAssemblyMinutes]) || PRODUCTION_DEFAULTS.defaultAssemblyMinutes,
    assemblyMinutesBySize,
    frostingComplexityMultipliers: PRODUCTION_DEFAULTS.frostingComplexityMultipliers,
    gramsPerOunce: PRODUCTION_DEFAULTS.gramsPerOunce,
    cubicInchesPerMl: PRODUCTION_DEFAULTS.cubicInchesPerMl,
    mlPerCup: PRODUCTION_DEFAULTS.mlPerCup,
  }
}

/**
 * Calculate tier dimensions from size name
 * Parses sizes like "6 inch round", "8 inch square", etc.
 */
export function parseTierSize(sizeName: string): { diameterInches: number; shape: 'round' | 'square' } {
  const match = sizeName.match(/(\d+)\s*(?:inch|in|")?/i)
  const diameterInches = match ? parseInt(match[1]) : 8
  const shape = sizeName.toLowerCase().includes('square') ? 'square' : 'round'
  return { diameterInches, shape }
}

/**
 * Calculate the volume of a single cake layer
 */
export function calculateLayerVolumeCubicInches(
  diameterInches: number,
  layerHeightInches: number,
  shape: 'round' | 'square' = 'round'
): number {
  if (shape === 'square') {
    return diameterInches * diameterInches * layerHeightInches
  }
  const radius = diameterInches / 2
  return Math.PI * radius * radius * layerHeightInches
}

/**
 * Calculate total tier CAKE volume in ml (used for recipe scaling)
 * This is the SINGLE SOURCE OF TRUTH for tier volume calculations.
 *
 * Tier structure: 3 layers × 2.5" each = 7.5" total cake height
 * (Settings configurable via admin)
 *
 * @param diameterInches - Tier diameter (or side length for square)
 * @param shape - 'round' or 'square'
 * @param settings - Production settings (uses defaults if not provided)
 * @returns Volume in milliliters
 */
export function calculateTierVolumeMl(
  diameterInches: number,
  shape: 'round' | 'square' = 'round',
  settings: ProductionSettings = PRODUCTION_DEFAULTS
): number {
  const totalCakeHeight = settings.layersPerTier * settings.layerHeightInches
  const volumeCubicInches = calculateLayerVolumeCubicInches(
    diameterInches,
    totalCakeHeight,
    shape
  )
  // Convert cubic inches to ml (1 cubic inch = 16.387 ml)
  const ML_PER_CUBIC_INCH = 16.387
  return Math.round(volumeCubicInches * ML_PER_CUBIC_INCH)
}

/**
 * Get assembly time in minutes for a tier size
 */
export function getAssemblyMinutes(
  diameterInches: number,
  settings: ProductionSettings = PRODUCTION_DEFAULTS
): number {
  return settings.assemblyMinutesBySize[diameterInches] ?? settings.defaultAssemblyMinutes
}

/**
 * Calculate batter needed for a tier (all layers)
 */
export function calculateBatterForTier(
  diameterInches: number,
  settings: ProductionSettings,
  shape: 'round' | 'square' = 'round'
): { grams: number; ounces: number; layers: number } {
  const layerVolume = calculateLayerVolumeCubicInches(
    diameterInches,
    settings.layerHeightInches,
    shape
  )

  // Account for shrinkage - need more batter than final volume
  const batterVolumePerLayer = layerVolume / settings.batterShrinkageFactor
  const totalBatterVolume = batterVolumePerLayer * settings.layersPerTier
  const grams = totalBatterVolume * settings.batterGramsPerCubicInch

  return {
    grams: Math.round(grams),
    ounces: Math.round(grams / settings.gramsPerOunce * 10) / 10,
    layers: settings.layersPerTier,
  }
}

/**
 * Calculate surface area of a tier (for buttercream calculations)
 */
export function calculateTierSurfaceArea(
  diameterInches: number,
  tierHeightInches: number,
  shape: 'round' | 'square' = 'round'
): { topArea: number; sideArea: number; totalArea: number } {
  if (shape === 'square') {
    const topArea = diameterInches * diameterInches
    const sideArea = 4 * diameterInches * tierHeightInches
    return { topArea, sideArea, totalArea: topArea + sideArea }
  }

  const radius = diameterInches / 2
  const topArea = Math.PI * radius * radius
  const sideArea = Math.PI * diameterInches * tierHeightInches
  return { topArea, sideArea, totalArea: topArea + sideArea }
}

/**
 * Calculate surface area from cm dimensions (for decoration scaling)
 * Used when tier dimensions are stored in cm in the database.
 *
 * @param diameterCm - Tier diameter in cm (for round) or null
 * @param heightCm - Tier height in cm
 * @param lengthCm - Tier length in cm (for rectangular) or null
 * @param widthCm - Tier width in cm (for rectangular) or null
 * @returns Surface area in square cm (top + sides)
 */
export function calculateSurfaceAreaCm(
  diameterCm: number | null,
  heightCm: number | null,
  lengthCm: number | null = null,
  widthCm: number | null = null
): number {
  if (!heightCm) return 0

  // Round cake
  if (diameterCm) {
    const radius = diameterCm / 2
    const topArea = Math.PI * radius * radius
    const sideArea = Math.PI * diameterCm * heightCm
    return topArea + sideArea
  }

  // Rectangular/square cake
  if (lengthCm && widthCm) {
    const topArea = lengthCm * widthCm
    const perimeter = 2 * (lengthCm + widthCm)
    const sideArea = perimeter * heightCm
    return topArea + sideArea
  }

  return 0
}

/**
 * Calculate buttercream needed for a tier (internal + crumb coat)
 * Note: Final frosting coat is calculated separately as it's order-level
 */
export function calculateButtercreamForTier(
  diameterInches: number,
  settings: ProductionSettings,
  shape: 'round' | 'square' = 'round',
  complexity: number = 2
): {
  internalGrams: number
  crumbCoatGrams: number
  totalGrams: number
  totalOunces: number
  breakdown: { internal: number; crumbCoat: number }
} {
  // Internal buttercream (between layers) - scales with tier size
  // Larger tiers need more buttercream between layers
  const sizeMultiplier = (diameterInches / 6) ** 2 // Square scaling based on 6" as reference
  const internalGrams = settings.buttercreamInternalGramsPerLayer * (settings.layersPerTier - 1) * sizeMultiplier

  // Crumb coat (outer layer)
  const { totalArea } = calculateTierSurfaceArea(diameterInches, settings.standardTierHeightInches, shape)
  const crumbCoatGrams = totalArea * settings.buttercreamCrumbCoatGramsPerSqInch

  // Apply complexity multiplier to crumb coat (more complex = thicker coat needed)
  const complexityMultiplier = settings.frostingComplexityMultipliers[complexity] || 1.5
  const adjustedCrumbCoat = crumbCoatGrams * complexityMultiplier

  const totalGrams = internalGrams + adjustedCrumbCoat

  return {
    internalGrams: Math.round(internalGrams),
    crumbCoatGrams: Math.round(adjustedCrumbCoat),
    totalGrams: Math.round(totalGrams),
    totalOunces: Math.round(totalGrams / settings.gramsPerOunce * 10) / 10,
    breakdown: {
      internal: Math.round(internalGrams),
      crumbCoat: Math.round(adjustedCrumbCoat),
    }
  }
}

/**
 * Calculate total production needs for multiple tiers
 */
export function calculateBatchTotals(
  tiers: Array<{
    diameterInches: number
    shape?: 'round' | 'square'
    complexity?: number
    count?: number
  }>,
  settings: ProductionSettings,
  surplusPercent?: number
): {
  batter: { grams: number; ounces: number; kg: number; lbs: number }
  buttercream: { grams: number; ounces: number; kg: number; lbs: number }
  tierCount: number
  layerCount: number
} {
  const surplus = 1 + ((surplusPercent ?? settings.defaultSurplusPercent) / 100)

  let totalBatterGrams = 0
  let totalButtercreamGrams = 0
  let totalTiers = 0
  let totalLayers = 0

  for (const tier of tiers) {
    const count = tier.count || 1
    const shape = tier.shape || 'round'
    const complexity = tier.complexity || 2

    const batter = calculateBatterForTier(tier.diameterInches, settings, shape)
    const buttercream = calculateButtercreamForTier(tier.diameterInches, settings, shape, complexity)

    totalBatterGrams += batter.grams * count
    totalButtercreamGrams += buttercream.totalGrams * count
    totalTiers += count
    totalLayers += batter.layers * count
  }

  // Apply surplus
  totalBatterGrams *= surplus
  totalButtercreamGrams *= surplus

  return {
    batter: {
      grams: Math.round(totalBatterGrams),
      ounces: Math.round(totalBatterGrams / settings.gramsPerOunce),
      kg: Math.round(totalBatterGrams / 1000 * 100) / 100,
      lbs: Math.round(totalBatterGrams / settings.gramsPerOunce / 16 * 10) / 10,
    },
    buttercream: {
      grams: Math.round(totalButtercreamGrams),
      ounces: Math.round(totalButtercreamGrams / settings.gramsPerOunce),
      kg: Math.round(totalButtercreamGrams / 1000 * 100) / 100,
      lbs: Math.round(totalButtercreamGrams / settings.gramsPerOunce / 16 * 10) / 10,
    },
    tierCount: totalTiers,
    layerCount: totalLayers,
  }
}

/**
 * Calculate frostable surface area (external + internal filling layers)
 * This is the total area that needs frosting/filling, including between cake layers.
 *
 * Used by production batch calculations to estimate total buttercream needs.
 */
export function calculateFrostableSurfaceArea(
  diameterInches: number,
  tierHeightInches: number,
  shape: 'round' | 'square' = 'round',
  cakeLayers: number = PRODUCTION_DEFAULTS.layersPerTier
): {
  topArea: number
  sideArea: number
  internalArea: number
  externalArea: number
  totalFrostableArea: number
} {
  const { topArea, sideArea, totalArea } = calculateTierSurfaceArea(
    diameterInches,
    tierHeightInches,
    shape
  )

  // Internal filling layers: (cakeLayers - 1) circular/square areas between layers
  const fillingLayers = cakeLayers - 1
  const internalArea = fillingLayers * topArea

  return {
    topArea,
    sideArea,
    internalArea,
    externalArea: totalArea,
    totalFrostableArea: Math.round(totalArea + internalArea)
  }
}

/**
 * Estimate buttercream needed in ounces (quick batch planning estimate)
 *
 * Uses surface area approach:
 * - Outside: ~1 oz per 8 sq in × complexity multiplier
 * - Internal filling: ~0.5 oz per 8 sq in (thinner layer)
 *
 * @param diameterInches - Tier diameter
 * @param heightInches - Tier height (default 4")
 * @param complexity - 1=light, 2=medium, 3=heavy (default 2)
 * @param cakeLayers - Number of cake layers (default from settings)
 */
export function estimateButtercreamOunces(
  diameterInches: number,
  heightInches: number = 4,
  complexity: number = 2,
  cakeLayers: number = PRODUCTION_DEFAULTS.layersPerTier
): number {
  const { topArea, sideArea, internalArea } = calculateFrostableSurfaceArea(
    diameterInches,
    heightInches,
    'round',
    cakeLayers
  )

  const outsideSurfaceArea = topArea + sideArea

  // Outside: ~1 oz per 8 sq in × complexity
  const outsideOzPerSqIn = 1 / 8
  const outsideOz = outsideSurfaceArea * outsideOzPerSqIn * complexity

  // Internal filling: ~0.5 oz per 8 sq in (thinner layer)
  const fillingOzPerSqIn = 0.5 / 8
  const fillingOz = internalArea * fillingOzPerSqIn

  return Math.round((outsideOz + fillingOz) * 10) / 10
}

/**
 * Format quantity for display
 */
export function formatQuantity(
  grams: number,
  useGrams: boolean = true,
  showSecondary: boolean = true
): string {
  if (useGrams) {
    const kg = grams / 1000
    if (showSecondary && grams >= 1000) {
      return `${Math.round(grams)} g (${kg.toFixed(2)} kg)`
    }
    return `${Math.round(grams)} g`
  } else {
    const oz = grams / PRODUCTION_DEFAULTS.gramsPerOunce
    const lbs = oz / 16
    if (showSecondary && oz >= 16) {
      return `${Math.round(oz)} oz (${lbs.toFixed(1)} lbs)`
    }
    return `${Math.round(oz)} oz`
  }
}

/**
 * Convert between units
 */
export function convertUnits(value: number, from: 'grams' | 'ounces', to: 'grams' | 'ounces'): number {
  if (from === to) return value
  if (from === 'grams' && to === 'ounces') {
    return value / PRODUCTION_DEFAULTS.gramsPerOunce
  }
  return value * PRODUCTION_DEFAULTS.gramsPerOunce
}
