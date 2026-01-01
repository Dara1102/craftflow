# Regression Assessment: Current State & Fixes Needed

**Date:** December 31, 2024
**Status:** Partial compliance with AVOIDING_REGRESSIONS.md strategy

---

## Executive Summary

The codebase has **partial** implementation of single source of truth patterns. Key calculation files exist (`lib/costing.ts`, `lib/production-settings.ts`) but there are still duplicated calculations and **zero automated tests**.

| Category | Status | Priority |
|----------|--------|----------|
| Centralized calculations | ⚠️ Partial | High |
| Single source of truth | ⚠️ Mixed | High |
| Pure functions | ✅ Yes | - |
| TypeScript types | ✅ Yes | - |
| Unit tests | ❌ Missing | Critical |
| Integration tests | ❌ Missing | Critical |
| Pre-commit hooks | ❌ Missing | Medium |

---

## Issue 1: Duplicated Calculation Constants

### Problem
`PRODUCTION_DEFAULTS` is defined in two places:

**Location 1:** `lib/production-settings.ts` (source of truth)
```typescript
export const PRODUCTION_DEFAULTS = {
  layersPerTier: 3,
  layerHeightInches: 2.5,
  // ...
}
```

**Location 2:** `scripts/seed-costing-defaults.mjs` (duplicate)
```javascript
const PRODUCTION_DEFAULTS = {
  layersPerTier: 3,
  layerHeightInches: 2.5,
  // ...
}
```

### Fix Required
```javascript
// scripts/seed-costing-defaults.mjs
// ❌ DELETE the local PRODUCTION_DEFAULTS object
// ✅ Import from production-settings (need to handle ESM/CJS)

// Option A: Convert to TypeScript
import { PRODUCTION_DEFAULTS, calculateTierVolumeMl } from '../lib/production-settings'

// Option B: Shared JSON config file
// Create: lib/production-defaults.json
// Import in both places
```

---

## Issue 2: Surface Area Calculations Duplicated

### Problem
`Math.PI * radius * radius` appears in **7 different files**:

| File | Line | Context |
|------|------|---------|
| `lib/costing.ts` | 832 | tierSurfaceArea |
| `lib/costing.ts` | 1824 | tierSurfaceArea (duplicate in same file!) |
| `lib/production-settings.ts` | 129 | calculateLayerVolumeCubicInches |
| `lib/production-settings.ts` | 211 | calculateTierSurfaceArea |
| `app/orders/[id]/edit-form.tsx` | 740 | tierSurfaceArea |
| `app/api/production/batches/manage/route.ts` | 8, 24 | calculateSurfaceArea |
| `app/api/production/batches/route.ts` | 27, 46 | calculateSurfaceArea |
| `app/api/production/fondant-needs/route.ts` | 9-10 | topArea, sideArea |

### Fix Required
All should use `lib/production-settings.ts`:
```typescript
// ✅ Single source of truth
import { calculateTierSurfaceArea } from '@/lib/production-settings'

const { topArea, sideArea, totalArea } = calculateTierSurfaceArea(
  diameterInches,
  tierHeightInches,
  shape
)
```

---

## Issue 3: Volume Factor Magic Numbers

### Problem
Volume factors (BATTER: 1.0, FROSTING: 0.36, FILLING: 0.12) appear in multiple places:

| File | Lines | Values |
|------|-------|--------|
| `lib/costing.ts` | 231-235 | RECIPE_VOLUME_FACTORS object |
| `app/admin/recipes/recipe-form.tsx` | 139, 141 | Hardcoded 0.36, 0.12 |
| `app/admin/recipes/recipe-form.tsx` | 194-195 | Hardcoded 0.36, 0.12 |

### Fix Required
Move to production-settings:
```typescript
// lib/production-settings.ts
export const RECIPE_VOLUME_FACTORS = {
  BATTER: 1.0,
  FROSTING: 0.36,
  FILLING: 0.12,
}

// All other files import from here
import { RECIPE_VOLUME_FACTORS } from '@/lib/production-settings'
```

---

## Issue 4: Pricing Calculations in UI Components

### Problem
`app/orders/[id]/edit-form.tsx` line 873 has inline pricing calculation:
```typescript
const newSuggestedPrice = costing.suggestedPrice + (totalDiff * (1 + costing.markupPercent))
```

This should be a function in `lib/costing.ts` or `lib/pricing.ts`.

### Fix Required
```typescript
// lib/pricing.ts (new file)
export function adjustSuggestedPrice(
  currentPrice: number,
  costDiff: number,
  markupPercent: number
): number {
  return Math.round((currentPrice + (costDiff * (1 + markupPercent))) * 100) / 100
}

// app/orders/[id]/edit-form.tsx
import { adjustSuggestedPrice } from '@/lib/pricing'
const newSuggestedPrice = adjustSuggestedPrice(costing.suggestedPrice, totalDiff, costing.markupPercent)
```

---

## Issue 5: Duplicate Code Within lib/costing.ts

### Problem
`lib/costing.ts` has **two nearly identical pricing calculation blocks**:

**Block 1 (lines 1101-1129):**
```typescript
const suggestedPriceBeforeDelivery = totalCostBeforeDelivery * (1 + markupPercent)
const suggestedPrice = suggestedPriceBeforeDelivery
// ... discount calculation ...
const finalPrice = suggestedPrice - discountAmount + deliveryCost
```

**Block 2 (lines 2103-2128):**
```typescript
const suggestedPriceBeforeDelivery = totalCostBeforeDelivery * (1 + markupPercent)
const suggestedPrice = suggestedPriceBeforeDelivery
// ... discount calculation ...
const finalPrice = suggestedPrice - discountAmount + deliveryCost
```

### Fix Required
Extract to a shared helper function within the file:
```typescript
function calculatePricing(
  totalCostBeforeDelivery: number,
  markupPercent: number,
  discountType: 'PERCENT' | 'FIXED' | null,
  discountValue: number | null,
  deliveryCost: number
): { suggestedPrice: number; discountAmount: number; finalPrice: number } {
  // Single implementation
}
```

---

## Issue 6: Zero Automated Tests

### Problem
**No test files exist** in the codebase (only in node_modules).

This is the **most critical issue** - without tests:
- Regressions go undetected
- Refactoring is risky
- No verification that calculations are correct

### Fix Required
Create test infrastructure:

```
lib/
  __tests__/
    costing.test.ts        # Unit tests for costing calculations
    pricing.test.ts        # Unit tests for pricing calculations
    production-settings.test.ts  # Unit tests for volume/surface calculations

__tests__/
  integration/
    order-costing.test.ts  # End-to-end costing tests
    quote-conversion.test.ts  # Quote → Order conversion tests
```

**Minimum test coverage needed:**

```typescript
// lib/__tests__/production-settings.test.ts
describe('calculateTierVolumeMl', () => {
  it('calculates 6" round tier correctly', () => {
    const volume = calculateTierVolumeMl(6, 'round')
    expect(volume).toBe(3475) // Known good value
  })

  it('calculates 8" round tier correctly', () => {
    const volume = calculateTierVolumeMl(8, 'round')
    expect(volume).toBe(6178)
  })

  it('calculates 10" square tier correctly', () => {
    const volume = calculateTierVolumeMl(10, 'square')
    expect(volume).toBe(12290)
  })
})

describe('calculateTierSurfaceArea', () => {
  it('calculates round tier surface area', () => {
    const { topArea, sideArea, totalArea } = calculateTierSurfaceArea(6, 6, 'round')
    expect(topArea).toBeCloseTo(28.27, 1)
    expect(sideArea).toBeCloseTo(113.1, 1)
  })
})
```

---

## Issue 7: No Pre-commit Hooks

### Problem
No automated checks before code is committed.

### Fix Required
Add husky + lint-staged:

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "next lint"
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "jest --findRelatedTests --passWithNoTests"]
  }
}
```

---

## Priority Action Plan

### Phase 1: Critical (Do First)

1. **Set up Jest testing framework**
   ```bash
   npm install -D jest @types/jest ts-jest @testing-library/react
   npx ts-jest config:init
   ```

2. **Create core calculation tests**
   - `lib/__tests__/production-settings.test.ts`
   - `lib/__tests__/costing.test.ts`
   - Use known good values from current production data

3. **Extract duplicated code in costing.ts**
   - Create `calculatePricing()` helper
   - Replace both duplicate blocks

### Phase 2: High Priority

4. **Consolidate surface area calculations**
   - All files use `calculateTierSurfaceArea` from production-settings
   - Remove local implementations

5. **Move volume factors to production-settings**
   - Add `RECIPE_VOLUME_FACTORS` export
   - Update all imports

6. **Fix seed script**
   - Create shared config file OR
   - Convert to TypeScript

### Phase 3: Medium Priority

7. **Create lib/pricing.ts**
   - Extract all pricing calculations from UI components
   - Add unit tests

8. **Add pre-commit hooks**
   - Install husky
   - Run tests + lint on commit

9. **Add integration tests**
   - Order creation → costing
   - Quote → Order conversion

---

## Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `lib/production-settings.ts` | Add RECIPE_VOLUME_FACTORS export |
| `lib/costing.ts` | Extract calculatePricing helper, import surface calcs |
| `app/orders/[id]/edit-form.tsx` | Remove inline calculations, use lib functions |
| `app/admin/recipes/recipe-form.tsx` | Import RECIPE_VOLUME_FACTORS |
| `app/api/production/batches/*.ts` | Import calculateTierSurfaceArea |
| `app/api/production/fondant-needs/route.ts` | Import calculateTierSurfaceArea |
| `scripts/seed-costing-defaults.mjs` | Use shared config |
| `package.json` | Add jest, husky, lint-staged |

---

## Regression Test Cases to Create

These are the critical calculations that MUST have tests:

| Calculation | Input | Expected Output | File |
|-------------|-------|-----------------|------|
| 6" tier volume | 6, round | 3475 ml | production-settings |
| 8" tier volume | 8, round | 6178 ml | production-settings |
| 10" tier volume | 10, round | 9653 ml | production-settings |
| Assembly time 6" | 6 | 15 min | production-settings |
| Assembly time 12" | 12 | 30 min | production-settings |
| Markup calculation | $100, 70% | $170 | costing |
| Discount (percent) | $170, 10% | $17 | costing |
| Discount (fixed) | $170, $20 | $20 | costing |
| Final price | cost $100, markup 70%, discount $10 | $160 | costing |

---

## Summary

The AVOIDING_REGRESSIONS.md document outlines an excellent strategy. The codebase is **partially compliant** but needs:

1. **Test infrastructure** (most critical - zero tests exist)
2. **Consolidation of duplicated calculations** (7+ files with surface area)
3. **Extraction of inline calculations** from UI components
4. **Pre-commit hooks** to prevent regressions

Estimated effort: 2-3 days for Phase 1 (critical), 1-2 days for Phase 2.
