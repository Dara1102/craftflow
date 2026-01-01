/**
 * Tests for production-settings.ts
 *
 * These tests ensure the single source of truth for production calculations
 * remains accurate and consistent. Any changes to calculations should be
 * reflected here first (TDD approach).
 */

import {
  PRODUCTION_DEFAULTS,
  calculateLayerVolumeCubicInches,
  calculateTierVolumeMl,
  getAssemblyMinutes,
  parseTierSize,
  calculateBatterForTier,
  calculateTierSurfaceArea,
  calculateSurfaceAreaCm,
  calculateButtercreamForTier,
  calculateFrostableSurfaceArea,
  estimateButtercreamOunces,
} from '../production-settings'

describe('PRODUCTION_DEFAULTS', () => {
  it('has correct tier structure defaults', () => {
    expect(PRODUCTION_DEFAULTS.layersPerTier).toBe(3)
    expect(PRODUCTION_DEFAULTS.layerHeightInches).toBe(2.5)
    expect(PRODUCTION_DEFAULTS.standardTierHeightInches).toBe(6)
  })

  it('has assembly times for standard sizes', () => {
    expect(PRODUCTION_DEFAULTS.assemblyMinutesBySize[6]).toBe(15)
    expect(PRODUCTION_DEFAULTS.assemblyMinutesBySize[8]).toBe(20)
    expect(PRODUCTION_DEFAULTS.assemblyMinutesBySize[10]).toBe(25)
    expect(PRODUCTION_DEFAULTS.assemblyMinutesBySize[12]).toBe(30)
    expect(PRODUCTION_DEFAULTS.assemblyMinutesBySize[14]).toBe(35)
  })

  it('has default assembly minutes fallback', () => {
    expect(PRODUCTION_DEFAULTS.defaultAssemblyMinutes).toBe(20)
  })
})

describe('parseTierSize', () => {
  it('parses round tier sizes', () => {
    expect(parseTierSize('6 inch round')).toEqual({ diameterInches: 6, shape: 'round' })
    expect(parseTierSize('8 inch round')).toEqual({ diameterInches: 8, shape: 'round' })
    expect(parseTierSize('10 inch round')).toEqual({ diameterInches: 10, shape: 'round' })
    expect(parseTierSize('12 inch round')).toEqual({ diameterInches: 12, shape: 'round' })
  })

  it('parses square tier sizes', () => {
    expect(parseTierSize('6 inch square')).toEqual({ diameterInches: 6, shape: 'square' })
    expect(parseTierSize('10 inch square')).toEqual({ diameterInches: 10, shape: 'square' })
  })

  it('handles various formats', () => {
    expect(parseTierSize('6" round')).toEqual({ diameterInches: 6, shape: 'round' })
    expect(parseTierSize('8in round')).toEqual({ diameterInches: 8, shape: 'round' })
  })

  it('defaults to 8 inch round for unparseable input', () => {
    expect(parseTierSize('unknown')).toEqual({ diameterInches: 8, shape: 'round' })
  })
})

describe('calculateLayerVolumeCubicInches', () => {
  it('calculates round layer volume correctly', () => {
    // 6" diameter, 2.5" height: π × 3² × 2.5 = 70.69 cubic inches
    const volume = calculateLayerVolumeCubicInches(6, 2.5, 'round')
    expect(volume).toBeCloseTo(70.69, 1)
  })

  it('calculates square layer volume correctly', () => {
    // 6" × 6" × 2.5" = 90 cubic inches
    const volume = calculateLayerVolumeCubicInches(6, 2.5, 'square')
    expect(volume).toBe(90)
  })
})

describe('calculateTierVolumeMl', () => {
  // These are the known good values from seed-costing-defaults.mjs
  // If these change, it's a REGRESSION

  it('calculates 6 inch round tier volume correctly', () => {
    const volume = calculateTierVolumeMl(6, 'round')
    expect(volume).toBe(3475)
  })

  it('calculates 8 inch round tier volume correctly', () => {
    const volume = calculateTierVolumeMl(8, 'round')
    expect(volume).toBe(6178)
  })

  it('calculates 10 inch round tier volume correctly', () => {
    const volume = calculateTierVolumeMl(10, 'round')
    expect(volume).toBe(9653)
  })

  it('calculates 12 inch round tier volume correctly', () => {
    const volume = calculateTierVolumeMl(12, 'round')
    expect(volume).toBe(13900)
  })

  it('calculates 10 inch square tier volume correctly', () => {
    const volume = calculateTierVolumeMl(10, 'square')
    expect(volume).toBe(12290)
  })

  it('uses tier structure: 3 layers × 2.5 inches', () => {
    // Verify the formula: π × r² × (3 × 2.5) × 16.387 ml/cubic inch
    // For 6" round: π × 9 × 7.5 × 16.387 = 3475 ml
    const sixInchVolume = calculateTierVolumeMl(6, 'round')

    // Manual calculation
    const radius = 3
    const totalHeight = 3 * 2.5 // 7.5 inches
    const cubicInches = Math.PI * radius * radius * totalHeight
    const expectedMl = Math.round(cubicInches * 16.387)

    expect(sixInchVolume).toBe(expectedMl)
  })
})

describe('getAssemblyMinutes', () => {
  it('returns correct assembly time for known sizes', () => {
    expect(getAssemblyMinutes(6)).toBe(15)
    expect(getAssemblyMinutes(8)).toBe(20)
    expect(getAssemblyMinutes(10)).toBe(25)
    expect(getAssemblyMinutes(12)).toBe(30)
    expect(getAssemblyMinutes(14)).toBe(35)
  })

  it('returns default for unknown sizes', () => {
    expect(getAssemblyMinutes(7)).toBe(20) // Not in lookup, uses default
    expect(getAssemblyMinutes(16)).toBe(20)
  })
})

describe('calculateTierSurfaceArea', () => {
  it('calculates round tier surface area correctly', () => {
    // 6" diameter, 6" height
    const { topArea, sideArea, totalArea } = calculateTierSurfaceArea(6, 6, 'round')

    // Top: π × 3² = 28.27 sq inches
    expect(topArea).toBeCloseTo(28.27, 1)

    // Side: π × 6 × 6 = 113.1 sq inches
    expect(sideArea).toBeCloseTo(113.1, 1)

    // Total: 28.27 + 113.1 = 141.37
    expect(totalArea).toBeCloseTo(141.37, 1)
  })

  it('calculates square tier surface area correctly', () => {
    // 6" × 6" × 6" height
    const { topArea, sideArea, totalArea } = calculateTierSurfaceArea(6, 6, 'square')

    // Top: 6 × 6 = 36 sq inches
    expect(topArea).toBe(36)

    // Side: 4 × 6 × 6 = 144 sq inches
    expect(sideArea).toBe(144)

    // Total: 36 + 144 = 180
    expect(totalArea).toBe(180)
  })
})

describe('calculateBatterForTier', () => {
  it('calculates batter needed for 6 inch round tier', () => {
    const result = calculateBatterForTier(6, PRODUCTION_DEFAULTS, 'round')

    expect(result.layers).toBe(3)
    expect(result.grams).toBeGreaterThan(0)
    expect(result.ounces).toBeGreaterThan(0)
  })

  it('returns correct layer count', () => {
    const result = calculateBatterForTier(8, PRODUCTION_DEFAULTS, 'round')
    expect(result.layers).toBe(PRODUCTION_DEFAULTS.layersPerTier)
  })

  it('larger tiers need more batter', () => {
    const small = calculateBatterForTier(6, PRODUCTION_DEFAULTS, 'round')
    const medium = calculateBatterForTier(8, PRODUCTION_DEFAULTS, 'round')
    const large = calculateBatterForTier(10, PRODUCTION_DEFAULTS, 'round')

    expect(medium.grams).toBeGreaterThan(small.grams)
    expect(large.grams).toBeGreaterThan(medium.grams)
  })
})

describe('calculateButtercreamForTier', () => {
  it('calculates buttercream needed for 6 inch round tier', () => {
    const result = calculateButtercreamForTier(6, PRODUCTION_DEFAULTS, 'round')

    expect(result.internalGrams).toBeGreaterThan(0)
    expect(result.crumbCoatGrams).toBeGreaterThan(0)
    expect(result.totalGrams).toBe(result.internalGrams + result.crumbCoatGrams)
  })

  it('internal buttercream scales with tier size', () => {
    const small = calculateButtercreamForTier(6, PRODUCTION_DEFAULTS, 'round')
    const large = calculateButtercreamForTier(12, PRODUCTION_DEFAULTS, 'round')

    // 12" is 2x diameter of 6", so area is 4x, so internal BC should be ~4x
    expect(large.internalGrams).toBeGreaterThan(small.internalGrams * 3)
  })

  it('complexity affects crumb coat amount', () => {
    const light = calculateButtercreamForTier(8, PRODUCTION_DEFAULTS, 'round', 1)
    const heavy = calculateButtercreamForTier(8, PRODUCTION_DEFAULTS, 'round', 3)

    // Heavy complexity should use more buttercream
    expect(heavy.crumbCoatGrams).toBeGreaterThan(light.crumbCoatGrams)
  })
})

describe('calculateSurfaceAreaCm', () => {
  it('calculates round cake surface area in cm', () => {
    // 20cm diameter (8"), 10cm height
    const area = calculateSurfaceAreaCm(20, 10, null, null)

    // Top: π × 10² = 314.16 sq cm
    // Side: π × 20 × 10 = 628.32 sq cm
    // Total: 942.48 sq cm
    expect(area).toBeCloseTo(942.48, 0)
  })

  it('calculates rectangular cake surface area in cm', () => {
    // 30cm × 20cm × 10cm height
    const area = calculateSurfaceAreaCm(null, 10, 30, 20)

    // Top: 30 × 20 = 600 sq cm
    // Side: 2 × (30 + 20) × 10 = 1000 sq cm
    // Total: 1600 sq cm
    expect(area).toBe(1600)
  })

  it('returns 0 when height is missing', () => {
    expect(calculateSurfaceAreaCm(20, null, null, null)).toBe(0)
  })

  it('returns 0 when no dimensions provided', () => {
    expect(calculateSurfaceAreaCm(null, 10, null, null)).toBe(0)
  })
})

describe('calculateFrostableSurfaceArea', () => {
  it('calculates total frostable area including internal layers', () => {
    // 6" diameter, 4" height, 3 cake layers
    const result = calculateFrostableSurfaceArea(6, 4, 'round', 3)

    // Top: π × 3² = 28.27 sq inches
    expect(result.topArea).toBeCloseTo(28.27, 1)

    // Side: π × 6 × 4 = 75.4 sq inches
    expect(result.sideArea).toBeCloseTo(75.4, 1)

    // External: top + side = ~103.67 sq inches
    expect(result.externalArea).toBeCloseTo(103.67, 0)

    // Internal: 2 filling layers × topArea = 2 × 28.27 = 56.55 sq inches
    expect(result.internalArea).toBeCloseTo(56.55, 0)

    // Total frostable: external + internal = ~160 sq inches
    expect(result.totalFrostableArea).toBeCloseTo(160, 0)
  })

  it('uses default layers from PRODUCTION_DEFAULTS', () => {
    const result = calculateFrostableSurfaceArea(8, 4, 'round')

    // Should use 3 layers by default, so 2 internal filling layers
    const expectedInternalArea = 2 * (Math.PI * 16) // 2 × π × 4²
    expect(result.internalArea).toBeCloseTo(expectedInternalArea, 1)
  })

  it('handles square tiers', () => {
    const result = calculateFrostableSurfaceArea(6, 4, 'square', 3)

    // Top: 6 × 6 = 36 sq inches
    expect(result.topArea).toBe(36)

    // Side: 4 × 6 × 4 = 96 sq inches
    expect(result.sideArea).toBe(96)

    // Internal: 2 × 36 = 72 sq inches
    expect(result.internalArea).toBe(72)
  })
})

describe('estimateButtercreamOunces', () => {
  it('calculates buttercream estimate for standard 8" tier', () => {
    // 8" diameter, 4" height, complexity 2, 3 layers
    const oz = estimateButtercreamOunces(8, 4, 2, 3)

    // Should be a reasonable amount (roughly 10-30 oz for 8" tier)
    expect(oz).toBeGreaterThan(10)
    expect(oz).toBeLessThan(50)
  })

  it('complexity multiplier affects outside frosting', () => {
    const light = estimateButtercreamOunces(8, 4, 1, 3)
    const medium = estimateButtercreamOunces(8, 4, 2, 3)
    const heavy = estimateButtercreamOunces(8, 4, 3, 3)

    expect(medium).toBeGreaterThan(light)
    expect(heavy).toBeGreaterThan(medium)
  })

  it('larger tiers need more buttercream', () => {
    const small = estimateButtercreamOunces(6, 4, 2, 3)
    const medium = estimateButtercreamOunces(8, 4, 2, 3)
    const large = estimateButtercreamOunces(10, 4, 2, 3)

    expect(medium).toBeGreaterThan(small)
    expect(large).toBeGreaterThan(medium)
  })

  it('uses default height and complexity', () => {
    const oz = estimateButtercreamOunces(8)
    // Should work with just diameter
    expect(oz).toBeGreaterThan(0)
  })

  // REGRESSION: Match values from batch route calculations
  it('matches legacy batch route calculations for 8" tier', () => {
    // This test ensures the new centralized function produces
    // the same values as the previous duplicated code in batches/route.ts
    const oz = estimateButtercreamOunces(8, 4, 2, 3)

    // Calculate expected value using old formula:
    // Outside area: π × 4² + π × 8 × 4 = 50.27 + 100.53 = 150.8 sq in
    // Internal area: 2 × π × 4² = 100.53 sq in
    // Outside oz: 150.8 × (1/8) × 2 = 37.7 oz
    // Filling oz: 100.53 × (0.5/8) = 6.28 oz
    // Total: 43.98, rounds to 44.0
    expect(oz).toBe(44)
  })
})

// Regression tests with known good values
describe('Regression Tests', () => {
  describe('Tier Volume Calculations - KNOWN GOOD VALUES', () => {
    // These values were verified and seeded to the database
    // If any test fails, it means a calculation changed unexpectedly

    const knownGoodValues = [
      { size: 6, shape: 'round' as const, expectedMl: 3475 },
      { size: 8, shape: 'round' as const, expectedMl: 6178 },
      { size: 10, shape: 'round' as const, expectedMl: 9653 },
      { size: 12, shape: 'round' as const, expectedMl: 13900 },
      { size: 10, shape: 'square' as const, expectedMl: 12290 },
    ]

    knownGoodValues.forEach(({ size, shape, expectedMl }) => {
      it(`${size}" ${shape} tier = ${expectedMl}ml`, () => {
        const calculated = calculateTierVolumeMl(size, shape)
        expect(calculated).toBe(expectedMl)
      })
    })
  })

  describe('Assembly Times - KNOWN GOOD VALUES', () => {
    const knownGoodValues = [
      { size: 6, expectedMinutes: 15 },
      { size: 8, expectedMinutes: 20 },
      { size: 10, expectedMinutes: 25 },
      { size: 12, expectedMinutes: 30 },
      { size: 14, expectedMinutes: 35 },
    ]

    knownGoodValues.forEach(({ size, expectedMinutes }) => {
      it(`${size}" tier = ${expectedMinutes} minutes`, () => {
        const calculated = getAssemblyMinutes(size)
        expect(calculated).toBe(expectedMinutes)
      })
    })
  })
})
