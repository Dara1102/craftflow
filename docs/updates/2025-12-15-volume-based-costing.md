# Update: Volume-Based Recipe Costing System
**Date:** December 15, 2025

## Overview
Major refactoring of the recipe and tier system to enable accurate, automated cost calculations based on volume.

---

## Key Changes

### 1. Recipe/Tier Decoupling
**Before:** Tier sizes were locked to specific recipes (batterRecipeId, frostingRecipeId on TierSize)
**After:** Recipes are standalone batches; recipe selection happens at order time

### 2. Volume-Based Multiplier Calculation
Each tier now has a `volumeMl` field calculated from its dimensions:
- Round: π × r² × h
- Square: side² × h
- Sheet: length × width × h
- Heart: 75% of square
- Cupcakes: servings × 60ml

Each recipe now has a `yieldVolumeMl` field (what one batch produces):
- Batter recipes: ~3295ml (8-inch round equivalent)
- Frosting recipes: ~1200ml (enough to frost 8-inch)
- Filling recipes: ~400ml (thin layer for 8-inch)

**Multiplier Formula:**
```
multiplier = tierVolume / recipeYieldVolume
```

**Type Adjustments:**
- Batter: 100% of tier volume needed
- Frosting: 36% (surface coverage)
- Filling: 12% (thin layer)

### 3. Recipe Form Simplification
- Removed confusing tier/sheet/servings radio buttons
- Single "Batch Volume (ml)" input field
- Helper dropdown to auto-calculate from tier sizes
- Shows batch cost summary (ingredients + labor + total)
- Per-ingredient costs displayed inline

### 4. Auto-Recipe Matching
When an order is created with flavor/filling/finishType text (e.g., "Chocolate", "Buttercream"), the costing system automatically matches to the appropriate recipe.

### 5. Ingredient Cost Precision
Changed `Decimal(10,2)` to `Decimal(10,6)` to support sub-cent costs per gram/ml.

---

## Database Changes

### Schema
```prisma
model TierSize {
  volumeMl Int?  // NEW: Calculated volume in ml
}

model Recipe {
  yieldVolumeMl Int?  // NEW: Volume this batch yields
}

model Ingredient {
  costPerUnit Decimal @db.Decimal(10, 6)  // CHANGED: More precision
}
```

### Data Populated
- 25 tier sizes with volumeMl calculated
- 5 recipes with yieldVolumeMl set
- Ingredient costs updated with realistic values

---

## Example Calculation

**Order:** 10-inch round chocolate cake with buttercream

| Component | Tier Volume | Recipe Yield | Multiplier | Base Cost | Scaled Cost |
|-----------|-------------|--------------|------------|-----------|-------------|
| Batter | 5148ml | 3295ml | 1.56x | $8.50 | $13.26 |
| Frosting | 1853ml* | 1200ml | 1.54x | $5.20 | $8.01 |
| Filling | 618ml* | 400ml | 1.54x | $2.10 | $3.23 |

*After type adjustment (36% for frosting, 12% for filling)

---

## Files Changed
- `lib/costing.ts` - Complete rewrite with auto-matching and volume calculations
- `app/admin/recipes/recipe-form.tsx` - Simplified UI
- `app/admin/tiers/*.tsx` - Removed recipe assignment UI
- `prisma/schema.prisma` - Added volume fields, increased precision
- `app/orders/*/` - Added desiredServings field

---

## Testing
Run the costing test script:
```bash
npx tsx scripts/test-costing.mjs
```

---

## Next Steps (Future)
1. **Production/Baking Report** - Aggregate daily orders, calculate total volumes needed, show batch counts
2. **Configurable Batch Size** - Allow users to set standard batch multiplier
3. **Recipe Selection in Order Form** - Explicit recipe dropdowns instead of text-based matching
