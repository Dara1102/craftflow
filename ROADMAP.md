# Craftflow Product Roadmap

## Vision
The industry-leading AI-powered **creative production platform** that transforms how makers price, quote, produce, and grow their business.

### Target Market
**From kitchen table to $2-5MM in revenue** - Craftflow grows with you.
- **Beginners**: First-time business owners who need guidance, not complexity
- **Growing businesses**: Scaling from side hustle to full-time operation
- **Established operations**: $2-5MM revenue businesses needing operational efficiency

### Design Philosophy
**Approachable. Intuitive. Helpful.**
- UI must feel easy and welcoming, especially for novices
- Early adoption depends on low friction onboarding
- Progressive disclosure: simple by default, powerful when needed
- Never intimidating, always helpful
- Guidance built-in (not just documentation)

### Core Value Proposition: Sales → Production Bridge
**The gap Craftflow fills:**
> Most makers either underprice (guessing) or overprice (fear). They quote inconsistently,
> forget costs, and struggle to translate customer requests into production schedules.

**Onboarding focuses on:**
1. **Quote accurately** - Know your true costs before you commit to a price
2. **Quote efficiently** - Generate quotes in minutes, not hours
3. **Share with production** - Orders flow seamlessly to schedules, task lists, shopping lists
4. **Close the loop** - Production updates flow back to customer communication

**The bridge:**
```
SALES SIDE                         PRODUCTION SIDE
─────────────────────────────────────────────────────
Customer inquiry
    ↓
Quote (with real costs)
    ↓
Order confirmed        ──────→     Production schedule
                                   Shopping list
                                   Task assignments
                                   Batch planning
    ↓                                   ↓
Delivery/pickup        ←──────     Order completed
```

### Platform Strategy
**Modular architecture for creative production businesses:**
- **Phase 1**: Bakeries (cakes, cupcakes, cookies, custom desserts)
- **Phase 2**: Etsy-style creative businesses
  - Woodworking & custom furniture
  - Jewelry & accessories
  - Garments & alterations
  - Candles, soaps, crafts
  - Fine art prints & custom framing
  - 3D printing & prototyping
  - Bespoke glassware & ceramics
  - Leatherwork & bags
  - Floral design & arrangements
  - Custom signage & engraving
  - Any bespoke/made-to-order production
- **Core engine**: Recipe/BOM-based costing, labor tracking, production scheduling
- **Industry modules**: Specialized workflows, terminology, integrations per vertical

---

### Technical Architecture: Modular Industry System

**Core Platform (shared across all industries):**
```
┌─────────────────────────────────────────────────────────────┐
│                     CRAFTFLOW CORE                          │
├─────────────────────────────────────────────────────────────┤
│  Materials/Ingredients    │  Recipes/BOMs    │  Vendors     │
│  Labor Roles & Rates      │  Customers       │  Orders      │
│  Quotes & Pricing         │  Production Tasks│  Scheduling  │
│  Costing Engine           │  Reports         │  Settings    │
└─────────────────────────────────────────────────────────────┘
```

**Industry Modules (plug-in architecture):**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   BAKERY     │  │  WOODWORK    │  │   JEWELRY    │  │   GARMENTS   │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ Tier sizes   │  │ Wood types   │  │ Metal types  │  │ Fabric types │
│ Cake shapes  │  │ Joint types  │  │ Stone types  │  │ Size charts  │
│ Decorations  │  │ Finishes     │  │ Settings     │  │ Alterations  │
│ Bake/Prep    │  │ Cut/Sand     │  │ Cast/Polish  │  │ Cut/Sew      │
│ Stack/Frost  │  │ Assemble     │  │ Set/String   │  │ Fit/Finish   │
│ Batch baking │  │ Batch cuts   │  │ Batch cast   │  │ Batch cut    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**How it works technically:**

```typescript
// Core models are generic
interface Material {
  id: string
  name: string
  unit: string          // oz, grams, board-ft, yards, grams
  costPerUnit: number
  vendorId: string
  // ... common fields
}

interface Recipe {  // or "BOM" (Bill of Materials)
  id: string
  name: string
  type: string          // Industry module defines types
  materials: RecipeMaterial[]
  laborMinutes: number
  yield: number
  yieldUnit: string     // "servings", "pieces", "items"
}

// Industry module defines specific types and behaviors
interface IndustryModule {
  id: string            // "bakery", "woodwork", "jewelry"
  name: string

  // Terminology mapping
  terminology: {
    material: string    // "Ingredient" | "Wood" | "Metal"
    recipe: string      // "Recipe" | "Cut List" | "Design"
    product: string     // "Cake" | "Furniture" | "Piece"
  }

  // Product structure
  productStructure: {
    hasLayers: boolean        // Cakes have tiers
    hasDimensions: boolean    // Furniture has L×W×H
    hasSizes: boolean         // Jewelry has ring sizes
  }

  // Production workflow
  taskTypes: string[]         // ["BAKE", "PREP", "STACK", "FROST", "DECORATE"]
  batchableSteps: string[]    // Which steps can be batched

  // Yield calculation
  yieldCalculator: (product, settings) => YieldResult

  // UI customizations
  orderFormFields: FieldDefinition[]
  productionViews: ViewDefinition[]
}

// Registry of modules
const industryModules = {
  bakery: BakeryModule,
  woodwork: WoodworkModule,
  jewelry: JewelryModule,
  garments: GarmentsModule,
  // ... extensible
}
```

**Database design for multi-industry:**
```
# Core tables (all industries)
Material { id, name, unit, costPerUnit, vendorId, industryType }
Recipe { id, name, type, industryType, laborMinutes, yield }
Order { id, customerId, industryType, status, ... }
ProductionTask { id, orderId, taskType, ... }

# Industry-specific tables
bakery.TierSize { id, name, diameter, servings, shape }
bakery.DecorationTechnique { id, name, laborMinutes, complexity }

woodwork.WoodType { id, species, grade, costPerBoardFoot }
woodwork.JointType { id, name, laborMinutes }

jewelry.MetalType { id, name, purity, costPerGram }
jewelry.StoneType { id, name, cut, costPerCarat }
```

**Onboarding determines module:**
```
"What kind of products do you make?"
  → Cakes & baked goods     → Load BakeryModule
  → Furniture & woodwork    → Load WoodworkModule
  → Jewelry & accessories   → Load JewelryModule
  → Clothing & alterations  → Load GarmentsModule
  → Other custom products   → Load GenericModule (BOM-based)
```

---

### Database Migration Path: Bakery → Multi-Industry

**Current schema already has strong foundations:**

| Current Model | Multi-Industry Ready? | Notes |
|---------------|----------------------|-------|
| `Ingredient` | ✅ Yes | Rename to `Material`, add `category` enum |
| `Recipe` | ✅ Yes | Already generic, add `industryType` |
| `LaborRole` | ✅ Yes | Works for any industry |
| `Staff` / `StaffRole` | ✅ Yes | Becomes `BusinessUser` when multi-tenant |
| `Vendor` / `IngredientVendor` | ✅ Yes | Already generic |
| `ProductionTask` | ✅ Yes | TaskType enum extends per industry |
| `FieldOption` | ✅ Yes | Generic key-value config |
| `Setting` | ✅ Yes | Any key-value settings |

**Models requiring evolution:**

| Current Model | Future Model | Migration Strategy |
|---------------|--------------|-------------------|
| `CakeOrder` | `Order` | Add `productCategoryId`, rename model |
| `CakeTier` | `OrderComponent` | Add `componentType` enum, abstract dimensions |
| `TierSize` | `ComponentSize` | Add `categoryId`, works for any sized component |
| `DecorationTechnique` | `CustomElement` | Already abstract enough |
| *(new)* | `ProductCategory` | Add for multi-industry routing |
| *(new)* | `WorkflowDefinition` | Custom task sequences per category |
| *(new)* | `Business` | Add when going multi-tenant |

**Phase 1 Migration (Single-tenant, bakery-focused):**
```sql
-- Already complete: Current schema works for bakery MVP
-- No changes needed for v1.x
```

**Phase 2 Migration (Single-tenant, multi-industry):**
```sql
-- Add product categories
CREATE TABLE ProductCategory (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE,     -- 'bakery', 'woodwork', 'jewelry'
  name VARCHAR(100),
  terminology JSONB,           -- {"material": "Ingredient", "recipe": "Recipe"}
  isActive BOOLEAN DEFAULT true
);

-- Add category to existing tables
ALTER TABLE Recipe ADD COLUMN productCategoryId INTEGER REFERENCES ProductCategory(id);
ALTER TABLE Ingredient ADD COLUMN category VARCHAR(50) DEFAULT 'ingredient';
ALTER TABLE CakeOrder ADD COLUMN productCategoryId INTEGER REFERENCES ProductCategory(id);

-- Rename for clarity (optional, can alias)
-- CakeOrder → Order (with productCategoryId)
-- CakeTier → OrderComponent (with componentType)
```

**Phase 3 Migration (Multi-tenant SaaS):**
```sql
-- Add business/tenant model
CREATE TABLE Business (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  slug VARCHAR(50) UNIQUE,
  primaryProductCategoryId INTEGER REFERENCES ProductCategory(id),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active'
);

-- Add business_id to all tenant-scoped tables
ALTER TABLE Customer ADD COLUMN businessId INTEGER REFERENCES Business(id);
ALTER TABLE Recipe ADD COLUMN businessId INTEGER REFERENCES Business(id);
ALTER TABLE Ingredient ADD COLUMN businessId INTEGER REFERENCES Business(id);
-- ... etc for all tables
```

**Key design decision: Component abstraction**
```typescript
// Current: Bakery-specific
interface CakeTier {
  tierSizeId: number        // 6", 8", 10" rounds
  batterRecipeId: number
  fillingRecipeId: number
  frostingRecipeId: number
  frostingComplexity: number
}

// Future: Generic component
interface OrderComponent {
  id: string
  orderId: string
  componentType: string     // 'tier', 'tabletop', 'ring_band', 'bodice'
  position: number
  dimensions: Record<string, number>  // {diameter: 8, height: 6} or {length: 48, width: 24}
  materials: ComponentMaterial[]      // Recipes/BOMs attached
  attributes: Record<string, any>     // Industry-specific (frostingComplexity, wood_species, etc.)
}
```

**The path is clear:**
1. ✅ Current schema works perfectly for bakery MVP
2. 📋 Phase 2 adds `ProductCategory` and generalizes naming
3. 📋 Phase 3 adds multi-tenancy with `Business` model
4. 📋 Each phase is additive, not destructive

---

**Benefits of this architecture:**
1. **Shared core** - Costing, scheduling, customers work the same everywhere
2. **Industry-specific UX** - Bakers see "recipes", woodworkers see "cut lists"
3. **Extensible** - New industries = new module, not new app
4. **Familiar terminology** - Each industry sees their language
5. **Best practices built-in** - Each module encodes industry workflows

### Core USP: AI-Powered Order Creation
**Two paths to instant quotes - available across ALL industries:**

**Path 1: Upload → AI Fills Order**
> Customer sends a photo (inspiration, Pinterest, competitor, their sketch)
> AI analyzes and auto-populates the order form with detected components

| Industry | AI Detects |
|----------|------------|
| Bakery | Tiers, shapes, colors, decorations, complexity |
| Woodwork | Dimensions, wood type, joinery, finish style |
| Jewelry | Metal, stones, setting type, ring size |
| Garments | Fabric type, style, alterations needed |

**Path 2: Design with AI**
> Customer describes what they want in natural language or selects options
> AI generates design concepts and auto-populates the order

```
"I want a 3-tier wedding cake, rustic style, white with greenery"
    → AI generates design options
    → User selects one
    → Order form auto-filled with components + pricing
```

**The magic**: Whether they upload OR describe, they get an instant accurate quote.

**Market Differentiation**:
- **vs. CakeBoss/OrderEase**: AI-powered pricing eliminates manual cost calculations
- **vs. Generic POS**: Built specifically for makers with recipe/BOM-based costing
- **vs. Spreadsheets**: Real-time pricing updates when material costs change
- **vs. Manual processes**: 10x faster quote-to-order conversion
- **vs. Enterprise ERP**: Approachable UI that doesn't require training

---

### Network Intelligence: Shared Learning Across the Platform

**The more makers use Craftflow, the smarter everyone gets.**

#### Regional Material Pricing
```
"Butter costs $4.50/lb in Texas but $6.20/lb in Alaska"
"Walnut lumber is cheaper in the Pacific Northwest"
"Gold prices vary by region and supplier"
```

- [ ] Aggregate anonymized material costs by region
- [ ] Show benchmarks: "Your butter cost is 15% above regional average"
- [ ] Suggest alternative suppliers in your area
- [ ] Track seasonal price fluctuations
- [ ] Alert when regional prices spike or drop

#### Industry Benchmarks
- [ ] Average markup by product type and region
- [ ] Labor time benchmarks: "Most bakers take 45 min to frost an 8" cake"
- [ ] Pricing ranges: "Wedding cakes in your area typically $4-8/serving"
- [ ] Help new makers price competitively without undercharging

#### Shared Knowledge Base
- [ ] Common recipes/BOMs (opt-in sharing)
- [ ] Supplier reviews and ratings
- [ ] Equipment recommendations by business size
- [ ] Best practices by industry

**Privacy**: All sharing is anonymized and aggregated. Individual business data is never exposed.

---

### Cross-Merchant Customer Recognition

**How Square does it:**
> When a customer pays with their credit card at any Square merchant, Square links
> that card to a customer profile. If they pay at a different Square merchant later,
> Square recognizes the card and can show the merchant "This customer has visited
> 3 other Square businesses" or pre-fill their info.

**How Craftflow could do it:**

#### Payment-Based Recognition (with Stripe Connect)
- [ ] Customer pays deposit via Stripe at Bakery A
- [ ] Same card used at Bakery B (also on Craftflow)
- [ ] System recognizes: "Returning Craftflow customer"
- [ ] Pre-fill name, email, phone from previous orders
- [ ] Show merchant: "Ordered from 2 other Craftflow makers"

#### Email/Phone Recognition
- [ ] Customer provides email for quote at Maker A
- [ ] Same email used at Maker B
- [ ] System suggests: "Is this the same Sarah Johnson?"
- [ ] With consent, link profiles

#### Network Customer Insights (Opt-in)
```
"Sarah Johnson"
├── Ordered 5 custom cakes (various bakeries)
├── Always pays on time
├── Prefers delivery
├── Average order: $350
└── Last order: 2 weeks ago
```

**Benefits for makers:**
- Pre-filled customer info (less typing)
- Trust signals ("reliable customer across network")
- Understand customer preferences before they tell you
- Reduce no-shows/payment issues

**Privacy & Consent:**
- [ ] Customers opt-in to cross-merchant profile
- [ ] Clear value proposition: "Save time on future orders"
- [ ] Easy opt-out anytime
- [ ] Merchants only see aggregate trust signals, not order details from competitors
- [ ] GDPR/CCPA compliant data handling

---

## Implementation Status Summary

| Phase | Feature Area | Status |
|-------|--------------|--------|
| v1.0 | Core Platform (Pricing, Orders, Recipes) | ✅ Complete |
| v1.0 | Quote System | ✅ Complete |
| v1.0 | Vendor Tracking & Production Reports | ✅ Complete |
| v1.0 | Gantt & Task Checkoff | ✅ Complete |
| v1.0 | Product Menu (cupcakes, etc.) | ✅ Complete |
| v1.5 | Corporate & Bulk Orders | 📋 Planned |
| v1.5 | Price Intelligence & Analytics | 📋 Planned |
| v1.5 | Customer Portal & Online Ordering | 📋 Planned |
| v2.0 | AI Image-to-Order | 📋 Planned |
| v2.0 | Portfolio Gallery & Design Library | 📋 Planned |
| v2.0 | AI Onboarding & Document Parsing | 📋 Planned |
| v2.0 | Smart Kitchen Operations | 📋 Planned |
| v2.5 | Mobile Apps & Integrations | 📋 Planned |
| v3.0 | Multi-tenant SaaS & White-label | 📋 Planned |

---

## v1.0 - Core Platform (Current) ✅ COMPLETE

### Completed Features

#### Core Pricing & Costing ✅
- [x] Pricing engine with volume-based recipe multipliers
- [x] Role-based labor costs (Baker, Decorator, Assistant rates)
- [x] Decoration techniques with labor tracking
- [x] Tier sizes with volume-based scaling
- [x] Delivery zone pricing with distance calculation
- [x] Markup and discount system
- [x] Cost per serving calculations

#### Quote/Order Workflow ✅
- [x] Quote creation with real-time pricing
- [x] Quote-to-order conversion
- [x] Order management (DRAFT, CONFIRMED, IN_PRODUCTION, etc.)
- [x] Customer management with search
- [x] Venue search & delivery calculation

#### Recipe System ✅
- [x] Recipe selection on orders (batter, filling, frosting)
- [x] Recipe ingredients with costs
- [x] Recipe labor tracking (prep, bake, cool minutes)
- [x] Volume-based multipliers

#### Admin Pages ✅
- [x] Ingredients management
- [x] Recipes management with ingredients
- [x] Tier sizes configuration
- [x] Decoration techniques
- [x] Settings (labor rates, markup)

#### Vendor Tracking ✅
- [x] Vendor management (CRUD)
- [x] Multi-vendor per ingredient support
- [x] Vendor SKU, pack size, pricing
- [x] Preferred vendor designation
- [x] Reorder URL links

#### Production Reports ✅
- [x] Production Reports Hub with date/order selection
- [x] Vendor Shopping List (grouped by vendor with costs)
- [x] Cake Stacking Report (by date, flavor abbreviations)
- [x] Cupcakes, Cookies, Cake Pops, Macarons Reports
- [x] Graphics & Toppers Report
- [x] Delivery Schedule

#### Gantt & Task System ✅
- [x] ProductionTask model with dependencies
- [x] TaskSignoff model for audit trail
- [x] Auto-generate tasks from orders
- [x] Production Gantt view with timeline
- [x] Interactive Task Checklist
- [x] Task status updates (Pending → In Progress → Completed)
- [x] Signoff system with staff names

#### Batch Planner & Production Scheduling 🚧 IN PROGRESS
- [x] ProductionBatch model (group tiers by recipe)
- [x] Batch types (BAKE, PREP, FROST, etc.)
- [x] Weekly batch overview with tier grouping
- [x] Print-ready recipe views
- [x] Yield calculations with production settings
- [ ] **Multi-Day Task Spans** - Tasks that span days/weeks
- [ ] **Batch Planner Gantt View** - Visual timeline in batch planner
- [ ] **Drag-and-drop scheduling** - Reschedule batches visually
- [ ] **Dependency chains** - BAKE → COOL → FROST → FINAL flow
- [ ] **Capacity planning** - Oven/mixer time blocking
- [ ] **Lead time configuration** - Days before event for each step

**Multi-Day Production Flow:**
```
Event Date: Saturday Jan 4th
──────────────────────────────────────────────
Day -3 (Wed)   Day -2 (Thu)   Day -1 (Fri)   Day 0 (Sat)
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  BAKE   │───▶│  COOL   │───▶│  FROST  │───▶│ DELIVER │
│ 3 hrs   │    │         │    │  FINAL  │    │         │
│ All     │    │         │    │ 4 hrs   │    │ 2 hrs   │
│ tiers   │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

**Database additions needed:**
```prisma
model ProductionBatch {
  // Existing fields...
  scheduledStartDate  DateTime?  // First day of batch
  scheduledEndDate    DateTime?  // Last day of batch
  leadTimeDays        Int?       // Days before event
}

model ProductionTask {
  // Existing fields...
  spansDays          Int @default(1)  // How many days this task spans
  dayOffset          Int @default(0)  // Days before event (-3, -2, -1, 0)
}
```

#### Product Menu & Combined Orders ✅
- [x] ProductType model (Cupcakes, Cake Pops, Cookies, etc.)
- [x] MenuItem model with recipes and pricing
- [x] OrderItem/QuoteItem for multi-product orders
- [x] Single quote for: 3-tier cake + 24 cupcakes + cake pops
- [x] Packaging & supplies tracking
- [x] ProductSelector component for order forms

---

## v1.5 - Enhanced Operations

### Corporate & Bulk Orders

#### Volume Pricing Breakpoints
- [ ] VolumeBreakpoint model
- [ ] Tiered pricing by quantity (automatic discounts)
- [ ] Per-product and per-category breakpoints
- [ ] Visual breakpoint configuration UI
- [ ] **Profit Margin Protection**: Auto-calculate minimum quantities for profitability

**Example Breakpoint Structure:**
| Quantity Range | Discount | Per-Cookie Price | Margin |
|----------------|----------|------------------|--------|
| 1-99 | 0% | $3.50 | 65% |
| 100-199 | 5% | $3.33 | 62% |
| 200-299 | 10% | $3.15 | 58% |
| 300-399 | 15% | $2.98 | 52% |
| 400+ | 20% | $2.80 | 45% |

#### AI-Assisted Breakpoint Calculator (Professional tier)
- [ ] Analyze ingredient costs, labor efficiency at scale
- [ ] Suggest optimal breakpoints maintaining target margin
- [ ] Factor in batch efficiency (100 cookies ≠ 4x effort of 25)
- [ ] Profit analysis at each tier
- [ ] Competitive pricing suggestions based on market data

#### Corporate Accounts
- [ ] CorporateAccount model with company profiles
- [ ] Negotiated rates and custom pricing
- [ ] Override breakpoints for specific customers
- [ ] **Account Profitability Dashboard**: Revenue, margins, order history
- [ ] Contract management with renewal reminders
- [ ] Multi-location support for franchise clients

#### Recurring Orders
- [ ] RecurringOrder model with schedule templates
- [ ] Weekly, bi-weekly, monthly, quarterly schedules
- [ ] Auto-generate draft orders X days before delivery
- [ ] Baker review/confirm workflow
- [ ] **Predictive Inventory**: Auto-add to shopping lists
- [ ] Seasonal adjustments (holiday weeks, etc.)

### Price Intelligence & Analytics

#### Ingredient Price Tracking
- [ ] IngredientPriceHistory model
- [ ] Track cost changes over time with charts
- [ ] **Supplier Comparison**: Side-by-side vendor pricing
- [ ] Price trend visualization (30/60/90 day)
- [ ] Inflation impact analysis

#### Smart Price Alerts
- [ ] PriceAlert model
- [ ] Threshold-based alerts (>10% change)
- [ ] Email/in-app/push notifications
- [ ] **Auto-Reorder Suggestions**: When prices spike, suggest alternatives
- [ ] Seasonal price predictions

#### Retail Price Optimization
- [ ] Auto-suggest menu price updates based on cost changes
- [ ] **Margin Impact Simulator**: "What if butter goes up 20%?"
- [ ] Bulk price update tools
- [ ] Price history for each menu item
- [ ] **Competitor Price Monitoring** (future)

#### Business Analytics Dashboard
- [ ] Revenue by product category
- [ ] Top-selling items by volume and profit
- [ ] Customer lifetime value
- [ ] Order trends (daily, weekly, seasonal)
- [ ] **Profitability Heatmap**: Which orders/customers are most/least profitable
- [ ] Cost breakdown pie charts
- [ ] Break-even analysis per product

### Customer Portal & Online Ordering

#### Customer-Facing Quote Request
- [ ] Embeddable quote request form for website
- [ ] Customer selects products, dates, rough quantities
- [ ] Photo upload for design inspiration
- [ ] Budget range selector
- [ ] Automatic quote generation (draft for review)

#### Customer Portal
- [ ] Order history and status tracking
- [ ] Invoice viewing and payment
- [ ] Reorder from previous orders
- [ ] Saved favorites and preferences
- [ ] Delivery tracking
- [ ] Direct messaging with bakery

#### Automated Communications
- [ ] Quote follow-up emails
- [ ] Order confirmation with details
- [ ] Deposit/payment reminders
- [ ] Delivery day notifications
- [ ] Review request after delivery
- [ ] **Smart Timing**: Send at optimal engagement times

### Data Import & Export
- [ ] CSV/Excel ingredient import
- [ ] Recipe batch import
- [ ] Recipe templates for common items (starter library)
- [ ] Export orders/quotes to PDF
- [ ] Export financial data for accountant
- [ ] **Backup/Restore** for peace of mind

---

## v2.0 - AI-Powered Platform

### AI Image-to-Order (Core USP) 🌟

#### Instant Cake Analysis
- [ ] Upload any cake photo (inspiration, competitor, Pinterest)
- [ ] **Tier Detection**: Count, sizes, shapes (round, square, heart)
- [ ] **Color Extraction**: Primary, accent, and gradient colors
- [ ] **Decoration Recognition**: Match to your DecorationTechnique database
- [ ] **Style Classification**: Rustic, Elegant, Modern, Whimsical, etc.
- [ ] **Occasion Detection**: Wedding, Birthday, Baby Shower, etc.
- [ ] **Complexity Score**: 1-10 difficulty rating for pricing

#### One-Click Order Population
- [ ] Auto-fill order form from image analysis
- [ ] Suggested recipes based on detected flavors
- [ ] **Instant Price Estimate** before customer commitment
- [ ] Confidence levels for each detection
- [ ] Easy override/adjustment of AI suggestions

#### AI Design Variations
- [ ] "Show me 3 variations of this design"
- [ ] Style transfer (make this cake in rustic style)
- [ ] Color palette suggestions
- [ ] Simplification options (same look, lower cost)
- [ ] **Design Library**: Save and reuse popular AI-generated designs

#### Customer-Facing AI (Premium Feature)
- [ ] Customers upload inspiration photos in quote request
- [ ] AI generates instant ballpark quote
- [ ] Reduces back-and-forth, faster conversions

### Portfolio Gallery & Design Library 🖼️

#### Bakery Portfolio
- [ ] **Upload Past Work**: Bakery uploads photos of completed cakes/products
- [ ] **AI Auto-Tag**: Each upload is analyzed to extract:
  - Tier count, sizes, shapes
  - Colors and color palette
  - Decorations (matched to technique database)
  - Style tags (rustic, elegant, modern, etc.)
  - Occasion (wedding, birthday, etc.)
  - Complexity score (1-10)
- [ ] **Searchable Gallery**: Filter by style, occasion, tier count, price range
- [ ] **Pricing Attached**: Each design has calculated/saved pricing
- [ ] Categories and collections ("Wedding Cakes", "Kids Birthdays", etc.)

#### Customer Gallery Experience
- [ ] **Browse Portfolio**: Customers see bakery's past work
- [ ] **"I Want This" Button**: One-click to start quote/order
- [ ] AI auto-populates order form from gallery image
- [ ] **Customization Options**: "I want this but in blue" / "Add one more tier"
- [ ] Instant price estimate before commitment
- [ ] Save favorites to wishlist

#### Design Variations from Gallery
- [ ] "Show me similar designs"
- [ ] "This design but simpler/more elaborate"
- [ ] Color palette swaps on existing designs
- [ ] Size/tier adjustments with instant price updates

#### Portfolio Management (Admin)
- [ ] Bulk upload from phone photos
- [ ] Edit/override AI-detected attributes
- [ ] Set visibility (public/private/featured)
- [ ] Order history link (which orders used this design)
- [ ] **Most Popular Designs** analytics
- [ ] Seasonal/featured collections
- [ ] Archive old designs

#### Social Proof Integration
- [ ] Link gallery items to customer reviews
- [ ] "This design ordered 15 times"
- [ ] Instagram import for existing portfolio
- [ ] Share gallery items to social media

### AI Onboarding & Document Intelligence

#### Bakery Configuration Wizard (Full Onboarding) 🏭
AI-guided onboarding that configures the entire system to match each bakery's business logic, workflow, products, and production methods.

**Focus**: Capture how THIS bakery actually runs - not generic assumptions.

---

**Phase 1: Business Profile & Workflow Discovery**

*"Tell us about your bakery..."*
- [ ] Business type: Home baker, retail storefront, wholesale, mixed
- [ ] Team size: Solo, small team (2-5), production team (5+)
- [ ] Primary products: Custom cakes, cupcakes, cookies, wedding specialty, etc.
- [ ] Volume: Orders per week/month range

*"How do customers find and order from you?"*
- [ ] Order channels: Phone, email, social media DMs, website form, walk-in
- [ ] Quote process: Do you provide quotes before confirming? How?
- [ ] Deposit structure: Do you take deposits? What percentage?
- [ ] Lead time: Minimum notice for orders (24 hrs, 1 week, 2 weeks)

*"What's your order-to-delivery workflow?"*
- [ ] Quote → Confirm → Produce → Deliver/Pickup
- [ ] Do you have a tasting/consultation step?
- [ ] Who handles customer communication vs production?
- [ ] How do you currently track orders? (Paper, spreadsheet, other software)

---

**Phase 2: Product Discovery**

*"What products do you offer?"*
- [ ] Tiered cakes (custom decorated)
- [ ] Single-tier cakes (birthday, simple)
- [ ] Cupcakes (standard, jumbo, mini)
- [ ] Cookies (decorated, drop, sandwich)
- [ ] Cake pops, macarons, brownies, bars
- [ ] Specialty items (cheesecakes, pies, bread)
- [ ] Seasonal/limited items

*"For each product type:"*
- [ ] Standard sizes/quantities offered
- [ ] Price ranges (helps calibrate costing)
- [ ] Which are made-to-order vs batch production?

---

**Phase 3: Recipe & Ingredient Upload**

*"Let's import your existing recipes..."*
- [ ] **PDF Upload**: Parse recipe PDFs from cookbooks, printed recipes
- [ ] **Image Upload**: Photo of handwritten or printed recipes (OCR)
- [ ] **Document Upload**: Word docs, Google Docs exports
- [ ] **Spreadsheet Import**: Excel/CSV ingredient lists and recipes
- [ ] **Copy/Paste**: Plain text recipe entry

*AI extracts:*
- [ ] Ingredient names and quantities
- [ ] Unit conversions (cups → grams, sticks → oz)
- [ ] Yield per batch
- [ ] Prep/bake times (if mentioned)
- [ ] Match ingredients to existing database or create new

*"Upload your ingredient purchase history..."*
- [ ] Receipt photos → extract items, costs, vendors
- [ ] Vendor invoices (PDF) → parse line items
- [ ] Spreadsheet of current ingredient costs

---

**Phase 4: Production Method & Yield Calibration**

*"How do you bake?"*
- [ ] "Do you bake in round pans, sheet pans, or both?"
- [ ] "What sheet pan sizes do you use?" (full, half, quarter)
- [ ] "How many 8" rounds can you cut from a half sheet?"
- [ ] "Do you bake cupcakes in standard 12-cup or jumbo 6-cup tins?"
- [ ] "What's your standard tier structure?" (layers per tier, layer height)

*"Help us calibrate your yields..."*
- [ ] "How much batter (cups/grams) fills one half sheet pan?"
- [ ] "How much buttercream between layers on an 8" cake?"
- [ ] "What's your typical waste % when cutting rounds from sheets?"
- [ ] "How many cupcakes does one batch of batter make?"

*Recipe-to-Vessel Linking:*
- [ ] Link each recipe to its actual yield
- [ ] "Your Vanilla Sponge recipe makes how many half sheets?"
- [ ] Auto-calculate per-tier yields from recipe batch sizes

**Yield Testing Instructions (In-App Guide):**
> To calibrate your yields accurately:
> 1. **Batter Test**: Weigh your batter when making a known recipe. Note: "1 batch of vanilla = 4,500g"
> 2. **Pan Fill Test**: Weigh how much batter fills your standard pans (e.g., "half sheet = 1,800g")
> 3. **Cutting Test**: Cut rounds from a sheet pan, count usable rounds and weigh scraps
> 4. **Buttercream Test**: Weigh frosting used for internal layers vs crumb coat on a test cake
> 5. Enter these numbers in Admin → Production Settings

---

**Phase 5: Equipment Profiles**

*Define your baking equipment:*
- [ ] Sheet pans (full, half, quarter) with dimensions
- [ ] Round pans (sizes you own)
- [ ] Cupcake tins (standard, jumbo, mini)
- [ ] Specialty vessels: ramekins, bundt pans, shaped molds

*Capacity per vessel:*
- [ ] Volume/batter capacity in grams
- [ ] **Specialty Batch Overrides**: Custom yield rules for non-standard items
  - Ramekin cakes: X grams batter per ramekin
  - Mini bundt cakes: Y grams per mold
  - Custom shapes: manual yield entry

---

**Admin Configuration Panel:**
- [ ] Re-run any wizard phase anytime to recalibrate
- [ ] Manual override for any calculated value
- [ ] Per-recipe yield overrides (some recipes behave differently)
- [ ] Per-vessel yield settings
- [ ] Specialty product profiles

**Wizard Output:**
- [ ] Auto-configure ProductionSettings based on answers
- [ ] Pre-populate products, recipes, ingredients from uploads
- [ ] Generate equipment-aware batch calculations
- [ ] "You need 3 half sheets of vanilla to get all your 8" and 10" rounds"
- [ ] Waste factor applied to cutting calculations
- [ ] Workflow configured to match their order process

#### Receipt/Bill Parsing
- [ ] Snap photo of vendor receipt
- [ ] **Auto-Extract**: Ingredient names, quantities, costs
- [ ] Match to existing ingredients or suggest new
- [ ] Auto-update ingredient prices
- [ ] **Expense Tracking** integration

#### Recipe Document Parsing
- [ ] Parse PDF recipes (cookbooks, magazines)
- [ ] Parse images of recipes
- [ ] **Handwritten Recipe OCR** (grandma's secret recipe!)
- [ ] Create Recipe with RecipeIngredients automatically
- [ ] Scale conversion (cups to grams)

#### AI Recipe Generation
- [ ] Enter recipe name → AI suggests ingredients/quantities
- [ ] Based on professional baking formulas
- [ ] **Dietary Variations**: Generate gluten-free, vegan versions
- [ ] Cost estimation before you even make it
- [ ] Flavor pairing suggestions

#### AI Assistant
- [ ] Natural language queries: "What's my profit on wedding cakes?"
- [ ] "Create a quote for 100 chocolate cupcakes for Saturday"
- [ ] "Which ingredient costs have increased most this month?"
- [ ] Proactive suggestions: "You're low on vanilla - reorder?"

### Smart Kitchen Operations

#### Capacity Planning
- [ ] **Kitchen Capacity Model**: Oven space, prep stations, storage
- [ ] Automatic order acceptance based on capacity
- [ ] Overbooking warnings
- [ ] Optimal scheduling suggestions
- [ ] **What-If Scenarios**: "Can I take 2 more wedding cakes next Saturday?"

#### Inventory Management
- [ ] Current stock levels for all ingredients
- [ ] **Auto-Decrement**: Remove from inventory when orders complete
- [ ] Low stock alerts with reorder suggestions
- [ ] Waste tracking and analysis
- [ ] **Par Level System**: Maintain optimal stock levels

#### Equipment Scheduling
- [ ] Oven schedules to maximize utilization
- [ ] Equipment maintenance reminders
- [ ] Downtime planning

#### Staff Workload Balancing
- [ ] Labor hours needed per day/week visualization
- [ ] Over/under-staffed alerts
- [ ] Staff efficiency metrics
- [ ] Skill-based task assignment

### Subscription Tiers & Payments

#### FREE Tier (Trial)
- [ ] 5 orders/month
- [ ] Basic costing (no AI)
- [ ] 1 product category
- [ ] Community support

#### STARTER Tier - $29/month
- [ ] 25 orders/month
- [ ] Full costing engine
- [ ] All product categories
- [ ] Production reports
- [ ] Email support

#### PROFESSIONAL Tier - $79/month
- [ ] 200 orders/month
- [ ] AI recipe generation
- [ ] Document parsing
- [ ] Price alerts & analytics
- [ ] Breakpoint calculator
- [ ] Customer portal
- [ ] Priority support

#### ENTERPRISE Tier - $199/month
- [ ] Unlimited orders
- [ ] **AI Image-to-Order**
- [ ] API access
- [ ] White-label options
- [ ] Custom workflows
- [ ] SSO/user provisioning
- [ ] Dedicated support
- [ ] Custom integrations

---

## v2.5 - Mobile & Integrations

### Mobile Apps

#### Production App (iOS/Android)
- [ ] Task checklist on phone/tablet
- [ ] Tap to complete tasks
- [ ] Photo documentation of completed orders
- [ ] Push notifications for urgent tasks
- [ ] Offline mode for kitchen use

#### Owner Dashboard App
- [ ] Daily revenue at a glance
- [ ] Upcoming orders summary
- [ ] Approve quotes on the go
- [ ] Key alerts and notifications

### Third-Party Integrations

#### Calendar Integration
- [ ] Sync orders to Google Calendar
- [ ] Apple Calendar support
- [ ] Outlook integration
- [ ] Delivery appointments

#### Accounting Integration
- [ ] QuickBooks Online
- [ ] Xero
- [ ] FreshBooks
- [ ] Auto-sync invoices and expenses

#### Payment Processing
- [ ] Stripe Connect for deposits/payments
- [ ] Square integration
- [ ] PayPal support
- [ ] Invoice generation with payment links

#### Social Media
- [ ] Instagram design inspiration import
- [ ] Auto-post completed orders (with permission)
- [ ] Pinterest board integration
- [ ] Review request automation (Google, Yelp)

#### Communication
- [ ] SMS notifications (Twilio)
- [ ] WhatsApp Business integration
- [ ] Email marketing (Mailchimp, Klaviyo)

---

## v3.0 - Multi-Tenant SaaS (Enterprise)

### Platform Architecture
- [ ] Multi-bakery support
- [ ] Centralized admin for franchise operations
- [ ] Data isolation and security
- [ ] Custom branding per tenant
- [ ] Subdomain support (mybakery.craftflow.app)

### White-Label Options
- [ ] Custom domain support
- [ ] Branded customer portal
- [ ] Custom email templates
- [ ] Remove Craftflow branding (Enterprise)

### Enterprise Features
- [ ] Role-based access control
- [ ] Team management
- [ ] Audit logs
- [ ] Data export/compliance (GDPR)
- [ ] Custom API integrations
- [ ] SLA guarantees

---

## Database Models

### Currently Implemented
```
Ingredient, Recipe, RecipeIngredient
TierSize, CakeTier
DecorationTechnique, OrderDecoration
CakeOrder, Customer
Quote, QuoteTier, QuoteDecoration
Venue, DeliveryZone
LaborRole, LaborRate
Settings, FieldOption
Vendor, IngredientVendor
ProductionTask, TaskSignoff
ProductType, MenuItem, OrderItem, QuoteItem
Packaging, OrderPackaging, QuotePackaging
```

### Planned Additions

```
# v1.5 - Corporate & Bulk
VolumeBreakpoint { menuItemId OR productTypeId, minQty, maxQty, discountPercent }
CorporateAccount { customerId, accountName, paymentTerms, defaultBreakpoints }
RecurringOrder { customerId, templateName, products, schedule, nextOrderDate }
IngredientPriceHistory { ingredientId, oldCost, newCost, changedAt }
PriceAlert { ingredientId, previousCost, newCost, percentChange, status }

# v2.0 - AI & SaaS
FileUpload { filename, mimeType, storageUrl, purpose, status }
AIAsset { orderId, type, fileId, contentJson, selected }
AIPromptLog { orderId, promptType, promptText, response, modelName }
Bakery { name, slug, subscriptionTier, stripeCustomerId }
Subscription { bakeryId, planId, status, billingCycle }
InventoryItem { ingredientId, quantity, lastUpdated }
Equipment { name, type, capacity, schedule }

# v2.0 - Bakery Configuration Wizard
BakingVessel {
  name, type (SHEET_PAN, ROUND_PAN, CUPCAKE_TIN, SPECIALTY),
  dimensions, volumeMl, batterCapacityGrams, isActive
}
VesselYield {
  vesselId, tierSizeId?, outputCount (how many rounds from sheet),
  wastePercent, notes
}
RecipeYield {
  recipeId, vesselId?, batchYieldCount (1 batch = X sheet pans),
  batchYieldGrams, notes
}
SpecialtyProduct {
  name, vesselId?, batterGramsPerUnit, frostingGramsPerUnit,
  unitsPerBatch, notes
}
ProductionProfile {
  name, isDefault, settings JSON (layersPerTier, cutFromSheets, etc.)
}

# v2.0 - Portfolio Gallery
PortfolioItem {
  imageUrl, thumbnailUrl, title, description,
  tierCount, shape, colors[], accentColors[],
  styleTag, occasion, complexityScore,
  basePrice, isPublic, isFeatured,
  timesOrdered, createdAt
}
PortfolioItemDecoration { portfolioItemId, decorationTechniqueId, quantity }
PortfolioCollection { name, description, isActive, sortOrder }
PortfolioItemCollection { portfolioItemId, collectionId }
CustomerFavorite { customerId, portfolioItemId, savedAt }

# v3.0 - Multi-Tenant
Tenant { name, slug, plan, settings }
TenantUser { tenantId, userId, role, permissions }
AuditLog { tenantId, userId, action, timestamp, details }
```

---

## Technical Stack

### Current
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL via Prisma
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR

### Planned Additions
- **AI**: Claude 3.5 Sonnet (Anthropic) or GPT-4o (OpenAI)
- **Vision AI**: Claude Vision / GPT-4 Vision
- **Storage**: Supabase Storage (images, documents)
- **OCR**: Tesseract.js / Google Cloud Vision
- **Payments**: Stripe (subscriptions, Connect for payments)
- **SMS**: Twilio
- **Email**: Resend or SendGrid
- **Analytics**: PostHog or Mixpanel
- **Mobile**: React Native or Expo
- **Hosting**: Vercel (Pro)

---

## Value Metrics & ROI

### Time Savings (per bakery)
| Task | Manual Time | Craftflow Time | Savings |
|------|-------------|----------------|---------|
| Quote creation | 30 min | 5 min | 83% |
| Cost calculation | 15 min | Instant | 100% |
| Production planning | 45 min | 10 min | 78% |
| Shopping list | 20 min | 1 min | 95% |
| Order tracking | 30 min/day | 5 min/day | 83% |

### Revenue Impact
- **Faster quotes** = Higher close rate
- **Accurate pricing** = Better margins
- **Less waste** = More profit
- **Repeat customers** = Customer portal convenience

### Target Customers
1. **Home bakers** scaling to cottage business (STARTER)
2. **Small bakeries** 5-50 orders/month (PROFESSIONAL)
3. **Established bakeries** 50-200+ orders/month (ENTERPRISE)
4. **Bakery franchises** (ENTERPRISE + Multi-tenant)

---

## Competitive Advantages

| Feature | Craftflow | CakeBoss | OrderEase | Spreadsheets |
|---------|-----------|----------|-----------|--------------|
| AI Image-to-Order | ✅ | ❌ | ❌ | ❌ |
| Portfolio Gallery → Order | ✅ | ❌ | ❌ | ❌ |
| Recipe-based costing | ✅ | Partial | ❌ | Manual |
| Real-time pricing | ✅ | ❌ | ❌ | ❌ |
| Production Gantt | ✅ | ❌ | ✅ | ❌ |
| Customer portal | ✅ | ❌ | ✅ | ❌ |
| AI recipe parsing | ✅ | ❌ | ❌ | ❌ |
| Volume breakpoints | ✅ | ❌ | Partial | Manual |
| Multi-product orders | ✅ | ❌ | ✅ | Manual |

---

## Files Reference

### Production Reports (v1.0 - Completed)

**API Endpoints:**
- `/app/api/vendors/route.ts` - Vendor CRUD
- `/app/api/vendors/[id]/route.ts` - Single vendor
- `/app/api/ingredients/[id]/vendors/route.ts` - Ingredient-vendor linking
- `/app/api/production/shopping-list/route.ts` - Shopping list
- `/app/api/production/stacking/route.ts` - Cake stacking
- `/app/api/production/products/route.ts` - Product reports
- `/app/api/production/graphics/route.ts` - Graphics report
- `/app/api/production/delivery/route.ts` - Delivery schedule
- `/app/api/production/tasks/route.ts` - Task CRUD
- `/app/api/production/tasks/[id]/route.ts` - Task updates
- `/app/api/production/tasks/[id]/signoff/route.ts` - Signoffs

**Pages:**
- `/app/admin/vendors/` - Vendor management
- `/app/admin/menu/` - Menu item management
- `/app/production/page.tsx` - Reports hub
- `/app/production/shopping-list/page.tsx`
- `/app/production/stacking/page.tsx`
- `/app/production/cupcakes/page.tsx`
- `/app/production/cookies/page.tsx`
- `/app/production/cake-pops/page.tsx`
- `/app/production/macarons/page.tsx`
- `/app/production/graphics/page.tsx`
- `/app/production/delivery/page.tsx`
- `/app/production/gantt/page.tsx`
- `/app/production/checklist/page.tsx`

**Library:**
- `/lib/shopping-list.ts` - Shopping list generation
- `/lib/production-tasks.ts` - Task generation
- `/lib/costing.ts` - Full pricing engine

**Components:**
- `/app/components/ProductReport.tsx` - Reusable report component
- `/app/components/GanttChart.tsx` - Gantt visualization
- `/app/components/ProductSelector.tsx` - Product selection for orders

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `MVP Scope.md` | Original MVP specification (complete) |
| `Project Vision.md` | High-level product vision |
| `Current State Analysis & Enhancement Plan.md` | Gap analysis and priorities |
| `Implementation Guide - Pricing Engine & Order Workflow.md` | Technical implementation details |
| `Pricing Engine Technical Specification.md` | Costing engine details |
| `Craftflow - Future Scope - Data Models.md` | Multi-tenant SaaS data model (v3+) |
| `Craftflow Future Scope - User Flows.md` | Multi-tenant user flows (v3+) |
| `Plan and Paywall Strategy.md` | Subscription tier details |

---

*Last updated: December 2024*
