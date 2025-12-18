# Decoration Quantity Explanation

## How It Works

### Quantity Field Meaning
The **quantity** field represents **how many instances** of this decoration appear on the **whole cake** (all tiers combined).

**Examples:**
- Quantity = 1: "1 sugar flower" on the cake
- Quantity = 5: "5 sugar flowers" scattered across the cake
- Quantity = 2: "2 piped borders" (one on top tier, one on bottom tier)

### Important: Decorations Are Order-Level (Whole Cake)
- Decorations apply to the **entire cake**, not individual tiers
- The quantity is **not** multiplied by tier count
- If you want decorations on each tier, you would increase the quantity

### Size Scaling (For TIER Unit Decorations)
For decorations with `unit = 'TIER'` and `baseCakeSize` set:
- The system calculates an **average size multiplier** across all tiers
- This scales material/labor costs based on actual tier sizes vs the base size
- Formula: `finalCost = quantity × avgSizeMultiplier × baseCost`

**Example:**
- Decoration: "Sugar Flowers" priced for 6" round ($15), quantity = 5
- Cake has: 6" tier (1.0x), 8" tier (1.78x), 10" tier (2.78x)
- Average multiplier: (1.0 + 1.78 + 2.78) / 3 = 1.85x
- Cost: 5 × 1.85 × $15 = **$138.75**

### What Quantity = 2 Means
- **NOT** "2 cakes worth of decorations"
- **NOT** "2 decorations per tier"
- **YES** "2 instances of this decoration on the whole cake"

### Old Logic (Fixed)
Previously, the code was doing:
```typescript
quantityMultiplier = decInput.quantity * tierCount  // WRONG!
```

This would mean quantity=2 × 3 tiers = 6 decorations, which doesn't make sense for order-level decorations.

### New Logic (Correct)
```typescript
quantityMultiplier = decInput.quantity || 1  // Number of instances
// Then scale by size if needed
if (unit === 'TIER' && baseCakeSize) {
  quantityMultiplier = quantityMultiplier * avgSizeMultiplier
}
```

Now quantity=2 means "2 instances" on the whole cake, scaled by tier sizes if applicable.
