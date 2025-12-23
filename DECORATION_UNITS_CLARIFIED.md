# Decoration Unit Types - Clarified

## Overview

When creating a decoration, you **must** assign a Unit Type. This determines how the decoration is priced and how quantity works.

## Unit Types

### 1. SINGLE (Per-Item)
**Use for:** Individual decorations that are counted by item
- Sugar flowers
- Sculpted balloons
- Individual piped elements
- Custom figurines

**How it works:**
- Quantity = number of items
- Cost = quantity × baseCost
- No size scaling
- Example: 5 sugar flowers = quantity 5, cost = 5 × $15 = $75

**When creating:** Set unit to SINGLE, baseCost is cost per item

---

### 2. CAKE (Whole Cake)
**Use for:** Decorations that apply to the whole cake but don't scale with size
- Toppers
- Custom messages
- Simple borders that don't vary by tier size

**How it works:**
- Quantity = number of instances on whole cake
- Cost = quantity × baseCost
- No size scaling
- Example: 2 custom messages = quantity 2, cost = 2 × $10 = $20

**When creating:** Set unit to CAKE, baseCost is cost per instance

---

### 3. TIER (Size-Scaled)
**Use for:** Decorations that scale with tier size (surface area)
- Ombre buttercream
- Fondant covering
- Piped borders
- Any decoration where larger tiers need more material/labor

**How it works:**
- Quantity = number of instances
- Cost = quantity × avgSizeMultiplier × baseCost
- Size scaling: Calculates average multiplier across all tiers based on `baseCakeSize`
- Example: Ombre buttercream priced for 6" round, quantity = 1
  - Cake has: 6" (1.0x), 8" (1.78x), 10" (2.78x)
  - Average: (1.0 + 1.78 + 2.78) / 3 = 1.85x
  - Cost: 1 × 1.85 × $20 = $37

**When creating:** Set unit to TIER, set `baseCakeSize` (e.g., "6\" round"), baseCost is cost for that base size

---

### 4. SET (Matching Set)
**Use for:** User-defined groups of matching decorations
- Unicorn cake set (horn + ears + rainbow buttercream)
- Wedding cake set (matching flowers + borders + topper)
- Complete themed decoration packages

**How it works:**
- Quantity = number of complete sets
- Cost = quantity × baseCost
- No size scaling
- Example: 1 unicorn cake set = quantity 1, cost = 1 × $150 = $150

**When creating:** Set unit to SET, baseCost is cost for the complete set

---

## Examples

### Sugar Flowers (SINGLE)
- Unit: SINGLE
- Base Cost: $15 per flower
- Quantity 5 = 5 flowers = $75

### Ombre Buttercream (TIER)
- Unit: TIER
- Base Cake Size: 6" round
- Base Cost: $20 (for 6" round)
- Quantity 1 on 3-tier cake (6", 8", 10") = $37 (scaled)

### Custom Topper (CAKE)
- Unit: CAKE
- Base Cost: $25 per topper
- Quantity 1 = 1 topper = $25

### Unicorn Cake Set (SET)
- Unit: SET
- Base Cost: $150 per set
- Quantity 1 = 1 complete set = $150

---

## Key Differences

| Unit | Size Scaling | Quantity Meaning | Best For |
|------|--------------|------------------|----------|
| **SINGLE** | ❌ No | Number of items | Individual decorations (flowers, balloons) |
| **CAKE** | ❌ No | Number of instances | Whole cake decorations (toppers, messages) |
| **TIER** | ✅ Yes | Number of instances (scaled) | Size-dependent decorations (ombre, fondant) |
| **SET** | ❌ No | Number of sets | Matching decoration groups |

---

## Important Notes

1. **SINGLE is now the default** for new decorations (was CAKE)
2. **TIER decorations require `baseCakeSize`** to be set for proper scaling
3. **Quantity field meaning changes** based on unit type
4. **When in doubt:** Use SINGLE for individual items, TIER for size-scaled decorations

