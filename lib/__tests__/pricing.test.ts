/**
 * Tests for pricing.ts
 *
 * These tests ensure pricing calculations are correct and consistent.
 * The pricing module is the single source of truth for all price calculations.
 */

import {
  roundCurrency,
  calculateMarkup,
  calculateSuggestedPrice,
  calculateDiscountAmount,
  calculatePricing,
  calculatePricePerServing,
  adjustSuggestedPrice,
  RECIPE_VOLUME_FACTORS,
  calculateRecipeMultiplier,
  calculateDecorationScaleFactor,
} from '../pricing'

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.555)).toBe(10.56)
    expect(roundCurrency(10.554)).toBe(10.55)
    expect(roundCurrency(10.5)).toBe(10.5)
    expect(roundCurrency(10)).toBe(10)
  })

  it('handles negative numbers', () => {
    expect(roundCurrency(-10.555)).toBe(-10.55) // JavaScript rounds towards zero
  })

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0)
  })
})

describe('calculateMarkup', () => {
  it('calculates 70% markup correctly', () => {
    expect(calculateMarkup(100, 0.7)).toBe(70)
  })

  it('calculates 50% markup correctly', () => {
    expect(calculateMarkup(100, 0.5)).toBe(50)
  })

  it('handles zero markup', () => {
    expect(calculateMarkup(100, 0)).toBe(0)
  })

  it('handles zero cost', () => {
    expect(calculateMarkup(0, 0.7)).toBe(0)
  })
})

describe('calculateSuggestedPrice', () => {
  it('calculates price with 70% markup', () => {
    expect(calculateSuggestedPrice(100, 0.7)).toBe(170)
  })

  it('calculates price with 50% markup', () => {
    expect(calculateSuggestedPrice(100, 0.5)).toBe(150)
  })

  it('handles zero markup', () => {
    expect(calculateSuggestedPrice(100, 0)).toBe(100)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateSuggestedPrice(33.33, 0.7)).toBe(56.66)
  })
})

describe('calculateDiscountAmount', () => {
  describe('percent discount', () => {
    it('calculates 10% discount', () => {
      expect(calculateDiscountAmount(170, 'PERCENT', 10)).toBe(17)
    })

    it('calculates 20% discount', () => {
      expect(calculateDiscountAmount(100, 'PERCENT', 20)).toBe(20)
    })

    it('rounds to 2 decimal places', () => {
      expect(calculateDiscountAmount(100, 'PERCENT', 33)).toBe(33)
    })
  })

  describe('fixed discount', () => {
    it('returns the fixed amount', () => {
      expect(calculateDiscountAmount(170, 'FIXED', 20)).toBe(20)
    })

    it('works regardless of price', () => {
      expect(calculateDiscountAmount(50, 'FIXED', 20)).toBe(20)
      expect(calculateDiscountAmount(500, 'FIXED', 20)).toBe(20)
    })
  })

  describe('no discount', () => {
    it('returns 0 when type is null', () => {
      expect(calculateDiscountAmount(170, null, 10)).toBe(0)
    })

    it('returns 0 when value is null', () => {
      expect(calculateDiscountAmount(170, 'PERCENT', null)).toBe(0)
    })

    it('returns 0 when both are null', () => {
      expect(calculateDiscountAmount(170, null, null)).toBe(0)
    })
  })
})

describe('calculatePricing', () => {
  it('calculates complete pricing with markup only', () => {
    const result = calculatePricing(100, 0.7)

    expect(result.suggestedPrice).toBe(170)
    expect(result.markupAmount).toBe(70)
    expect(result.discountAmount).toBe(0)
    expect(result.finalPrice).toBe(170)
  })

  it('calculates pricing with percent discount', () => {
    const result = calculatePricing(100, 0.7, 'PERCENT', 10)

    expect(result.suggestedPrice).toBe(170)
    expect(result.discountAmount).toBe(17)
    expect(result.finalPrice).toBe(153) // 170 - 17
  })

  it('calculates pricing with fixed discount', () => {
    const result = calculatePricing(100, 0.7, 'FIXED', 20)

    expect(result.suggestedPrice).toBe(170)
    expect(result.discountAmount).toBe(20)
    expect(result.finalPrice).toBe(150) // 170 - 20
  })

  it('adds delivery to final price (not suggested)', () => {
    const result = calculatePricing(100, 0.7, null, null, 25)

    expect(result.suggestedPrice).toBe(170)
    expect(result.finalPrice).toBe(195) // 170 + 25
  })

  it('combines markup, discount, and delivery', () => {
    const result = calculatePricing(100, 0.7, 'FIXED', 10, 25)

    expect(result.suggestedPrice).toBe(170)
    expect(result.discountAmount).toBe(10)
    expect(result.finalPrice).toBe(185) // 170 - 10 + 25
  })
})

describe('calculatePricePerServing', () => {
  it('calculates price per serving', () => {
    expect(calculatePricePerServing(100, 10)).toBe(10)
    expect(calculatePricePerServing(170, 12)).toBe(14.17)
  })

  it('returns 0 for zero servings', () => {
    expect(calculatePricePerServing(100, 0)).toBe(0)
  })

  it('returns 0 for negative servings', () => {
    expect(calculatePricePerServing(100, -5)).toBe(0)
  })
})

describe('adjustSuggestedPrice', () => {
  it('increases price when cost increases', () => {
    // Current price $170 (from $100 cost + 70% markup)
    // Cost increases by $10, new suggested should be $170 + $10 * 1.7 = $187
    expect(adjustSuggestedPrice(170, 10, 0.7)).toBe(187)
  })

  it('decreases price when cost decreases', () => {
    // Cost decreases by $10, price should decrease by $10 * 1.7 = $17
    expect(adjustSuggestedPrice(170, -10, 0.7)).toBe(153)
  })

  it('no change when cost difference is zero', () => {
    expect(adjustSuggestedPrice(170, 0, 0.7)).toBe(170)
  })
})

describe('RECIPE_VOLUME_FACTORS', () => {
  it('has correct factors', () => {
    expect(RECIPE_VOLUME_FACTORS.BATTER).toBe(1.0)
    expect(RECIPE_VOLUME_FACTORS.FROSTING).toBe(0.36)
    expect(RECIPE_VOLUME_FACTORS.FILLING).toBe(0.12)
  })
})

describe('calculateRecipeMultiplier', () => {
  describe('BATTER (100% of tier volume)', () => {
    it('calculates multiplier when tier is larger than recipe yield', () => {
      // Recipe yields 1500ml, tier needs 3475ml (6" tier)
      // Multiplier = 3475 / 1500 = 2.32
      expect(calculateRecipeMultiplier(1500, 3475, 'BATTER')).toBe(2.32)
    })

    it('calculates multiplier when tier is smaller than recipe yield', () => {
      // Recipe yields 5000ml, tier needs 3475ml
      // Multiplier = 3475 / 5000 = 0.695, rounds to 0.70
      expect(calculateRecipeMultiplier(5000, 3475, 'BATTER')).toBe(0.70)
    })
  })

  describe('FROSTING (36% of tier volume)', () => {
    it('calculates multiplier for frosting', () => {
      // Recipe yields 900ml, tier is 3475ml
      // Needed = 3475 * 0.36 = 1251ml
      // Multiplier = 1251 / 900 = 1.39
      expect(calculateRecipeMultiplier(900, 3475, 'FROSTING')).toBe(1.39)
    })
  })

  describe('FILLING (12% of tier volume)', () => {
    it('calculates multiplier for filling', () => {
      // Recipe yields 500ml, tier is 3475ml
      // Needed = 3475 * 0.12 = 417ml
      // Multiplier = 417 / 500 = 0.83
      expect(calculateRecipeMultiplier(500, 3475, 'FILLING')).toBe(0.83)
    })
  })

  describe('fallback behavior', () => {
    it('returns 1.0 when recipe yield is null', () => {
      expect(calculateRecipeMultiplier(null, 3475, 'BATTER')).toBe(1.0)
    })

    it('returns 1.0 when tier volume is null', () => {
      expect(calculateRecipeMultiplier(1500, null, 'BATTER')).toBe(1.0)
    })

    it('returns 1.0 when both are null', () => {
      expect(calculateRecipeMultiplier(null, null, 'BATTER')).toBe(1.0)
    })
  })
})

describe('calculateDecorationScaleFactor', () => {
  it('returns 1.0 for same size (6" base, 6" tier)', () => {
    // 6" = 15.24cm
    expect(calculateDecorationScaleFactor(15.24, 6, 'Round')).toBe(1)
  })

  it('calculates scale for larger tier', () => {
    // 8" tier (20.32cm) vs 6" base
    // Area ratio = (8/6)² = 1.78
    expect(calculateDecorationScaleFactor(20.32, 6, 'Round')).toBe(1.78)
  })

  it('calculates scale for smaller tier', () => {
    // 6" tier (15.24cm) vs 8" base
    // Area ratio = (6/8)² = 0.56
    expect(calculateDecorationScaleFactor(15.24, 8, 'Round')).toBe(0.56)
  })

  it('handles square tiers', () => {
    // 10" square tier (25.4cm) vs 6" base
    // Area ratio = (10/6)² = 2.78
    expect(calculateDecorationScaleFactor(25.4, 6, 'Square')).toBe(2.78)
  })

  it('returns 1.0 when tier diameter is null', () => {
    expect(calculateDecorationScaleFactor(null, 6, 'Round')).toBe(1.0)
  })

  it('returns 1.0 when base size is 0', () => {
    expect(calculateDecorationScaleFactor(15.24, 0, 'Round')).toBe(1.0)
  })
})

// Regression tests with known good values
describe('Regression Tests', () => {
  describe('Pricing Calculations - KNOWN GOOD VALUES', () => {
    const testCases = [
      {
        description: 'Standard order: $100 cost, 70% markup, no discount',
        input: { cost: 100, markup: 0.7, discountType: null, discountValue: null, delivery: 0 },
        expected: { suggestedPrice: 170, finalPrice: 170, discountAmount: 0 },
      },
      {
        description: 'Order with 10% discount',
        input: { cost: 100, markup: 0.7, discountType: 'PERCENT' as const, discountValue: 10, delivery: 0 },
        expected: { suggestedPrice: 170, finalPrice: 153, discountAmount: 17 },
      },
      {
        description: 'Order with $25 fixed discount',
        input: { cost: 100, markup: 0.7, discountType: 'FIXED' as const, discountValue: 25, delivery: 0 },
        expected: { suggestedPrice: 170, finalPrice: 145, discountAmount: 25 },
      },
      {
        description: 'Order with delivery fee',
        input: { cost: 100, markup: 0.7, discountType: null, discountValue: null, delivery: 35 },
        expected: { suggestedPrice: 170, finalPrice: 205, discountAmount: 0 },
      },
      {
        description: 'Complex order: markup + discount + delivery',
        input: { cost: 150, markup: 0.7, discountType: 'PERCENT' as const, discountValue: 10, delivery: 40 },
        expected: { suggestedPrice: 255, finalPrice: 269.5, discountAmount: 25.5 },
      },
    ]

    testCases.forEach(({ description, input, expected }) => {
      it(description, () => {
        const result = calculatePricing(
          input.cost,
          input.markup,
          input.discountType,
          input.discountValue,
          input.delivery
        )

        expect(result.suggestedPrice).toBe(expected.suggestedPrice)
        expect(result.finalPrice).toBe(expected.finalPrice)
        expect(result.discountAmount).toBe(expected.discountAmount)
      })
    })
  })

  describe('Recipe Multiplier - KNOWN GOOD VALUES', () => {
    // Based on current tier volumes from production-settings
    const testCases = [
      {
        description: '6" tier batter (3475ml tier, 1500ml recipe)',
        input: { recipeYield: 1500, tierVolume: 3475, type: 'BATTER' as const },
        expected: 2.32,
      },
      {
        description: '8" tier batter (6178ml tier, 1500ml recipe)',
        input: { recipeYield: 1500, tierVolume: 6178, type: 'BATTER' as const },
        expected: 4.12,
      },
      {
        description: '6" tier frosting (3475ml tier, 900ml recipe)',
        input: { recipeYield: 900, tierVolume: 3475, type: 'FROSTING' as const },
        expected: 1.39,
      },
    ]

    testCases.forEach(({ description, input, expected }) => {
      it(description, () => {
        const result = calculateRecipeMultiplier(
          input.recipeYield,
          input.tierVolume,
          input.type
        )
        expect(result).toBe(expected)
      })
    })
  })
})
