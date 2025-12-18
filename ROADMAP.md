# Craftflow Product Roadmap

## Vision
AI-powered bakery management platform that transforms how bakeries price, quote, and produce their products.

**Core USP**: AI Image-to-Order - Upload a cake photo, AI auto-populates the order with detected tiers, decorations, colors, and pricing.

---

## v1.0 - Core Platform (Current)

### Completed
- [x] Pricing engine & costing system
- [x] Quote/Order workflow with conversion
- [x] Recipe selection on orders (batter, filling, frosting)
- [x] Venue search & delivery distance calculation
- [x] Decoration techniques with labor tracking
- [x] Customer management
- [x] Tier sizes with volume-based scaling

### In Progress
- [ ] **Product Menu** - Add cupcakes, cake pops, cookies to orders
- [ ] **Combined Orders** - Single quote for: 3-tier cake + 24 cupcakes + cake pops
- [ ] **Product Packages** - "Dessert Table", "Birthday Bundle" bundles
- [ ] **Packaging & Supplies** - Cupcake liners, boxes, containers, gift packaging
- [ ] **Production Reports** - BOH sheets with recipes, ingredients, timeline

---

## v1.5 - Enhanced Operations (Q2)

### Corporate & Bulk Orders
- [ ] **Recurring Orders** - Weekly, bi-weekly, monthly schedules
- [ ] **Volume Pricing Breakpoints** - Tiered discounts by quantity
- [ ] **Breakpoint Calculator** - AI-assisted optimal pricing tiers
- [ ] **Corporate Accounts** - Company profiles with negotiated rates
- [ ] **Standing Orders** - Auto-generate orders from templates

### Price Intelligence
- [ ] Ingredient price history tracking
- [ ] Price change alerts (>10% threshold)
- [ ] Retail price suggestions based on cost changes
- [ ] Cost trend dashboard

### Data Import
- [ ] Batch import ingredients (CSV/Excel)
- [ ] Batch import recipes
- [ ] Recipe templates for common items

---

## v2.0 - AI-Powered (Q3)

### AI Image-to-Order (Core USP)
- [ ] Upload cake image → AI analysis
- [ ] Detect: tiers, colors, decorations, style
- [ ] Match to existing decoration techniques
- [ ] Auto-populate order form
- [ ] Generate design variations

### AI Onboarding
- [ ] Receipt/bill parsing → Extract ingredient costs
- [ ] Recipe document parsing (PDF, images)
- [ ] Handwritten recipe OCR
- [ ] AI recipe generation

### Subscription Tiers
- [ ] BASE: Templates, manual costing
- [ ] PROFESSIONAL: AI generation, document parsing, price alerts
- [ ] ENTERPRISE: AI image-to-order, API access, white-label

---

## Production Reports (v1.0 Feature Detail)

Generate production sheets for BOH staff:

| Section | Contents |
|---------|----------|
| **Recipe List** | All recipes with scaled ingredient quantities |
| **Shopping List** | Aggregated ingredients across all order items |
| **Timeline** | Prep → Bake → Cool → Decorate → Assemble |
| **Staff Assignments** | Tasks by role (Baker, Decorator, Assistant) |
| **Order Summary** | Customer, event date, delivery details |

---

## Corporate & Bulk Orders (v1.5 Feature Detail)

### Volume Pricing Breakpoints

**Business Model:**
Bakeries can set tiered pricing that automatically applies discounts based on quantity ordered.

**Example Breakpoint Structure:**
| Quantity Range | Discount | Per-Cookie Price |
|----------------|----------|------------------|
| 1-99 | 0% | $3.50 |
| 100-199 | 5% | $3.33 |
| 200-299 | 10% | $3.15 |
| 300-399 | 15% | $2.98 |
| 400+ | 20% | $2.80 |

**UI Strategy:**

1. **Manual Setup** (Default)
   - User defines breakpoint tiers per product or product category
   - Simple table interface: Quantity From → Quantity To → Discount %
   - Preview showing price-per-unit at each tier

2. **AI-Assisted Calculator** (Professional tier)
   - Analyzes ingredient costs, labor efficiency, and profit margins
   - Suggests optimal breakpoints that maintain target margin
   - Factors in: batch efficiency (making 100 cookies isn't 4x harder than 25)
   - Shows profit analysis at each tier

3. **Corporate Account Rates**
   - Override breakpoints for specific corporate customers
   - Negotiated flat rates or custom tier structures
   - Track profitability per corporate account

### Recurring Orders

**Schedule Options:**
- Weekly (same day each week)
- Bi-weekly
- Monthly (same date or "2nd Tuesday")
- Custom interval

**Standing Order Flow:**
1. Create order template with products, quantities, delivery details
2. Set recurrence schedule
3. System auto-generates draft orders X days before delivery
4. Baker reviews/confirms or modifies
5. Order flows to production

### Database Models (Planned)

```
VolumeBreakpoint {
  id, menuItemId OR productTypeId, minQuantity, maxQuantity, discountPercent
}

CorporateAccount {
  id, customerId, accountName, paymentTerms, defaultBreakpoints (JSON), notes
}

RecurringOrder {
  id, customerId, templateName, products (JSON), schedule, nextOrderDate, isActive
}
```

---

## Technical Architecture

### Current Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL via Prisma
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR

### Planned Additions (v2.0)
- **AI**: OpenAI GPT-4o or Claude 3.5 Sonnet
- **Storage**: Supabase Storage (images, documents)
- **OCR**: Tesseract.js
- **Payments**: Stripe (subscription tiers)

---

## Data Model Evolution

### v1.0 Additions
```
ProductType → MenuItem → OrderItem
                ↓
            CakeOrder (existing)
                ↓
         Production Report
```

### v2.0 Additions
```
FileUpload → AI Analysis → Order Population
    ↓
IngredientPriceHistory → PriceAlert → PriceSuggestion
    ↓
Bakery → Subscription → FeatureFlags
```

---

## Contributing

This is an internal roadmap. For feature requests or bug reports, contact the development team.

---

*Last updated: December 2024*
