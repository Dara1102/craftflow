# Recipe Instructions vs LaborMinutes - How They Work Together

## Overview

Your Recipe model has both **instructions** (for bakers) and **laborMinutes** (for costing). Here's how they work together:

---

## The Two Purposes

### 1. **Instructions** - For Production (Baker)
- **Purpose**: Step-by-step recipe instructions for the baker to follow
- **Format**: JSON array of steps with time tracking
- **Fields**: `instructions`, `prepMinutes`, `bakeMinutes`, `coolMinutes`
- **Used by**: Production team, bakers, kitchen staff

### 2. **laborMinutes** - For Costing (Pricing Engine)
- **Purpose**: Quick total labor time for cost calculations
- **Format**: Single integer (total minutes)
- **Fields**: `laborMinutes`
- **Used by**: Pricing engine, costing calculations

---

## How They Relate

### In Recipe Form (`app/admin/recipes/recipe-form.tsx`):

1. **User enters step-by-step instructions** with time per step
2. **System calculates**:
   - `prepMinutes` = sum of all "prep" type steps
   - `bakeMinutes` = sum of all "bake" type steps  
   - `coolMinutes` = sum of all "cool" type steps
3. **System calculates**:
   - `laborMinutes` = prepMinutes + bakeMinutes + coolMinutes
4. **All are saved** to database

### In Costing Engine (`lib/costing.ts`):

**Current Implementation:**
- ✅ Uses `laborMinutes` for quick costing (lines 378, 414, 450)
- ❌ Does NOT load `instructions`, `prepMinutes`, `bakeMinutes`, `coolMinutes`
- ✅ This is **correct for costing** - we don't need instructions to calculate costs

**For Production Reports:**
- Need to include full recipe with instructions
- Instructions are needed for baker to follow recipe
- Can add optional parameter to include full recipe data

---

## Current State Analysis

### ✅ What's Working

1. **Recipe Form**:
   - Instructions can be entered step-by-step
   - Automatically calculates `prepMinutes`, `bakeMinutes`, `coolMinutes`
   - Calculates `laborMinutes` from instructions
   - All saved to database

2. **Costing Engine**:
   - Uses `laborMinutes` for cost calculations
   - Fast and efficient (no need to parse instructions)
   - Correctly calculates labor costs

### ⚠️ What's Missing

1. **Costing queries don't include instructions**:
   ```typescript
   // Current (lines 198-227 in costing.ts)
   batterRecipe: {
     include: {
       recipeIngredients: { include: { ingredient: true } },
       laborRole: true
       // Missing: instructions, prepMinutes, bakeMinutes, coolMinutes
     }
   }
   ```

2. **Production reports need full recipes**:
   - When generating production sheets for bakers
   - Need instructions, prep/bake/cool times
   - Need full recipe details

---

## Answer to Your Questions

### Q1: "In calculateRecipeCost I noticed there isn't a tag for instructions which helps calculate labor. Is that in another place?"

**Answer**: 
- Instructions are used in the **recipe form** to calculate `laborMinutes`
- In `calculateRecipeCost` (costing engine), we use `laborMinutes` directly (which was already calculated from instructions)
- Instructions are NOT needed for costing - only `laborMinutes` is needed
- Instructions ARE needed for production (baker needs full recipe)

### Q2: "If we decide to use these instructions, would laborMinutes be removed?"

**Answer**: 
- **NO, laborMinutes should NOT be removed**
- `laborMinutes` is still needed for:
  - Quick costing calculations (fast, no parsing needed)
  - When instructions aren't entered (manual entry fallback)
  - Costing queries (don't need to parse JSON)
- Instructions and `laborMinutes` serve different purposes:
  - Instructions = production workflow
  - laborMinutes = costing calculation

### Q3: "The entire recipe is needed because baker needs it."

**Answer**: 
- **Correct!** For production reports, you need full recipe including:
  - Instructions (step-by-step)
  - prepMinutes, bakeMinutes, coolMinutes (time breakdown)
  - Ingredients (scaled quantities)
  - laborMinutes (total time)
- Solution: Add optional parameter to include full recipe data when needed

---

## Recommended Solution

### Option 1: Include Instructions in Costing Result (For Production)

Add full recipe data to costing result when needed for production:

```typescript
// In lib/costing.ts
export interface RecipeMatch {
  recipe: {
    id: number
    name: string
    type: string
    yieldVolumeMl: number | null
    // Add these for production:
    instructions: string | null        // Full step-by-step instructions
    prepMinutes: number | null         // Prep time breakdown
    bakeMinutes: number | null         // Bake time breakdown
    coolMinutes: number | null         // Cool time breakdown
    laborMinutes: number | null        // Total labor (already included)
    laborRole: { name: string; hourlyRate: Decimal } | null
    recipeIngredients: {...}[]
  }
  multiplier: number
}
```

### Option 2: Separate Production Endpoint

Create separate endpoint for production data:

```typescript
// app/api/orders/[id]/production/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const order = await prisma.cakeOrder.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      cakeTiers: {
        include: {
          tierSize: {
            include: {
              batterRecipe: {
                include: {
                  recipeIngredients: { include: { ingredient: true } },
                  laborRole: true
                  // Instructions are automatically included (part of Recipe model)
                }
              },
              // ... fillingRecipe, frostingRecipe
            }
          }
        }
      }
    }
  })
  
  // Return full recipe data with instructions for baker
  return Response.json({
    order,
    recipes: {
      batter: order.cakeTiers.map(t => ({
        recipe: t.batterRecipe, // Includes instructions
        multiplier: t.batterMultiplier
      }))
      // ... filling, frosting
    }
  })
}
```

### Option 3: Update Costing Query (Include Instructions)

Modify costing query to optionally include instructions:

```typescript
// In lib/costing.ts - calculateOrderCosting function
const order = await prisma.cakeOrder.findUnique({
  where: { id: orderId },
  include: {
    cakeTiers: {
      include: {
        tierSize: {
          include: {
            batterRecipe: {
              include: {
                recipeIngredients: {
                  include: { ingredient: true }
                },
                laborRole: true
                // Instructions are automatically included (they're part of Recipe model)
                // No need to explicitly include - Prisma includes all fields by default
              }
            }
          }
        }
      }
    }
  }
})

// Instructions will be available in batterRecipe.instructions
// But currently not used in costing calculation (which is fine)
```

---

## Current Implementation Details

### In `lib/costing.ts`:

**Lines 198-227**: Recipe queries
- ✅ Include `recipeIngredients` (for ingredient costs)
- ✅ Include `laborRole` (for labor rate)
- ✅ Include `laborMinutes` (automatically, part of Recipe model)
- ⚠️ Instructions are included (part of Recipe model) but not used in costing

**Lines 378, 414, 450**: Labor cost calculation
- Uses `batterRecipe.laborMinutes` directly
- Multiplies by multiplier
- Calculates cost: `(scaledMinutes / 60) * roleRate`
- **This is correct** - no need to parse instructions for costing

### In `app/admin/recipes/recipe-form.tsx`:

**Lines 122-128**: Calculate labor from instructions
- Parses instruction steps
- Calculates `prepMinutesFromSteps`, `bakeMinutesFromSteps`, `coolMinutesFromSteps`
- Sums to get total labor minutes

**Lines 213-227**: Save to database
- Saves `instructions` (JSON string)
- Saves `prepMinutes`, `bakeMinutes`, `coolMinutes`
- Calculates and saves `laborMinutes`

---

## Best Practice Recommendation

### For Costing (Current - Keep As Is):
- ✅ Use `laborMinutes` directly
- ✅ Fast, efficient, no parsing needed
- ✅ Works even if instructions aren't entered

### For Production (Add This):
- ✅ Include full recipe with instructions
- ✅ Create production endpoint or add to costing result
- ✅ Baker gets step-by-step instructions
- ✅ Includes prep/bake/cool time breakdown

### Implementation:

```typescript
// Add to CostingResult interface
export interface CostingResult {
  // ... existing fields
  
  // Add for production use
  recipes?: {
    tierId: number
    tierName: string
    batter?: {
      recipe: {
        id: number
        name: string
        instructions: string | null      // Full instructions for baker
        prepMinutes: number | null
        bakeMinutes: number | null
        coolMinutes: number | null
        laborMinutes: number | null
        laborRole: { name: string; hourlyRate: number } | null
      }
      multiplier: number
      scaledIngredients: {...}[]        // Ingredients scaled by multiplier
    }
    // ... filling, frosting
  }[]
}
```

---

## Summary

1. **Instructions are used** in recipe form to calculate `laborMinutes`
2. **laborMinutes is NOT removed** - it's still needed for quick costing
3. **Instructions are needed** for production (baker needs full recipe)
4. **Current costing is correct** - uses `laborMinutes` (fast, efficient)
5. **Add instructions to production data** - create separate endpoint or add to costing result when needed

The system is working correctly! Instructions calculate laborMinutes, and laborMinutes is used for costing. For production reports, you just need to include the full recipe data (which includes instructions).


