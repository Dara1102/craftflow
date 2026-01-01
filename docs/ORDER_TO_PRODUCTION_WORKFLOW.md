# Order-to-Production Workflow

This document describes the complete workflow from order creation to production execution.

## Overview

```
Sales Person          Manager                Production Team
     │                   │                        │
     ▼                   │                        │
/quotes/new              │                        │
  Create Order           │                        │
     │                   │                        │
     ▼                   │                        │
/quotes/[id]             │                        │
  (if quote mode)        │                        │
  Send → Accept          │                        │
  Convert to Order       │                        │
     │                   │                        │
     └──────────────────►│                        │
                         ▼                        │
                    / (home)                      │
                    View Orders                   │
                         │                        │
                         ▼                        │
               /production/batch-planner          │
                    Review recipe needs           │
                    Create batches                │
                         │                        │
                         └───────────────────────►│
                                                  ▼
                                        /production/my-tasks
                                           Execute work
                                           Sign off tasks
```

---

## Step 1: Sales Person Creates Order

**URL:** `/quotes/new`

1. Select or create customer
2. Add tiers:
   - Select size (6", 8", 10", 12")
   - Choose flavor, filling, finish
3. Add decorations from catalog
4. Add products (cupcakes, cake pops, cookies, etc.)
5. Set event date and delivery options
6. Toggle mode:
   - **Quote**: Save as draft for customer approval
   - **Confirmed**: Immediately confirm order
7. Click **Save Order**

**Key Fields:**
- Customer (required)
- Event Date (required)
- At least one tier OR product

---

## Step 2: Quote → Order Conversion (Optional)

**URL:** `/quotes/[id]`

If started as a quote:

1. View quote details
2. Click **Send Quote** → status becomes `SENT`
3. When customer accepts → status becomes `ACCEPTED`
4. Click **"Convert to Order"** button
5. System creates confirmed order with all data

**API:** `POST /api/quotes/[id]/convert`

---

## Step 3: Manager Reviews Orders

**URL:** `/` (home page)

- View all confirmed orders
- See: Order #, Customer, Event Date, Servings, Price, Status
- Click into order for details at `/orders/[id]`

**Order Statuses:**
| Status | Meaning |
|--------|---------|
| DRAFT | Not yet confirmed |
| CONFIRMED | Ready for production |
| IN_PROGRESS | Production started |
| COMPLETED | Done |
| CANCELLED | Cancelled |

---

## Step 4: Manager Schedules Production

**URL:** `/production/batch-planner`

1. Select date range covering upcoming event dates
2. System groups orders by recipe needs:
   - Which tiers need Vanilla Batter
   - Which tiers need Chocolate Buttercream
   - Stock items also needing recipes
3. For each recipe group, click **"Create Batch"**
4. Set scheduled date (system suggests based on lead times)

**Batch Types & Lead Times:**
| Batch Type | Days Before Event | Description |
|------------|-------------------|-------------|
| BAKE | 3 days | Baking cakes |
| PREP | 2 days | Making frosting/filling |
| STACK | 2 days | Fill, crumb coat, top coat |
| ASSEMBLE | 1 day | Final assembly |
| DECORATE | 1 day | Decoration work |

**API:** `POST /api/production/batches/manage`

---

## Step 5: Production Tasks Generated

**URL:** `/orders/[id]`

Tasks are auto-created per order:

| Task | Days Before | Duration | Description |
|------|-------------|----------|-------------|
| BAKE | -3 | 60 min | Bake all tier cakes |
| PREP | -2 | 45 min | Make frosting/filling |
| STACK | -2 | 45 min | Fill layers, crumb coat, final coat |
| ASSEMBLE | -1 | 60 min | Assemble tiers, add supports |
| DECORATE | -1 | 60 min | Apply decorations |
| PACKAGE | Day of | 15 min | Box and prepare for delivery |

**API:** `POST /api/production/tasks/generate`

---

## Step 6: Staff Executes Work

**URL:** `/production/my-tasks` or `/orders/[id]`

1. View assigned tasks
2. Click task to see details
3. Mark task **In Progress**
4. Complete the work
5. **Sign off** on task completion

**Task Statuses:**
| Status | Meaning |
|--------|---------|
| PENDING | Not started |
| IN_PROGRESS | Being worked on |
| COMPLETED | Done and signed off |
| BLOCKED | Waiting on something |
| SKIPPED | Not needed |

---

## Quick Test Workflow

Use this to test the complete flow:

```
1. Go to /quotes/new
   → Create order with 2 tiers (6" and 8")
   → Add some decorations
   → Set event date 5 days from now
   → Toggle to "Confirmed" and Save

2. Go to / (home)
   → Verify order appears with status "Confirmed"

3. Go to /production/batch-planner
   → Select date range covering the event
   → See your tiers grouped by recipe
   → Create batches for BAKE, PREP, STACK

4. Go to /orders/[id]
   → View generated tasks
   → Verify cost breakdown shows correctly

5. Go to /production/my-tasks
   → See tasks assigned
   → Mark one as In Progress, then Complete
```

---

## Key Database Models

### CakeOrder
- `status`: DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- `eventDate`: When the cake is needed
- `customerId`: Link to customer
- `totalCost`, `suggestedPrice`, `finalPrice`

### Quote
- `status`: DRAFT, SENT, ACCEPTED, DECLINED, EXPIRED
- `convertedOrderId`: Links to created order after conversion

### ProductionBatch
- `batchType`: BAKE, PREP, STACK, ASSEMBLE, DECORATE
- `status`: DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED
- `scheduledDate`: When batch is planned
- Links to tiers via `ProductionBatchTier`

### ProductionTask
- `taskType`: BAKE, PREP, STACK, ASSEMBLE, DECORATE, PACKAGE
- `status`: PENDING, IN_PROGRESS, COMPLETED, BLOCKED, SKIPPED
- `orderId`: Link to order
- `assignedToId`: Staff member assigned

---

## Key Files

| Purpose | Location |
|---------|----------|
| Create order | `/app/quotes/new/page.tsx` |
| Quote detail | `/app/quotes/[id]/page.tsx` |
| Convert quote | `/app/api/quotes/[id]/convert/route.ts` |
| Orders list | `/app/page.tsx` |
| Order detail | `/app/orders/[id]/page.tsx` |
| Batch planner | `/app/production/batch-planner/page.tsx` |
| Create batch | `/app/api/production/batches/manage/route.ts` |
| Generate tasks | `/app/api/production/tasks/generate/route.ts` |
| My tasks | `/app/production/my-tasks/page.tsx` |

---

## Production Settings

Configurable in Admin > Settings > Production:

- **Layers per tier**: 3 (default)
- **Layer height**: 2.5" (default)
- **Assembly times**: 15-35 min by tier size
- **Batter/buttercream calculations**

Single source of truth: `lib/production-settings.ts`
