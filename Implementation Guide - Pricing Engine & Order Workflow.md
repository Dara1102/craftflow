# Implementation Guide: Pricing Engine & Order Workflow
## Custom Bakery ERP System

This document outlines how to build the pricing engine and order workflow system, incorporating best practices from Cybake, BakeSmart, and Flexibake, plus industry standards for custom bakery operations.

---

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Order Creation Workflow](#order-creation-workflow)
3. [Pricing Engine Architecture](#pricing-engine-architecture)
4. [Quote Generation for Salespeople](#quote-generation-for-salespeople)
5. [Cost Calculation Breakdown](#cost-calculation-breakdown)
6. [Material Cost Tracking](#material-cost-tracking)
7. [Enhanced Features from Competitors](#enhanced-features-from-competitors)
8. [Implementation Roadmap](#implementation-roadmap)

---

## System Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Order Entry  │  │ Quote Builder│  │ Cost Viewer  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Pricing Engine Service Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Cost Calc    │  │ Quote Engine │  │ Material     │      │
│  │ Engine       │  │              │  │ Tracker      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Layer (Prisma + Postgres)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Orders       │  │ Recipes      │  │ Inventory    │      │
│  │ Pricing      │  │ Ingredients  │  │ Materials    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Order Creation Workflow

### Phase 1: Initial Inquiry → Quote Generation

**Step 1: Customer Inquiry Capture**
- Salesperson enters customer details (name, contact, event date, )
- Captures initial requirements:
  - Event type (wedding, birthday, corporate, etc.)
  - Number of servings needed
  - Design preferences (photos, descriptions)
  - Special dietary requirements
  - Delivery/pickup preferences

**Step 2: Product Configuration**
- Salesperson selects cake structure:
  - Number of tiers
  - Size for each tier (from TierSize catalog)
  - Flavor for each tier (batter recipe)
  - Filling for each tier
  - Finish type (buttercream, fondant, ganache, etc.)
  - Decoration complexity level
  - Banner Y/N 
  - Banner Message

**Step 3: Real-Time Cost Calculation**
- As each tier is added/modified, pricing engine calculates:
  - Material costs (ingredients + decorations)
  - Labor estimate (based on complexity)
  - Total cost to company
  - Suggested customer price (with markup)

**Step 4: Quote Generation**
- System generates quote document showing:
  - Itemized breakdown
  - Cost summary
  - Suggested price
  - Price per serving
  - Expiration date (typically 7-30 days)
- Salesperson can:
  - Adjust markup percentage
  - Add custom line items
  - Apply discounts
  - Save as draft or send to customer

**Step 5: Quote Approval & Sending**
- Quote can be reviewed by manager (if required)
- Sent to customer via email/PDF
- Customer can accept, request changes, or decline

### Phase 2: Quote Acceptance → Order Confirmation

**Step 6: Order Confirmation**
- When customer accepts quote:
  - Quote converts to confirmed order
  - Status changes: DRAFT → CONFIRMED
  - Event date locked in
  - Production schedule updated

**Step 7: Material Reservation**
- System reserves materials from inventory:
  - Ingredients needed
  - Decoration materials
  - Structural components (boards, dowels)
- Inventory levels updated (available vs. reserved)

**Step 8: Production Planning**
- Order appears in production schedule
- Labor hours allocated
- Production date calculated based on event date

---

## Pricing Engine Architecture

### Core Pricing Engine Module: `lib/costing.ts`

**Note:** The actual implementation is in `lib/costing.ts`, not `lib/pricing-engine.ts`. This document reflects the actual codebase.

The pricing engine calculates both:
1. **Cost to Company** (COGS - Cost of Goods Sold)
2. **Price to Customer** (with markup and adjustments)

### Key Functions

#### 1. `calculateOrderCosting(orderId: number, includeFullRecipes?: boolean): Promise<CostingResult>`

This is the main calculation function that processes a complete order.

```typescript
interface CostingResult {
  // Material Costs
  ingredientCost: number;
  decorationMaterialCost: number;
  decorationLaborCost: number;
  topperCost: number;
  deliveryCost: number;
  
  // Labor Costs (Role-Based)
  baseLaborCost: number;        // Recipe + assembly + manual labor
  totalLaborCost: number;        // Base + decoration labor
  laborBreakdown: LaborBreakdown[];  // Breakdown by role with different rates
  
  // Totals
  totalCost: number;
  costPerServing: number;
  
  // Pricing
  markupPercent: number;
  suggestedPrice: number;
  discountAmount: number;
  finalPrice: number;
  suggestedPricePerServing: number;
  
  // Detailed breakdowns
  ingredients: IngredientCostDetail[];
  decorations: DecorationCostDetail[];
  topper: TopperCostDetail | null;
  delivery: DeliveryCostDetail | null;
  discount: DiscountDetail | null;
  
  // Production recipes (when includeFullRecipes = true)
  productionRecipes?: {...}[]
}
```

#### Labor Breakdown (Role-Based)

```typescript
interface LaborBreakdown {
  role: string;        // e.g., "Baker", "Decorator", "Bakery Assistant"
  hours: number;      // Total hours for this role
  rate: number;       // Hourly rate for this role
  cost: number;       // Total cost (hours × rate)
}
```

**Example:**
```typescript
laborBreakdown: [
  { role: "Baker", hours: 2.5, rate: 21, cost: 52.50 },
  { role: "Decorator", hours: 3.0, rate: 30, cost: 90.00 },
  { role: "Bakery Assistant", hours: 1.0, rate: 18, cost: 18.00 }
]
```

#### 2. Labor Cost Calculation (Role-Based)

The system uses **role-based labor costs** with different hourly rates:

**Labor Roles:**
- **Baker** ($21/hr) - Recipe preparation, tier assembly
- **Decorator** ($30/hr) - Decoration techniques, finishing
- **Bakery Assistant** ($18/hr) - Simple tasks, packaging

**How Labor is Calculated:**

1. **Recipe Labor:**
   - Each recipe has `laborRole` and `laborMinutes`
   - Scaled by recipe multiplier
   - Cost = (scaledMinutes / 60) × role.hourlyRate

2. **Tier Assembly Labor:**
   - Each `TierSize` has `assemblyMinutes` and `assemblyRole`
   - Cost = (assemblyMinutes / 60) × role.hourlyRate

3. **Decoration Labor:**
   - Each `DecorationTechnique` has `laborMinutes` and `laborRole`
   - Quantity multiplied based on unit type (CAKE, TIER, SET)
   - Cost = (totalMinutes / 60) × role.hourlyRate

4. **Manual Labor:**
   - Order has `bakerHours` and `assistantHours` for additional work
   - Cost = bakerHours × bakerRate + assistantHours × assistantRate

**All labor is tracked by role** and aggregated into `laborBreakdown` array.

#### 3. Recipe Cost Calculation

Recipes are calculated with volume-based multipliers:

**Multiplier Calculation:**
- Uses `recipe.yieldVolumeMl` and `tierSize.volumeMl`
- Different factors for recipe types:
  - **BATTER**: 1.0 (full volume)
  - **FROSTING**: 0.36 (surface coverage)
  - **FILLING**: 0.12 (thin layer)

**Recipe Labor:**
- Each recipe has `laborMinutes` and `laborRole`
- Labor is scaled by multiplier
- Uses role-specific hourly rate

**Example:**
```typescript
// Vanilla Sponge Batter recipe
- yieldVolumeMl: 2000
- laborMinutes: 30
- laborRole: Baker ($21/hr)

// For 10" round tier (volumeMl: 4000)
- multiplier: 4000 / 2000 = 2.0
- scaled labor: 30 × 2.0 = 60 minutes
- labor cost: (60 / 60) × $21 = $21.00
```

#### 4. Decoration Cost Calculation

Decorations use `DecorationTechnique` model with role-based labor:

**Decoration Structure:**
- Each technique has:
  - `defaultCostPerUnit` (material cost)
  - `laborMinutes` (labor time)
  - `laborRole` (who performs it - uses role's hourly rate)
  - `unit` (CAKE, TIER, or SET)

**Quantity Calculation:**
- **CAKE**: Uses order quantity directly
- **TIER**: Quantity × number of tiers
- **SET**: Uses order quantity directly

**Cost Calculation:**
```typescript
materialCost = defaultCostPerUnit × quantityMultiplier
laborMinutes = technique.laborMinutes × quantityMultiplier
laborCost = (laborMinutes / 60) × laborRole.hourlyRate
totalCost = materialCost + laborCost
```

**Example:**
```typescript
// Sugar Flowers decoration
- defaultCostPerUnit: $15.00
- laborMinutes: 45
- laborRole: Decorator ($30/hr)
- unit: TIER
- quantity: 1

// For 3-tier cake:
- quantityMultiplier: 1 × 3 = 3
- materialCost: $15.00 × 3 = $45.00
- laborCost: (45 × 3 / 60) × $30 = $67.50
- totalCost: $112.50
```

---

## Quote Generation for Salespeople

### Real-Time Quote Builder Interface

**Component: `/app/quotes/new/page.tsx`**

The quote builder allows salespeople to:
1. Build quotes interactively
2. See real-time cost updates
3. Adjust pricing on the fly
4. Save drafts and send quotes

### Key Features

#### 1. **Live Cost Calculator Panel**
- Always visible sidebar showing:
  - Current total cost to company
  - Suggested price (with current markup)
  - Price per serving
  - Profit margin percentage
  - Material cost breakdown

#### 2. **Tier Builder**
- Drag-and-drop interface for adding tiers
- Visual preview of cake structure
- Quick size/flavor selectors
- Real-time cost update as tiers are added/modified

#### 3. **Markup Adjuster**
- Slider or input for markup percentage
- Shows impact on:
  - Final price
  - Profit margin
  - Price per serving
- Can set different markups for:
  - Different customer tiers
  - Different order types
  - Rush orders

#### 4. **Custom Line Items**
- Salesperson can add:
  - Custom decoration charges
  - Delivery fees
  - Rush order premiums
  - Design consultation fees

#### 5. **Discount Management**
- Apply percentage discounts
- Apply fixed amount discounts
- Track discount reason/approval

#### 6. **Quote Comparison**
- Show multiple pricing scenarios:
  - Standard pricing
  - Premium pricing (higher markup)
  - Competitive pricing (lower markup)
- Helps salesperson choose best option

### Quote Document Structure

```typescript
interface Quote {
  id: string;
  quoteNumber: string; // e.g., "Q-2024-001"
  customerId: string;
  customerName: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  
  // Order details
  eventDate: Date;
  eventType: string;
  servings: number;
  tiers: TierQuote[];
  
  // Pricing
  costBreakdown: OrderCostBreakdown;
  markupPercent: number;
  basePrice: number;
  customLineItems: CustomLineItem[];
  discounts: Discount[];
  finalPrice: number;
  
  // Metadata
  salespersonId: string;
  notes: string;
  termsAndConditions: string;
}
```

---

## Cost Calculation Breakdown

### 1. Ingredient Cost Calculation

**Process:**
```
For each tier in order:
  1. Get TierSize → batterRecipeId, batterMultiplier
  2. Get TierSize → frostingRecipeId, frostingMultiplier (if applicable)
  3. Get TierSize → fillingRecipeId, fillingMultiplier (if applicable)
  
  4. For each recipe:
     a. Load RecipeIngredient records
     b. Multiply each quantity by multiplier
     c. Calculate: quantity × ingredient.costPerUnit
  
  5. Aggregate all ingredient costs across all tiers
```

**Example:**
```
Tier 1 (8" round):
  - Batter: Vanilla Sponge × 1.0 multiplier
    - Flour: 500g × $0.002/g = $1.00
    - Sugar: 300g × $0.003/g = $0.90
    - Eggs: 4 × $0.25 = $1.00
    - Butter: 200g × $0.005/g = $1.00
    - Batter subtotal: $3.90
  
  - Frosting: Vanilla Buttercream × 1.2 multiplier
    - Butter: 300g × $0.005/g = $1.50
    - Powdered Sugar: 400g × $0.002/g = $0.80
    - Vanilla: 5ml × $0.10/ml = $0.50
    - Frosting subtotal: $2.80
  
  Tier 1 ingredient cost: $6.70
```

### 2. Decoration Cost Calculation

**Actual Implementation Uses `DecorationTechnique` Model:**

Decorations are tracked via `OrderDecoration` records that reference `DecorationTechnique`:

**Decoration Structure:**
- Each technique has:
  - `defaultCostPerUnit` (material cost)
  - `laborMinutes` (labor time)
  - `laborRole` (who performs it - uses role's hourly rate)
  - `unit` (CAKE, TIER, or SET)

**Unit Types and Quantity Calculation:**
- **SINGLE**: Quantity = number of items (e.g., 5 sugar flowers)
- **CAKE**: Quantity = number of instances on whole cake, scales by total surface area of all tiers
- **TIER**: Quantity = number of tiers this applies to, scales by average size of **selected tiers**
- **SET**: Quantity = number of sets

**Tier Selection for TIER Unit Decorations:**
When a decoration has `unit = 'TIER'`, users can now select which specific tiers the decoration applies to:
- User selects tier checkboxes (Tier 1, Tier 2, Tier 3, etc.)
- Cost calculation uses only the selected tiers for size scaling
- If no tiers are selected, validation prevents saving
- When tiers are added/removed, decorations automatically update their tier selections

**Cost Calculation:**
```typescript
quantityMultiplier = orderDecoration.quantity

if (technique.unit === 'SINGLE') {
  // No scaling - quantity is number of items
  quantityMultiplier = orderDecoration.quantity
}
else if (technique.unit === 'CAKE') {
  // Scale by total surface area of all tiers
  totalSurfaceArea = sum of (top + side surface) for all tiers
  baseSurfaceArea = calculate from technique.baseCakeSize
  quantityMultiplier = orderDecoration.quantity × (totalSurfaceArea / baseSurfaceArea)
}
else if (technique.unit === 'TIER') {
  // Scale by average size of SELECTED tiers only
  selectedTiers = orderDecoration.tierIndices || allTiers
  avgSizeMultiplier = average of size multipliers for selectedTiers
  quantityMultiplier = orderDecoration.quantity × avgSizeMultiplier
}
else if (technique.unit === 'SET') {
  // No scaling - quantity is number of sets
  quantityMultiplier = orderDecoration.quantity
}

materialCost = technique.defaultCostPerUnit × quantityMultiplier
laborMinutes = technique.laborMinutes × quantityMultiplier
laborCost = (laborMinutes / 60) × technique.laborRole.hourlyRate
totalCost = materialCost + laborCost
```

**Example:**
```
Sugar Flowers decoration:
- defaultCostPerUnit: $15.00
- laborMinutes: 45
- laborRole: Decorator ($30/hr)
- unit: TIER
- quantity: 1

For 3-tier cake:
- quantityMultiplier: 1 × 3 = 3
- materialCost: $15.00 × 3 = $45.00
- laborCost: (45 × 3 / 60) × $30 = $67.50
- totalCost: $112.50
```

**Note:** The system does NOT currently calculate fondant/boards/dowels automatically. These would need to be added as `DecorationTechnique` entries if needed.

### 3. Labor Cost Calculation (Role-Based)

**Current Implementation (Already Built):**

Labor costs are calculated from multiple sources and aggregated by role:

1. **Recipe Labor:**
   - Each recipe has `laborMinutes` and `laborRole`
   - Scaled by recipe multiplier
   - Cost = (scaledMinutes / 60) × role.hourlyRate

2. **Tier Assembly Labor:**
   - Each `TierSize` has `assemblyMinutes` and `assemblyRole`
   - Cost = (assemblyMinutes / 60) × role.hourlyRate

3. **Decoration Labor:**
   - Each `DecorationTechnique` has `laborMinutes` and `laborRole`
   - Quantity multiplied based on unit type
   - Cost = (totalMinutes / 60) × role.hourlyRate

4. **Manual Labor:**
   - Order has `bakerHours` and `assistantHours` for additional work
   - Cost = bakerHours × bakerRate + assistantHours × assistantRate

**Labor Roles:**
- **Baker** ($21/hr) - Recipe prep, tier assembly
- **Decorator** ($30/hr) - Decoration techniques
- **Bakery Assistant** ($18/hr) - Simple tasks, packaging

**Result:** `laborBreakdown` array showing cost per role:
```typescript
[
  { role: "Baker", hours: 2.5, rate: 21, cost: 52.50 },
  { role: "Decorator", hours: 3.0, rate: 30, cost: 90.00 }
]
```

**Total Labor:**
- `baseLaborCost` = recipe + assembly + manual (excludes decoration)
- `totalLaborCost` = baseLaborCost + decorationLaborCost

### 4. Total Cost to Company

```
totalCostToCompany = 
  ingredientCost +
  decorationCost +
  structuralMaterialCost +
  laborCost +
  overheadCost (if applicable)
```

### 5. Customer Price Calculation

```
basePrice = totalCostToCompany × (1 + markupPercent)

finalPrice = basePrice + customLineItems - discounts

pricePerServing = finalPrice / totalServings
```

---

## Material Cost Tracking

### Real-Time Inventory Integration

**Enhanced Prisma Schema Additions:**

```prisma
model Inventory {
  id            String   @id @default(cuid())
  ingredientId  String
  ingredient    Ingredient @relation(fields: [ingredientId], references: [id])
  quantity      Decimal  // current quantity in stock
  reservedQty   Decimal  @default(0) // reserved for orders
  availableQty  Decimal  // quantity - reservedQty
  unit          String
  lastUpdated   DateTime @default(now())
  
  @@unique([ingredientId])
}

model MaterialReservation {
  id            String   @id @default(cuid())
  orderId       String
  order         CakeOrder @relation(fields: [orderId], references: [id])
  ingredientId  String
  ingredient    Ingredient @relation(fields: [ingredientId], references: [id])
  quantity      Decimal
  unit          String
  status        String   // 'RESERVED', 'CONSUMED', 'RELEASED'
  createdAt     DateTime @default(now())
}
```

### Material Tracking Workflow

**1. During Quote Creation:**
- Check material availability
- Show warnings if materials are low
- Reserve materials when quote is sent (optional)

**2. When Order Confirmed:**
- Reserve materials from inventory
- Update `Inventory.reservedQty`
- Create `MaterialReservation` records

**3. During Production:**
- Mark materials as consumed
- Update actual usage (may differ from estimated)
- Update inventory levels

**4. If Order Cancelled:**
- Release reserved materials
- Update inventory availability

### Cost Tracking Features

**1. Ingredient Cost History:**
- Track cost changes over time
- Show cost trends
- Alert when costs increase significantly

**2. Recipe Cost Versioning:**
- Store historical recipe costs
- Compare current vs. past costs
- Identify cost drivers

**3. Margin Analysis:**
- Track profit margins per order
- Identify low-margin orders
- Suggest pricing adjustments

---

## Enhanced Features from Competitors

### From Cybake:
1. **Automatic Price Updates**
   - When ingredient costs change, automatically recalculate recipe costs
   - Option to auto-update quotes (with approval)

2. **Customer-Specific Pricing**
   - Different markup percentages for different customers
   - Volume discounts for repeat customers
   - Wholesale vs. retail pricing tiers

3. **Scheduled Price Changes**
   - Schedule price increases in advance
   - Apply to all products or specific categories

### From BakeSmart:
1. **Cake Matrix Module**
   - Pre-configured cake combinations
   - Quick quote generation from templates
   - Standard pricing for common orders

2. **Time Card Integration**
   - Track actual labor hours
   - Compare estimated vs. actual
   - Improve future estimates

3. **Production Reporting**
   - Daily production reports
   - Cost analysis reports
   - Profitability reports

### From Flexibake:
1. **Standing Orders**
   - Recurring orders (weekly, monthly)
   - Automatic quote generation
   - Batch processing

2. **Shadow Orders**
   - Duplicate orders with modifications
   - Quick re-quote for similar orders

3. **Batch Tracking**
   - Track which batch of ingredients was used
   - Lot traceability for compliance

### Additional Best Practices:

1. **Quote Templates**
   - Save common configurations
   - Quick quote from templates
   - Standard designs library

2. **Photo Attachments**
   - Attach customer photos to quotes
   - Design reference images
   - Before/after photos

3. **Approval Workflows**
   - Manager approval for discounts
   - Approval for custom pricing
   - Audit trail

4. **Customer Portal**
   - Customers can view quotes online
   - Accept/decline quotes digitally
   - Request modifications

5. **Mobile App for Sales**
   - Quote on-the-go
   - Photo capture
   - Customer lookup

---

## Implementation Roadmap

### Phase 1: Core Pricing Engine (MVP)
**Duration: 2-3 weeks**

1. **Week 1:**
   - Implement `lib/costing.ts` (from MVP scope)
   - Enhance with detailed breakdowns
   - Add material cost tracking

2. **Week 2:**
   - Build quote generation API
   - Create quote builder UI
   - Real-time cost calculation

3. **Week 3:**
   - Quote document generation (PDF)
   - Email integration
   - Testing and refinement

### Phase 2: Enhanced Features
**Duration: 3-4 weeks**

1. **Material Reservation System**
   - Inventory tracking
   - Reservation workflow
   - Availability checks

2. **Advanced Pricing**
   - Customer-specific pricing
   - Volume discounts
   - Custom line items

3. **Quote Management**
   - Quote templates
   - Quote comparison
   - Approval workflows

### Phase 3: Production Integration
**Duration: 2-3 weeks**

1. **Production Planning**
   - Schedule integration
   - Material consumption tracking
   - Actual vs. estimated comparison

2. **Reporting & Analytics**
   - Cost analysis reports
   - Margin reports
   - Quote conversion tracking

### Phase 4: Advanced Features
**Duration: Ongoing**

1. **Customer Portal**
2. **Mobile App**
3. **AI-powered cost estimation**
4. **Integration with accounting systems**

---

## Technical Implementation Details

### Pricing Engine Service: `lib/pricing-engine.ts`

```typescript
export class PricingEngine {
  /**
   * Main entry point for calculating order costs
   */
  async calculateOrderCost(orderId: string): Promise<OrderCostBreakdown> {
    // 1. Load order with all relations
    const order = await this.loadOrder(orderId);
    
    // 2. Calculate ingredient costs
    const ingredientCost = await this.calculateIngredientCost(order);
    
    // 3. Calculate decoration costs
    const decorationCost = await this.calculateDecorationCost(order);
    
    // 4. Calculate labor costs
    const laborCost = await this.calculateLaborCost(order);
    
    // 5. Calculate total cost
    const totalCost = ingredientCost + decorationCost + laborCost;
    
    // 6. Get pricing settings
    const markupPercent = await this.getMarkupPercent(order.customerId);
    
    // 7. Calculate suggested price
    const suggestedPrice = totalCost * (1 + markupPercent);
    
    return {
      ingredientCost,
      decorationCost,
      laborCost,
      totalCostToCompany: totalCost,
      markupPercent,
      suggestedPrice,
      // ... detailed breakdowns
    };
  }
  
  /**
   * Real-time calculation for quote builder
   */
  async calculateQuoteCost(quoteData: QuoteInput): Promise<OrderCostBreakdown> {
    // Similar to calculateOrderCost but works with draft data
    // No database writes, just calculations
  }
  
  /**
   * Check material availability
   */
  async checkMaterialAvailability(orderId: string): Promise<AvailabilityCheck> {
    // Check if all required materials are available
    // Return warnings for low stock
  }
}
```

### Quote Builder Component Structure

```
/app/quotes/
  ├── new/
  │   └── page.tsx          # Main quote builder
  ├── [id]/
  │   ├── page.tsx          # View/edit quote
  │   └── pdf/
  │       └── route.ts      # PDF generation
  └── components/
      ├── TierBuilder.tsx   # Tier configuration
      ├── CostPanel.tsx     # Live cost display
      ├── MarkupAdjuster.tsx
      └── QuotePreview.tsx
```

---

## Key Success Metrics

1. **Quote Accuracy**
   - Actual cost vs. estimated cost variance < 5%
   - Quote-to-order conversion rate

2. **Sales Efficiency**
   - Time to generate quote < 5 minutes
   - Quote acceptance rate

3. **Profitability**
   - Average profit margin
   - Low-margin order identification

4. **Material Management**
   - Material waste reduction
   - Inventory accuracy

---

## Conclusion

This pricing engine and order workflow system provides:
- **Real-time cost calculation** for accurate quoting
- **Material cost tracking** to ensure profitability
- **Flexible pricing** to accommodate different customer needs
- **Scalable architecture** to grow with your business

The system balances simplicity (for MVP) with extensibility (for future enhancements), incorporating best practices from leading bakery ERP systems while maintaining focus on custom order workflows.

