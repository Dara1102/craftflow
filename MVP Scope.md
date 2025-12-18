# MVP Scope – Cake Costing App

This file defines EXACTLY what should be built for the first version.

## 1. Tech stack

- Next.js (App Router, TypeScript)
- Prisma + Postgres
- Simple auth (single bakery user; NextAuth or a minimal placeholder is fine)
- Tailwind CSS for quick styling

## 2. Entities (Prisma models)

Implement these models (names can be adjusted slightly if needed for conventions):

### Ingredient

- id
- name (string)
- unit (string; e.g., "g", "kg", "ml", "piece")
- costPerUnit (decimal)

### Recipe

- id
- name (string)
- type (enum: BATTER, FILLING, FROSTING)
- yieldDescription (string; e.g., "for one 8-inch round layer")

### RecipeIngredient

- id
- recipeId (FK → Recipe)
- ingredientId (FK → Ingredient)
- quantity (decimal, in the Ingredient.unit units)

### TierSize

- id
- name (string; e.g., "6 inch round")
- diameterCm (decimal)
- heightCm (decimal)
- servings (int)
- batterRecipeId (FK → Recipe)
- batterMultiplier (decimal)
- frostingRecipeId (FK → Recipe, optional)
- frostingMultiplier (decimal, optional)

### DecorationMaterial

- id
- name (string; e.g., "fondant", "8 inch board", "dowel")
- unit (string)
- costPerUnit (decimal)
- usageRuleType (enum: FONDANT_PER_SURFACE_AREA, PER_TIER, PER_SERVING, MANUAL)
- usageRuleValue (decimal; meaning depends on usageRuleType)

### CakeOrder

- id
- customerName (string)
- eventDate (date)
- notes (string, optional)
- servingsTarget (int, optional)
- estimatedHours (decimal)
- status (enum: DRAFT, CONFIRMED)

### CakeTier

- id
- cakeOrderId (FK → CakeOrder)
- tierIndex (int; 1 = bottom)
- tierSizeId (FK → TierSize)
- flavor (string)
- filling (string)
- finishType (string; e.g., "buttercream", "fondant")

### Setting

- id
- key (string)
- value (string)

Used for:
- `LaborRatePerHour`
- `MarkupPercent` (e.g., "0.7" for 70% markup)

## 3. Calculations

Create a reusable module: `lib/costing.ts`.

Given a `CakeOrder`, calculate:

1. **Total servings**

- Sum `TierSize.servings` across all CakeTiers for that order.

2. **Total ingredients**

- For each tier:
  - Batter: `TierSize.batterRecipeId` × `batterMultiplier`.
  - Frosting (if set): `TierSize.frostingRecipeId` × `frostingMultiplier`.
- For each recipe, load `RecipeIngredient`s and multiply quantities by the multiplier.
- Aggregate by `Ingredient` → total quantity per ingredient.

3. **Decoration / structural materials**

Use simple rules:

- Fondant:
  - Take the `DecorationMaterial` with `usageRuleType = FONDANT_PER_SURFACE_AREA`.
  - For each tier:
    - circumference = pi × diameterCm
    - side area ≈ circumference × heightCm
    - fondantNeeded = side area × usageRuleValue
  - Sum across tiers.

- Boards:
  - For MVP, assume 1 board per order using a DECORATION material with PER_TIER or MANUAL; hardcode this assumption in the code comments.

- Dowels:
  - Simple rule: 4 dowels per tier except the top tier.

4. **Cost**

- IngredientCost = sum(totalIngredientQty × ingredient.costPerUnit).
- DecorationCost = Calculated from `DecorationTechnique` records with unit types:
  - **SINGLE**: quantity × baseCost (no scaling)
  - **CAKE**: quantity × totalSurfaceAreaMultiplier × baseCost (scales by all tiers)
  - **TIER**: quantity × avgSizeMultiplier × baseCost (scales by selected tiers only)
  - **SET**: quantity × baseCost (no scaling)
- LaborCost = Role-based calculation:
  - Recipe labor (from recipes with laborRole)
  - Tier assembly labor (from tier sizes with assemblyRole)
  - Decoration labor (from decoration techniques with laborRole)
  - Manual labor (from bakerHours/assistantHours)

5. **Suggested price**

- totalCost = IngredientCost + DecorationCost + LaborCost.
- markupPercent = value from Setting (parseFloat).
- suggestedPrice = totalCost × (1 + markupPercent).
- Also compute:
  - costPerServing
  - suggestedPricePerServing

Return a structured result, for example:
{  
totalServings,  
ingredients: [{ ingredientId, name, quantity, unit, cost }],  
materials: [{ materialId, name, quantity, unit, cost }],  
ingredientCost,  
decorationCost,  
laborCost,  
totalCost,  
markupPercent,  
suggestedPrice,  
costPerServing,  
suggestedPricePerServing,  
}

## 4. Pages / Flows

Use Next.js App Router.

### 4.1 Dashboard (`/`)

- List all `CakeOrder`s:
  - customerName
  - eventDate
  - totalServings (computed)
  - suggestedPrice
  - status
- Button: “Create New Cake Order”

### 4.2 New / Edit Order (`/orders/new`, `/orders/[id]`)

- Form fields for:
  - customerName
  - eventDate
  - notes
  - estimatedHours
  - status (DRAFT, CONFIRMED)

- Section to manage tiers:
  - Show list of tiers (CakeTier).
  - For each tier:
    - TierSize select
    - flavor
    - filling
    - finishType
  - Buttons: “Add Tier”, “Remove Tier”

- Sidebar / panel:
  - Show total tiers and total servings (if easy).
  - Show rough cost + suggested price (can be updated on save or via a “Recalculate” button).

### 4.3 Order Costing (`/orders/[id]/costing`)

- Header:
  - customerName
  - eventDate
  - status
  - total servings
  - suggested price

- Sections:
  - Cost summary:
    - Ingredients, decorations, labor, total.
  - Table: Ingredients:
    - name, quantity + unit, cost.
  - Table: Materials:
    - name, quantity + unit, cost.
  - Labor summary:
    - estimatedHours, labor rate, labor cost.

- This page should call a server action / API that uses `lib/costing.ts`.

### 4.4 Simple Admin Pages

Basic CRUD (no fancy UX required):

- `/admin/ingredients`
- `/admin/recipes`
- `/admin/tiers`
- `/admin/decorations`
- `/admin/settings`

Each page:

- List existing items.
- Button to add new.
- Simple edit form.

## 5. Seed data

Create a seed script that inserts:

- A few Ingredients:
  - flour, sugar, eggs, butter, milk, fondant.
- A couple of Recipes:
  - vanilla sponge batter
  - vanilla buttercream
- A few TierSizes:
  - 6" round, 8" round, 10" round with reasonable servings and multipliers.
- DecorationMaterials:
  - fondant (FONDANT_PER_SURFACE_AREA, with a reasonable grams/cm² value)
  - cake board
  - dowel (PER_TIER or MANUAL)
- Settings:
  - LaborRatePerHour (e.g., 20)
  - MarkupPercent (e.g., 0.7)

## 6. Out of scope

- Multi-tenant models (`Business`, `BusinessUser`, subscriptions).
- Other product categories.
- AI image generation.
- Integration with payments.
- Complex workflows.


