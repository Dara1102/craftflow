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
- [ ] **Production Reports** - BOH sheets with recipes, ingredients, timeline

---

## v1.5 - Enhanced Operations (Q2)

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
