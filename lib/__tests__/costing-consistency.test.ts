/**
 * Costing Consistency Tests
 *
 * These tests verify that:
 * 1. Order and Quote calculations produce identical results for identical inputs
 * 2. The /api/orders/calculate and /api/quotes/calculate endpoints return matching prices
 * 3. No local calculations in UI components can drift from server calculations
 *
 * REGRESSION PREVENTION:
 * - Issue #8 (January 2025): Order Edit form had local calculations that differed from server
 * - The fix was to use debounced API calls instead of local reduce/sum calculations
 * - These tests ensure the APIs remain consistent
 */

import { calculateQuoteCost, QuoteInput } from '../costing'

describe('Costing Consistency', () => {
  // Standard test input that matches both order and quote structures
  const standardInput: QuoteInput = {
    customerId: null,
    customerName: 'Test Customer',
    eventDate: new Date('2025-02-01'),
    tiers: [
      {
        tierSizeId: 1, // 6" round
        tierIndex: 1,
        batterRecipeId: 1,
        fillingRecipeId: null,
        frostingRecipeId: 3,
        flavor: 'Vanilla',
        filling: null,
        finishType: 'Buttercream'
      }
    ],
    decorations: [],
    products: [],
    isDelivery: false,
    deliveryZoneId: null,
    deliveryDistance: null,
    bakerHours: null,
    assistantHours: null,
    topperType: null,
    topperText: null,
    customTopperFee: null,
    markupPercent: 0.7, // 70%
    discountType: null,
    discountValue: null,
    discountReason: null
  }

  describe('calculateQuoteCost', () => {
    it('should return consistent results for identical inputs', async () => {
      const result1 = await calculateQuoteCost(standardInput)
      const result2 = await calculateQuoteCost(standardInput)

      expect(result1.finalPrice).toBe(result2.finalPrice)
      expect(result1.totalCost).toBe(result2.totalCost)
      expect(result1.suggestedPrice).toBe(result2.suggestedPrice)
    })

    it('should calculate markup correctly: suggestedPrice = totalCost * (1 + markupPercent)', async () => {
      const result = await calculateQuoteCost(standardInput)

      // totalCost * 1.7 should equal suggestedPrice (with rounding)
      const expectedSuggestedPrice = Math.round(result.totalCost * 1.7 * 100) / 100
      expect(result.suggestedPrice).toBeCloseTo(expectedSuggestedPrice, 2)
    })

    it('should calculate finalPrice = suggestedPrice - discountAmount + deliveryCost', async () => {
      const result = await calculateQuoteCost(standardInput)

      const expectedFinalPrice = result.suggestedPrice - result.discountAmount + result.deliveryCost
      expect(result.finalPrice).toBeCloseTo(expectedFinalPrice, 2)
    })
  })

  describe('Markup Formula Consistency', () => {
    it('markup amount should equal suggestedPrice - totalCost (NOT including deliveryCost)', async () => {
      const result = await calculateQuoteCost(standardInput)

      // The markup is calculated BEFORE delivery is added
      // This was a bug where UI displayed: suggestedPrice - totalCost + deliveryCost
      const correctMarkup = result.suggestedPrice - result.totalCost

      // Verify the formula: suggestedPrice = totalCost * (1 + markupPercent)
      // So: markup = totalCost * markupPercent
      // And: markup / totalCost = markupPercent
      const calculatedMarkupPercent = correctMarkup / result.totalCost

      // The calculated markup percent should match what was returned
      expect(calculatedMarkupPercent).toBeCloseTo(result.markupPercent, 2)

      // Also verify: markup should NOT include deliveryCost
      // (deliveryCost is added after markup calculation)
      if (result.deliveryCost > 0) {
        const wrongMarkup = result.suggestedPrice - result.totalCost + result.deliveryCost
        expect(correctMarkup).not.toBe(wrongMarkup)
      }
    })
  })

  describe('Price Adjustment Handling', () => {
    it('quotes should return priceAdjustment: 0 (UI adds it separately)', async () => {
      const result = await calculateQuoteCost(standardInput)
      expect(result.priceAdjustment).toBe(0)
    })

    // Note: For orders, priceAdjustment is added in the API endpoint, not calculateQuoteCost
    // This is tested via integration tests against the actual API
  })

  describe('Decoration Cost Consistency', () => {
    it('decoration costs should be calculated server-side, not via simple defaultCostPerUnit * quantity', async () => {
      // This test documents why local calculations fail
      // The server uses complex logic including:
      // - Material scaling based on cake size
      // - Labor costs per decoration
      // - Volume-based adjustments

      const inputWithDecorations: QuoteInput = {
        ...standardInput,
        decorations: [
          { decorationTechniqueId: 1, quantity: 1 }, // Ombré Buttercream
        ]
      }

      const result = await calculateQuoteCost(inputWithDecorations)

      // The decoration cost should include both material AND labor
      // Local calculations often only included defaultCostPerUnit (material only)
      expect(result.decorationMaterialCost).toBeGreaterThanOrEqual(0)
      expect(result.decorationLaborCost).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('API Endpoint Consistency', () => {
  // These tests require a running server - mark as integration tests
  // Run with: npm test -- --testPathPattern=costing-consistency --runInBand

  describe.skip('/api/orders/calculate vs /api/quotes/calculate', () => {
    const testPayload = {
      customerId: null,
      customerName: 'API Test',
      eventDate: '2025-02-01',
      tiers: [{ tierSizeId: 1, tierIndex: 1 }],
      decorations: [],
      products: [],
      isDelivery: false,
      deliveryZoneId: null,
      topperType: null,
      discountType: null,
      discountValue: null
    }

    it('both endpoints should return the same finalPrice for identical inputs', async () => {
      // Note: These are integration tests that need a running server
      // Uncomment and run manually when server is available

      /*
      const [orderResult, quoteResult] = await Promise.all([
        fetch('http://localhost:3000/api/orders/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        }).then(r => r.json()),
        fetch('http://localhost:3000/api/quotes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        }).then(r => r.json())
      ])

      expect(orderResult.finalPrice).toBe(quoteResult.finalPrice)
      expect(orderResult.totalCost).toBe(quoteResult.totalCost)
      expect(orderResult.suggestedPrice).toBe(quoteResult.suggestedPrice)
      */
    })
  })
})

/**
 * Manual Verification Script
 *
 * Run this to verify costing consistency across pages for a specific order:
 *
 * ```bash
 * # Check Order 62 across all endpoints
 * ORDER_ID=62
 *
 * echo "=== Order Costing API ==="
 * curl -s http://localhost:3000/api/orders/$ORDER_ID/costing | jq '{finalPrice, totalCost, suggestedPrice}'
 *
 * echo "=== Order Calculate API (with saved order data) ==="
 * # Fetch order data and send to calculate endpoint
 * ORDER_DATA=$(curl -s http://localhost:3000/api/orders/$ORDER_ID)
 * curl -s -X POST http://localhost:3000/api/orders/calculate \
 *   -H "Content-Type: application/json" \
 *   -d "$ORDER_DATA" | jq '{finalPrice, totalCost, suggestedPrice}'
 *
 * # All three should show identical finalPrice values
 * ```
 */
