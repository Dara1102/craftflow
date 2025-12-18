# Decoration Size Scaling

## ✅ Now Implemented

Decoration costs now account for **tier size differences**, not just tier count.

## How It Works

### Before (Old Logic)
- **TIER unit**: quantity × number of tiers
- **CAKE/SET unit**: quantity as-is
- **Problem**: A decoration priced for 6" applied to 10" tier still charged same price

### After (New Logic)
- **TIER unit**: quantity × number of tiers × **size multiplier**
- **CAKE/SET unit**: quantity as-is (no size scaling)
- **Size Multiplier**: Calculates surface area ratio based on `baseCakeSize` field

## Size Multiplier Calculation

### For Round Cakes
Uses surface area (π × r²):
```
sizeMultiplier = (tierArea / baseArea)
```

**Example:**
- Decoration priced for **6" round** (`baseCakeSize = "6\" round"`)
- Applied to **10" round** tier:
  - 6" area = π × (3")² = 28.27 in²
  - 10" area = π × (5")² = 78.54 in²
  - Multiplier = 78.54 / 28.27 = **2.78x**

So a $15 decoration becomes: $15 × 2.78 = **$41.70**

### For Rectangular/Sheet Cakes
Uses area (length × width):
```
sizeMultiplier = (tierArea / baseArea)
```

### For Multi-Tier Orders
Calculates **average multiplier** across all tiers:
```
avgMultiplier = (sum of all tier multipliers) / number of tiers
```

## Example Scenarios

### Scenario 1: Single Tier
- **Decoration**: "Sugar Flowers" priced for 6" ($15)
- **Tier**: 10" round
- **Result**: $15 × 2.78 = **$41.70**

### Scenario 2: Multi-Tier
- **Decoration**: "Sugar Flowers" priced for 6" ($15), unit = TIER
- **Tiers**: 6" round (1.0x), 8" round (1.78x), 10" round (2.78x)
- **Average multiplier**: (1.0 + 1.78 + 2.78) / 3 = 1.85x
- **Quantity multiplier**: 1 (quantity) × 3 (tiers) × 1.85 (size) = **5.55x**
- **Result**: $15 × 5.55 = **$83.25**

### Scenario 3: No baseCakeSize
- **Decoration**: "Custom Decoration" (no `baseCakeSize` set)
- **Result**: Uses 1.0x multiplier (no size scaling)
- **Note**: Only multiplies by tier count for TIER units

## When Size Scaling Applies

✅ **Applies when:**
- Decoration `unit === 'TIER'`
- Decoration has `baseCakeSize` field set (e.g., "6\" round")
- Order/quote has tiers with size information

❌ **Does NOT apply when:**
- Decoration `unit === 'CAKE'` or `'SET'` (fixed price per cake/set)
- Decoration has no `baseCakeSize` field
- Tier size information is missing

## Setting baseCakeSize

When creating/editing decorations in admin:
- Set `baseCakeSize` field (e.g., "6\" round", "8\" round", "10\" round")
- This tells the system what size the decoration is priced for
- The system will automatically scale up/down based on actual tier sizes

## Benefits

1. **Accurate Pricing**: Larger tiers correctly cost more for decorations
2. **Fair Pricing**: Customers pay appropriately for size
3. **Automatic**: No manual adjustment needed
4. **Backward Compatible**: Decorations without `baseCakeSize` still work (no scaling)
