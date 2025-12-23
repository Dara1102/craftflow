# How Costing Works - Detailed Explanation

## 1. Batter/Filling/Frosting Volume Calculation ✅ YES

### How It Works:
- **Uses volume-based multipliers** via `calculateMultiplier()` function
- **Formula**: `multiplier = (tierVolume × factor) / recipeYieldVolume`

### Volume Factors:
- **BATTER**: 1.0 (full tier volume)
- **FROSTING**: 0.36 (surface coverage ~36% of volume)
- **FILLING**: 0.12 (thin layer ~12% of volume)

### Example:
- Recipe yields: 2000ml (for 8" round)
- Tier needs: 4000ml (10" round)
- Multiplier: 4000 / 2000 = **2.0x**
- Ingredients: All recipe ingredients × 2.0
- Labor: Recipe labor minutes × 2.0

### Fallback Recipes:
- **YES, they have costs attached**
- When you select "Vanilla" from flavor dropdown (no recipe selected):
  1. System calls `findMatchingRecipe("Vanilla", "BATTER", allRecipes)`
  2. Finds "Vanilla Sponge Batter" recipe
  3. Uses that recipe's ingredients and labor costs
  4. Calculates multiplier based on tier size
  5. Scales costs accordingly

**So fallback recipes ARE real recipes with full cost data.**

## 2. Decoration Cost Calculation

### Current System:
- Decorations are **order-level** (not tier-specific)
- For **TIER units**: Calculates average size multiplier across ALL tiers
- Formula: `quantity × tierCount × avgSizeMultiplier`

### Example:
- Decoration: "Sugar Flowers" priced for 6" ($15), unit = TIER
- Order has: 6" tier (1.0x), 8" tier (1.78x), 10" tier (2.78x)
- Average: (1.0 + 1.78 + 2.78) / 3 = 1.85x
- Cost: $15 × 3 tiers × 1.85 = **$83.25**

### Why This Works:
- Most decorations apply to the whole cake (all tiers)
- Size scaling accounts for larger tiers needing more material/labor
- Average multiplier is reasonable for multi-tier cakes

### Alternative (Future Enhancement):
- Could add tier-specific decorations if needed
- Would require schema change to link decorations to specific tiers

## 3. Customer System

### Current:
- Quotes use same `Customer` model as Orders
- `customerId` links to existing customer
- `customerName` stored for display/legacy

### Should Be:
- Same customer lookup/search as order form
- "Add New Customer" option if not found
- Uses same customer records

## 4. Cost Locking When Approved

### Current:
- Costs recalculated every time quote is viewed
- If ingredient prices change, quote costs change

### Should Be:
- When quote status = ACCEPTED:
  - Store final costs in quote record
  - Don't recalculate (lock costs)
  - Preserve pricing as quoted

## 5. Save Error

Need to check actual error message to fix.

