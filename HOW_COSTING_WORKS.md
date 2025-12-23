# How Costing Works - Complete Explanation

## 1. Batter/Filling/Frosting ✅ YES - Volume-Based

### Volume Calculation:
- **Uses `calculateMultiplier()` function**
- **Formula**: `multiplier = (tierVolume × factor) / recipeYieldVolume`

### Volume Factors:
- **BATTER**: 1.0 (full tier volume)
- **FROSTING**: 0.36 (surface coverage ~36% of volume)  
- **FILLING**: 0.12 (thin layer ~12% of volume)

### Example:
```
Recipe: "Vanilla Sponge" yields 2000ml (for 8" round)
Tier: 10" round needs 4000ml
Multiplier: 4000 / 2000 = 2.0x

Result:
- All ingredients × 2.0
- Labor minutes × 2.0
- Costs scale proportionally
```

### Fallback Recipes (When No Recipe Selected):
**YES, they have FULL costs attached!**

When you select "Vanilla" from flavor dropdown:
1. System calls `findMatchingRecipe("Vanilla", "BATTER", allRecipes)`
2. Finds "Vanilla Sponge Batter" recipe from database
3. Uses that recipe's:
   - ✅ Ingredients (with costs)
   - ✅ Labor minutes
   - ✅ Labor role (with hourly rate)
4. Calculates multiplier based on tier size
5. Scales all costs accordingly

**So fallback = real recipe with full cost data, just auto-matched instead of manually selected.**

## 2. Decoration Cost Calculation

### Current System:
Decorations are **order-level** (apply to whole cake), not tier-specific.

### How It Works:
1. **For TIER units**: `quantity × tierCount × avgSizeMultiplier`
2. **Size Multiplier**: Calculates average across ALL tiers
3. **Formula**: `(sum of all tier multipliers) / number of tiers`

### Example:
```
Decoration: "Sugar Flowers" priced for 6" ($15), unit = TIER
Order has: 
  - 6" tier → multiplier 1.0x
  - 8" tier → multiplier 1.78x  
  - 10" tier → multiplier 2.78x

Average multiplier: (1.0 + 1.78 + 2.78) / 3 = 1.85x
Cost: $15 × 3 tiers × 1.85 = $83.25
```

### Why This Design:
- Most decorations apply to **whole cake** (all tiers)
- Size scaling accounts for larger tiers needing more material/labor
- Average multiplier is reasonable for multi-tier cakes
- Simpler than tracking per-tier decorations

### Alternative (Future):
- Could add tier-specific decorations if needed
- Would require schema change: `QuoteTierDecoration` model

## 3. Customer System ✅ Uses Same System

- Quotes use **same `Customer` model** as Orders
- `customerId` links to existing customer record
- Same customer lookup/search as order form
- "Add New Customer" creates same customer record
- **One customer record, used by both quotes and orders**

## 4. Cost Locking When Approved ✅ Now Implemented

### When Quote Status = ACCEPTED:
- Costs are **locked** (stored as JSON in `lockedCosting` field)
- **Not recalculated** when viewed later
- Preserves pricing as quoted to customer
- Even if ingredient prices change, accepted quote costs stay the same

### When Quote Status = DRAFT or SENT:
- Costs **recalculated** each time (real-time pricing)
- Reflects current ingredient/labor costs
- Allows adjustments before acceptance

## 5. Real-Time Calculation

- Updates automatically as you:
  - Add/remove tiers
  - Change tier sizes
  - Select recipes
  - Add decorations
  - Change markup
  - Apply discounts

- Uses `/api/quotes/calculate` endpoint
- No database writes (draft calculation)
- Debounced (500ms delay) to avoid excessive API calls

## Summary

✅ **Batter/Filling/Frosting**: Volume-based, scales by tier size
✅ **Fallback Recipes**: Real recipes with full costs, auto-matched
✅ **Decorations**: Size-scaled based on average tier size
✅ **Customer System**: Same as orders, shared customer records
✅ **Cost Locking**: Costs locked when quote accepted
✅ **Real-Time**: Updates as you make changes

