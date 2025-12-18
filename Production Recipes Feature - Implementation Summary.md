# Production Recipes Feature - Implementation Summary

## What Was Added

The costing engine now supports including **full recipe data with instructions** for production use, while keeping costing calculations fast and efficient.

---

## Changes Made

### 1. Updated `lib/costing.ts`

**Added `includeFullRecipes` parameter:**
```typescript
export async function calculateOrderCosting(
  orderId: number,
  includeFullRecipes: boolean = false  // NEW: Optional parameter
): Promise<CostingResult>
```

**When `includeFullRecipes = true`, the result includes:**
- Full recipe data with `instructions` (step-by-step JSON)
- `prepMinutes`, `bakeMinutes`, `coolMinutes` (time breakdowns)
- `yieldDescription` (recipe yield info)
- Scaled ingredients (quantities multiplied by tier multiplier)
- Scaled labor times (prep/bake/cool/labor minutes scaled by multiplier)

### 2. Updated Interfaces

**`RecipeMatch` interface** now includes:
```typescript
export interface RecipeMatch {
  recipe: {
    // ... existing fields
    instructions?: string | null        // Step-by-step instructions
    prepMinutes?: number | null         // Prep time breakdown
    bakeMinutes?: number | null         // Bake time breakdown
    coolMinutes?: number | null         // Cool time breakdown
    yieldDescription?: string           // Recipe yield description
  }
  multiplier: number
  scaledIngredients?: {...}[]           // Scaled ingredients for production
}
```

**`CostingResult` interface** now includes:
```typescript
export interface CostingResult {
  // ... existing fields
  productionRecipes?: {
    tierId: number
    tierIndex: number
    tierName: string
    batter?: RecipeMatch & {
      scaledPrepMinutes?: number | null
      scaledBakeMinutes?: number | null
      scaledCoolMinutes?: number | null
      scaledLaborMinutes?: number | null
    }
    filling?: RecipeMatch & {...}
    frosting?: RecipeMatch & {...}
  }[]
}
```

### 3. Created Production API Endpoint

**New endpoint:** `/api/orders/[id]/production`

Returns full order data with complete recipe information for production use.

---

## How to Use

### For Costing (Default - Fast)

```typescript
// Default behavior - fast, no full recipes
const costing = await calculateOrderCosting(orderId)
// costing.productionRecipes = undefined
```

### For Production (Full Recipe Data)

```typescript
// Include full recipes with instructions
const costing = await calculateOrderCosting(orderId, true)
// costing.productionRecipes = [...full recipe data...]
```

### Using the Production API Endpoint

```typescript
// GET /api/orders/[id]/production
const response = await fetch(`/api/orders/${orderId}/production`)
const data = await response.json()

// data.production.recipes contains full recipe data with:
// - instructions (step-by-step)
// - prepMinutes, bakeMinutes, coolMinutes
// - scaledIngredients (quantities for this tier)
// - scaledPrepMinutes, scaledBakeMinutes, etc.
```

---

## Example Response

### Costing Endpoint (Default)
```json
{
  "totalServings": 50,
  "ingredientCost": 25.50,
  "totalCost": 150.00,
  "suggestedPrice": 255.00,
  "recipeMatches": [
    {
      "tierId": 1,
      "tierName": "8 inch round",
      "batter": {
        "recipe": {
          "id": 1,
          "name": "Vanilla Sponge Batter",
          "laborMinutes": 30
          // No instructions (not included for performance)
        },
        "multiplier": 1.2
      }
    }
  ],
  "productionRecipes": undefined  // Not included
}
```

### Production Endpoint (Full Recipes)
```json
{
  "order": {
    "id": 1,
    "customerName": "John Doe",
    "eventDate": "2024-12-25"
  },
  "costing": {
    "totalServings": 50,
    "ingredientCost": 25.50,
    "totalCost": 150.00,
    "suggestedPrice": 255.00
  },
  "production": {
    "recipes": [
      {
        "tierId": 1,
        "tierIndex": 1,
        "tierName": "8 inch round",
        "batter": {
          "recipe": {
            "id": 1,
            "name": "Vanilla Sponge Batter",
            "instructions": "[{\"step\": 1, \"description\": \"Mix dry ingredients\", \"minutes\": 5, \"type\": \"prep\"}, ...]",
            "prepMinutes": 15,
            "bakeMinutes": 30,
            "coolMinutes": 20,
            "laborMinutes": 30,
            "yieldDescription": "For one 8-inch round layer"
          },
          "multiplier": 1.2,
          "scaledIngredients": [
            {
              "ingredientId": 1,
              "name": "Flour",
              "quantity": 600.0,
              "unit": "g"
            }
          ],
          "scaledPrepMinutes": 18,
          "scaledBakeMinutes": 36,
          "scaledCoolMinutes": 24,
          "scaledLaborMinutes": 36
        }
      }
    ]
  }
}
```

---

## Benefits

### 1. **Performance**
- Default costing remains fast (no instruction parsing)
- Full recipes only loaded when needed (production)

### 2. **Flexibility**
- Costing calculations unchanged (backward compatible)
- Production data available when needed

### 3. **Complete Data**
- Bakers get full step-by-step instructions
- Scaled ingredients for each tier
- Scaled labor times for scheduling

---

## Usage Scenarios

### Scenario 1: Costing Report (Dashboard)
```typescript
// Fast - no full recipes needed
const costing = await calculateOrderCosting(orderId)
// Use for: pricing, cost breakdown, profit margins
```

### Scenario 2: Production Sheet (Baker)
```typescript
// Full recipes with instructions
const response = await fetch(`/api/orders/${orderId}/production`)
const data = await response.json()
// Use for: production workflow, ingredient lists, time estimates
```

### Scenario 3: Quote Generation
```typescript
// Fast costing for quotes
const costing = await calculateOrderCosting(orderId, false)
// Use for: customer quotes, pricing estimates
```

---

## Backward Compatibility

✅ **All existing code continues to work:**
- Default parameter (`includeFullRecipes = false`) maintains current behavior
- No breaking changes to existing interfaces
- Existing API calls unchanged

---

## Next Steps

### 1. Create Production Page
Create `/app/orders/[id]/production/page.tsx` to display full recipe data for bakers.

### 2. Add Production Print View
Create printable production sheet with:
- Step-by-step instructions
- Scaled ingredient lists
- Time estimates
- Tier-by-tier breakdown

### 3. Add Recipe Instructions Parser
Create utility to parse and display instruction JSON:
```typescript
function parseInstructions(instructionsJson: string | null) {
  if (!instructionsJson) return []
  return JSON.parse(instructionsJson)
}
```

---

## Summary

✅ **Instructions are now included** when `includeFullRecipes = true`
✅ **laborMinutes is still used** for fast costing (not removed)
✅ **Full recipes available** for production use
✅ **Backward compatible** - existing code unchanged
✅ **Production API endpoint** created for easy access

The system now supports both:
- **Fast costing** (uses laborMinutes)
- **Full production data** (includes instructions)

Both work together perfectly! 🎉

