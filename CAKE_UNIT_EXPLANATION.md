# CAKE Unit Type - How It Works

## Answer: CAKE Unit Does NOT Need Tiers

**CAKE unit decorations can calculate cost even if NO tiers are selected.**

### How CAKE Unit Works:
- **Cost Formula**: `quantity × baseCost`
- **No tier dependency**: CAKE decorations don't use tier information at all
- **Example**: Custom topper, quantity = 1, baseCost = $25 → Cost = $25

### Why You Might Think It Needs Tiers:

The **real-time calculation endpoint** (`/api/quotes/calculate`) requires tiers to be present, but this is for **other calculations** (ingredient costs, labor, etc.), not specifically for CAKE decorations.

### Unit Type Comparison:

| Unit Type | Needs Tiers? | Why? |
|-----------|--------------|------|
| **SINGLE** | ❌ No | Per-item cost, no scaling |
| **CAKE** | ❌ No | Whole cake decoration, no scaling |
| **TIER** | ✅ Yes | Scales by tier size (needs tier dimensions) |
| **SET** | ❌ No | Matching set, no scaling |

### Example:

**CAKE Unit Decoration:**
- Name: "Custom Message Topper"
- Unit: CAKE
- Base Cost: $25
- Quantity: 1

**Cost Calculation:**
- With tiers: $25 (quantity 1 × $25)
- Without tiers: $25 (quantity 1 × $25) - **SAME!**

The decoration cost doesn't change whether tiers are present or not.

### However:

The **overall quote calculation** requires tiers because:
- Ingredient costs need tier sizes (to calculate recipe multipliers)
- Labor costs need tier sizes (assembly time per tier)
- Total servings calculation needs tiers

But the **CAKE decoration itself** doesn't need tier information.

## Summary

✅ **CAKE unit decorations can calculate cost without tiers**
✅ **CAKE unit = quantity × baseCost (always)**
❌ **CAKE unit does NOT scale by tier size**
❌ **CAKE unit does NOT use tier information**

The system requires tiers for the overall quote, but CAKE decorations themselves are independent of tier selection.

