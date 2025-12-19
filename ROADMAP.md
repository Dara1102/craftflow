# Craftflow Product Roadmap

## Vision
The industry-leading AI-powered bakery management platform that transforms how bakeries price, quote, produce, and grow their business.

**Core USP**: AI Image-to-Order - Upload a cake photo, AI auto-populates the order with detected tiers, decorations, colors, and instant pricing. No other bakery software offers this capability.

**Market Differentiation**:
- **vs. CakeBoss/OrderEase**: AI-powered pricing eliminates manual cost calculations
- **vs. Generic POS**: Built specifically for bakeries with recipe-based costing
- **vs. Spreadsheets**: Real-time pricing updates when ingredient costs change
- **vs. Manual processes**: 10x faster quote-to-order conversion

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
