# Avoiding Regressions: Single Source of Truth Strategy

## The Problem

When calculations are duplicated across multiple files, changing how something is calculated requires updating many places. This leads to:
- **Regressions**: Some places get updated, others don't
- **Inconsistency**: Different parts of the app calculate things differently
- **Maintenance burden**: Every change requires hunting down all instances
- **Bugs**: Easy to miss a calculation when refactoring

## Solution: Single Source of Truth Pattern

### 1. Centralize All Calculations

**✅ DO: Create a centralized calculation module**

```
lib/
  ├── costing.ts          # All cost calculations
  ├── pricing.ts           # All pricing calculations  
  ├── discounts.ts         # All discount calculations
  └── calculations.ts      # Shared calculation utilities
```

**❌ DON'T: Duplicate calculations in components or API routes**

```typescript
// ❌ BAD: Calculation in component
function QuoteDisplay({ quote }) {
  const finalPrice = quote.totalCost * (1 + quote.markupPercent) - quote.discountAmount
  return <div>${finalPrice}</div>
}

// ✅ GOOD: Use centralized function
import { calculateFinalPrice } from '@/lib/pricing'
function QuoteDisplay({ quote }) {
  const finalPrice = calculateFinalPrice(quote)
  return <div>${finalPrice}</div>
}
```

### 2. Export Pure Functions

All calculation functions should be:
- **Pure**: Same inputs → same outputs
- **Testable**: Easy to unit test
- **Documented**: Clear JSDoc comments
- **Type-safe**: Strong TypeScript types

```typescript
/**
 * Calculate final price after markup and discount
 * 
 * @param totalCost - Base cost before markup
 * @param markupPercent - Markup percentage (e.g., 0.7 for 70%)
 * @param discountAmount - Discount amount in dollars
 * @returns Final price rounded to 2 decimal places
 */
export function calculateFinalPrice(
  totalCost: number,
  markupPercent: number,
  discountAmount: number = 0
): number {
  const suggestedPrice = totalCost * (1 + markupPercent)
  const finalPrice = suggestedPrice - discountAmount
  return Math.round(finalPrice * 100) / 100
}
```

### 3. Use TypeScript Interfaces for Data Structures

Define shared interfaces so calculations work with consistent data:

```typescript
// lib/types.ts
export interface CostBreakdown {
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  totalLaborCost: number
  totalCost: number
}

export interface PricingInput {
  costBreakdown: CostBreakdown
  markupPercent: number
  discountType?: 'PERCENT' | 'FIXED'
  discountValue?: number
}
```

### 4. Create Calculation Utilities

Break down complex calculations into smaller, reusable functions:

```typescript
// lib/calculations.ts

/**
 * Calculate markup amount
 */
export function calculateMarkup(cost: number, markupPercent: number): number {
  return cost * markupPercent
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(
  price: number,
  discountType: 'PERCENT' | 'FIXED',
  discountValue: number
): number {
  if (discountType === 'PERCENT') {
    return price * (discountValue / 100)
  }
  return discountValue
}

/**
 * Round to 2 decimal places (for currency)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}
```

## Refactoring Strategy

### Step 1: Audit Existing Code

Find all places where calculations are duplicated:

```bash
# Search for calculation patterns
grep -r "totalCost \*" app/
grep -r "markupPercent" app/
grep -r "suggestedPrice" app/
grep -r "finalPrice" app/
```

### Step 2: Extract to Centralized Functions

1. **Identify the calculation pattern**
2. **Create a pure function** in `lib/`
3. **Add comprehensive tests**
4. **Update all call sites** to use the new function
5. **Remove old duplicated code**

### Step 3: Use Find-and-Replace Strategically

```typescript
// Before (duplicated in 5 files)
const finalPrice = totalCost * (1 + markupPercent) - discountAmount

// After (single source)
import { calculateFinalPrice } from '@/lib/pricing'
const finalPrice = calculateFinalPrice(totalCost, markupPercent, discountAmount)
```

### Step 4: Verify with Tests

After refactoring, run tests to ensure nothing broke:

```typescript
// lib/__tests__/pricing.test.ts
import { calculateFinalPrice } from '../pricing'

describe('calculateFinalPrice', () => {
  it('calculates correctly with markup and discount', () => {
    const result = calculateFinalPrice(100, 0.7, 10)
    expect(result).toBe(160) // 100 * 1.7 - 10
  })
  
  it('handles zero discount', () => {
    const result = calculateFinalPrice(100, 0.7, 0)
    expect(result).toBe(170)
  })
})
```

## Testing Strategy

### 1. Unit Tests for All Calculations

Every calculation function should have comprehensive unit tests:

```typescript
// lib/__tests__/costing.test.ts
import { calculateOrderCosting } from '../costing'

describe('calculateOrderCosting', () => {
  it('calculates ingredient costs correctly', () => {
    // Test with known inputs
  })
  
  it('handles missing optional fields', () => {
    // Test edge cases
  })
  
  it('matches expected business rules', () => {
    // Test against business requirements
  })
})
```

### 2. Integration Tests

Test that calculations work end-to-end:

```typescript
// __tests__/integration/costing.test.ts
describe('Costing Integration', () => {
  it('quote calculation matches order calculation', async () => {
    const quoteData = { /* ... */ }
    const quoteCost = await calculateQuoteCost(quoteData)
    
    const order = await createOrderFromQuote(quoteData)
    const orderCost = await calculateOrderCosting(order.id)
    
    expect(quoteCost.finalPrice).toBe(orderCost.finalPrice)
  })
})
```

### 3. Snapshot Tests for Complex Calculations

For complex calculations, use snapshots to catch unexpected changes:

```typescript
it('calculates costing breakdown correctly', () => {
  const result = calculateOrderCosting(orderId)
  expect(result).toMatchSnapshot()
})
```

### 4. Regression Tests

Create tests that verify calculations don't change unexpectedly:

```typescript
describe('Regression Tests', () => {
  it('maintains pricing consistency across refactors', () => {
    // Known good values from production
    const knownGood = {
      totalCost: 150.00,
      markupPercent: 0.7,
      discountAmount: 10.00,
      expectedFinalPrice: 245.00
    }
    
    const result = calculateFinalPrice(
      knownGood.totalCost,
      knownGood.markupPercent,
      knownGood.discountAmount
    )
    
    expect(result).toBe(knownGood.expectedFinalPrice)
  })
})
```

## Code Organization Patterns

### Pattern 1: Calculation Modules by Domain

```
lib/
  ├── costing/
  │   ├── index.ts              # Main exports
  │   ├── order-costing.ts      # Order-specific calculations
  │   ├── quote-costing.ts      # Quote-specific calculations
  │   ├── ingredients.ts        # Ingredient cost calculations
  │   ├── decorations.ts         # Decoration cost calculations
  │   └── labor.ts              # Labor cost calculations
  ├── pricing/
  │   ├── index.ts
  │   ├── markup.ts             # Markup calculations
  │   ├── discounts.ts          # Discount calculations
  │   └── final-price.ts        # Final price calculations
  └── shared/
      ├── rounding.ts           # Rounding utilities
      └── validation.ts          # Input validation
```

### Pattern 2: Single Calculation File with Sections

```typescript
// lib/costing.ts

// ============================================================================
// Types & Interfaces
// ============================================================================
export interface CostingResult { /* ... */ }

// ============================================================================
// Helper Functions (Private)
// ============================================================================
function calculateMultiplier(...) { /* ... */ }

// ============================================================================
// Public Calculation Functions
// ============================================================================
export async function calculateOrderCosting(...) { /* ... */ }
export async function calculateQuoteCost(...) { /* ... */ }
```

## Tools & Techniques

### 1. TypeScript Strict Mode

Enable strict TypeScript to catch calculation errors:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. ESLint Rules

Add ESLint rules to prevent calculation duplication:

```json
// .eslintrc.json
{
  "rules": {
    "no-magic-numbers": ["warn", {
      "ignore": [0, 1, 100] // Common in calculations
    }]
  }
}
```

### 3. Pre-commit Hooks

Use pre-commit hooks to run tests before commits:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test && npm run lint"
    }
  }
}
```

### 4. Code Search Tools

Use tools to find duplicated calculations:

```bash
# Find all places calculating final price
rg "finalPrice.*=" --type ts

# Find all markup calculations
rg "markupPercent.*\*" --type ts

# Find all discount calculations
rg "discount.*-" --type ts
```

## Best Practices

### ✅ DO

1. **Always use centralized calculation functions**
2. **Write tests before refactoring**
3. **Document calculation formulas** in code comments
4. **Use descriptive function names** (`calculateFinalPrice` not `calc`)
5. **Validate inputs** before calculations
6. **Round currency values** consistently
7. **Handle edge cases** (zero, negative, null values)

### ❌ DON'T

1. **Don't duplicate calculations** in components
2. **Don't hardcode formulas** in multiple places
3. **Don't skip tests** when refactoring
4. **Don't use magic numbers** without constants
5. **Don't mix calculation logic** with UI logic
6. **Don't assume calculations** are correct without testing

## Migration Checklist

When refactoring calculations:

- [ ] Identify all places using the calculation
- [ ] Create centralized calculation function
- [ ] Write comprehensive unit tests
- [ ] Update all call sites
- [ ] Remove old duplicated code
- [ ] Run full test suite
- [ ] Verify with integration tests
- [ ] Update documentation
- [ ] Review with team

## Example: Refactoring Markup Calculation

### Before (Duplicated in 3 files)

```typescript
// app/quotes/new/page.tsx
const suggestedPrice = totalCost * (1 + markupPercent)

// app/orders/[id]/page.tsx  
const suggestedPrice = totalCost * (1 + markupPercent)

// app/api/quotes/route.ts
const suggestedPrice = totalCost * (1 + markupPercent)
```

### After (Single Source of Truth)

```typescript
// lib/pricing.ts
export function calculateSuggestedPrice(
  totalCost: number,
  markupPercent: number
): number {
  return Math.round(totalCost * (1 + markupPercent) * 100) / 100
}

// app/quotes/new/page.tsx
import { calculateSuggestedPrice } from '@/lib/pricing'
const suggestedPrice = calculateSuggestedPrice(totalCost, markupPercent)

// app/orders/[id]/page.tsx
import { calculateSuggestedPrice } from '@/lib/pricing'
const suggestedPrice = calculateSuggestedPrice(totalCost, markupPercent)

// app/api/quotes/route.ts
import { calculateSuggestedPrice } from '@/lib/pricing'
const suggestedPrice = calculateSuggestedPrice(totalCost, markupPercent)
```

## Monitoring & Validation

### 1. Add Calculation Logging

Log calculations in development to catch inconsistencies:

```typescript
export function calculateFinalPrice(...) {
  const result = /* calculation */
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Pricing]', {
      inputs: { totalCost, markupPercent, discountAmount },
      result
    })
  }
  
  return result
}
```

### 2. Add Calculation Validation

Validate calculations match expected business rules:

```typescript
export function calculateFinalPrice(...) {
  const result = /* calculation */
  
  // Validation: final price should never be negative
  if (result < 0) {
    throw new Error('Final price cannot be negative')
  }
  
  // Validation: final price should be >= cost
  if (result < totalCost && discountAmount === 0) {
    console.warn('Final price is less than cost without discount')
  }
  
  return result
}
```

### 3. Add Calculation Metrics

Track calculation usage to identify patterns:

```typescript
// Track which calculations are used most
export function calculateFinalPrice(...) {
  // ... calculation ...
  
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track('calculation.final_price', {
      totalCost,
      markupPercent,
      discountAmount,
      result
    })
  }
  
  return result
}
```

## Summary

**Key Principles:**

1. **Single Source of Truth**: Every calculation lives in one place
2. **Pure Functions**: Calculations are predictable and testable
3. **Comprehensive Testing**: Catch regressions before they happen
4. **Type Safety**: TypeScript prevents calculation errors
5. **Documentation**: Clear comments explain calculation logic

**When changing a calculation:**

1. Update the centralized function
2. Run all tests
3. Verify integration tests pass
4. Check for any remaining duplicated code
5. Update documentation

This approach ensures that when you change how something is calculated, the change automatically propagates throughout your entire codebase.
