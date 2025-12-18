# Decoration Unit Types - Corrected Logic

## Overview

The unit type determines:
1. **What the decoration applies to** (whole cake vs specific tiers)
2. **How cost scales** (by surface area vs flat rate)

## Unit Types - Corrected

### 1. SINGLE (Per-Item)
**Use for:** Individual decorations counted by item
- Sugar flowers
- Sculpted balloons  
- Toppers
- Individual piped elements

**How it works:**
- Quantity = number of items
- Cost = quantity × baseCost
- **No size scaling**
- Example: 5 sugar flowers = quantity 5, cost = 5 × $15 = $75

---

### 2. CAKE (Whole Cake Surface Design)
**Use for:** Surface designs that cover the entire cake (all tiers)
- Fondant quilt design
- Ombre buttercream (if applied to whole cake)
- Textured finish (if applied to whole cake)
- Any design that covers all tiers uniformly

**How it works:**
- Quantity = number of instances of this design on the whole cake
- Cost = quantity × totalSurfaceAreaMultiplier × baseCost
- **Scales by total surface area** of all tiers combined (top + sides of all tiers)
- **Requires tiers to be selected** - cannot calculate without tier information
- Example: Fondant quilt design, base size 6" round, quantity = 1
  - Cake has: 6" tier + 8" tier + 10" tier
  - Total surface area = sum of (top + side surface) for all tiers
  - Base surface area = top + side surface for 6" round
  - Cost scales by: totalSurfaceArea / baseSurfaceArea

**Key Point:** CAKE unit means "this design covers the entire cake as designed in the tier selection" - cost is based on the total surface area of all tiers you've selected.

---

### 3. TIER (Per-Tier Design)
**Use for:** Designs that apply to specific tier(s), not necessarily all tiers
- Ombre buttercream on 2 tiers (third tier different)
- Fondant design on bottom tier only
- Any design where you might have different designs on different tiers

**How it works:**
- Quantity = number of tiers this design applies to
- **User selects which specific tiers** the decoration applies to (Tier 1, Tier 2, Tier 3, etc.)
- Cost = quantity × avgSizeMultiplier × baseCost
- **Scales by average tier size** of **selected tiers only**
- **Requires tiers to be selected** - cannot calculate without tier information
- **Requires at least one tier to be selected** - validation prevents saving if no tiers selected
- Example: Ombre buttercream on Tier 1 and Tier 2 only, base size 6" round, quantity = 2
  - Cake has: 6" tier (1.0x), 8" tier (1.78x), 10" tier (2.78x)
  - Selected tiers: Tier 1 (6") and Tier 2 (8")
  - Average of selected: (1.0 + 1.78) / 2 = 1.39x
  - Cost: 2 × 1.39 × $20 = $55.60

**Tier Selection Feature:**
- When adding a TIER unit decoration, user can select which tiers it applies to via checkboxes
- Tier selections are stored in `tierIndices` array (e.g., [1, 2] for Tier 1 and Tier 2)
- When tiers are added/removed from the cake, decorations automatically update their tier selections
- Cost calculation uses only the selected tiers for size scaling

**Key Point:** TIER unit means "this design applies to X number of **selected** tiers" - cost scales by average tier size of the selected tiers

---

### 4. SET (Matching Set)
**Use for:** User-defined groups of matching decorations
- Unicorn cake set (horn + ears + rainbow buttercream)
- Wedding cake set (matching flowers + borders + topper)

**How it works:**
- Quantity = number of complete sets
- Cost = quantity × baseCost
- **No size scaling**
- Example: 1 unicorn cake set = quantity 1, cost = 1 × $150 = $150

---

## Key Differences

| Unit | Applies To | Size Scaling | Quantity Meaning | Example |
|------|------------|--------------|------------------|---------|
| **SINGLE** | N/A (items) | ❌ No | Number of items | 5 sugar flowers |
| **CAKE** | Entire cake (all tiers) | ✅ Yes (total surface area) | Number of instances on whole cake | Fondant quilt on all tiers |
| **TIER** | Specific tier(s) | ✅ Yes (average tier size) | Number of tiers | Ombre on 2 of 3 tiers |
| **SET** | N/A (set) | ❌ No | Number of sets | 1 unicorn set |

---

## Real-World Examples

### Example 1: Fondant Quilt Design
**Scenario:** 3-tier cake, all tiers have fondant quilt design

- **Unit:** CAKE
- **Quantity:** 1 (one design covering whole cake)
- **Cost:** Scales by total surface area of all 3 tiers

### Example 2: Ombre Buttercream - Whole Cake
**Scenario:** 3-tier cake, all tiers have ombre buttercream

- **Unit:** CAKE
- **Quantity:** 1 (one design covering whole cake)
- **Cost:** Scales by total surface area of all 3 tiers

### Example 3: Ombre Buttercream - Specific Tiers
**Scenario:** 3-tier cake, bottom 2 tiers have ombre, top tier has different design

- **Unit:** TIER
- **Quantity:** 2 (applies to 2 tiers)
- **Cost:** Scales by average size of those 2 tiers

### Example 4: Sugar Flowers
**Scenario:** Scattered across cake

- **Unit:** SINGLE
- **Quantity:** 5 (5 flowers)
- **Cost:** 5 × $15 = $75 (no scaling)

---

## Summary

- **SINGLE** = Per-item, no scaling
- **CAKE** = Whole cake surface design, scales by total surface area of all tiers
- **TIER** = Per-tier design, scales by average size of selected tiers
- **SET** = Matching set, no scaling

**The key distinction:**
- **CAKE** = "This design covers the entire cake as designed"
- **TIER** = "This design applies to X specific tiers"
