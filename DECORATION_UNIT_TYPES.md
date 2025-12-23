# Decoration Unit Types Explained

## Overview

There are **three unit types** for decorations:

1. **CAKE** - Applies to whole cake
2. **TIER** - Uses surface area scaling (default)
3. **SET** - Applies to whole cake (like CAKE)

## How Each Unit Type Works

### 1. CAKE Unit
- **Applies to**: Whole cake (all tiers combined)
- **Quantity meaning**: Number of instances on the whole cake
- **Size scaling**: ❌ NO - uses base quantity only
- **Example**: 
  - "Sugar Flowers" with quantity = 5
  - Cost: `5 × baseCost`
  - Meaning: 5 sugar flowers scattered across the whole cake

### 2. TIER Unit (Default)
- **Applies to**: Whole cake, but costs scale by tier size
- **Quantity meaning**: Number of instances on the whole cake
- **Size scaling**: ✅ YES - scales by surface area based on `baseCakeSize`
- **How it works**:
  1. Calculates average size multiplier across all tiers
  2. Compares actual tier sizes to `baseCakeSize` (e.g., "6\" round")
  3. Scales material/labor costs proportionally
- **Example**:
  - "Piped Border" priced for 6" round ($15), quantity = 2
  - Cake has: 6" tier (1.0x), 8" tier (1.78x), 10" tier (2.78x)
  - Average multiplier: (1.0 + 1.78 + 2.78) / 3 = 1.85x
  - Cost: `2 × 1.85 × $15 = $55.50`
  - Meaning: 2 piped borders, but larger tiers need more material/labor

### 3. SET Unit
- **Applies to**: Whole cake (all tiers combined)
- **Quantity meaning**: Number of sets on the whole cake
- **Size scaling**: ❌ NO - uses base quantity only (same as CAKE)
- **Example**:
  - "Matching Sugar Flower Set" with quantity = 1
  - Cost: `1 × baseCost`
  - Meaning: 1 complete set of matching decorations for the whole cake

## Key Differences

| Unit Type | Size Scaling | Use Case |
|-----------|--------------|----------|
| **CAKE** | ❌ No | Single decoration that applies to whole cake (e.g., "Sugar Flowers") |
| **TIER** | ✅ Yes | Decoration that scales with tier size (e.g., "Piped Border", "Fondant Covering") |
| **SET** | ❌ No | Complete set of matching decorations (e.g., "Matching Sugar Flower Set") |

## Code Reference

From `lib/costing.ts` line 706:
```typescript
// CAKE and SET units use the base quantity (no size scaling)
```

From `lib/costing.ts` line 1491:
```typescript
if (technique.unit === 'TIER' && technique.baseCakeSize && quoteData.tiers.length > 0) {
  // Apply size scaling...
}
```

## When to Use Each

- **CAKE**: Use for decorations that don't scale with size (e.g., individual sugar flowers, toppers, custom figurines)
- **TIER**: Use for decorations that need more material/labor on larger tiers (e.g., piped borders, fondant covering, buttercream rosettes)
- **SET**: Use for complete matching decoration sets that don't scale (e.g., "Wedding Cake Decoration Set", "Birthday Cake Set")

## Summary

- **CAKE** = Whole cake, no scaling
- **TIER** = Whole cake, WITH size scaling (most common)
- **SET** = Whole cake, no scaling (like CAKE, but semantically means "a set")

The main difference between CAKE and SET is semantic - SET implies a complete matching set of decorations, while CAKE is a single decoration type. From a costing perspective, they're identical.

