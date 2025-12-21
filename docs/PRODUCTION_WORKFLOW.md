# Craftflow Production Workflow

This document outlines the workflow for each role in the Craftflow cake ordering and production system.

---

## Table of Contents
1. [Sales Person Workflow](#sales-person-workflow)
2. [Manager Workflow](#manager-workflow)
3. [Decorator/Baker Workflow](#decoratorbaker-workflow)
4. [Production Task Sequence](#production-task-sequence)
5. [Order Status Flow](#order-status-flow)

---

## Sales Person Workflow

The sales person is responsible for creating orders and managing customer relationships.

### 1. Create New Order
- Navigate to **Orders > New Order**
- Enter customer information (or select existing customer)
- Set event details:
  - Event date and time
  - Occasion (Birthday, Wedding, Anniversary, etc.)
  - Theme and colors
  - Delivery or pickup preference

### 2. Configure Cake Tiers
- Add cake tiers with:
  - Size (6", 8", 10", 12", etc.)
  - Shape (round, square, sheet)
  - Flavor/batter recipe
  - Filling recipe
  - Frosting recipe
  - Finish type (buttercream, fondant, naked, etc.)
  - Cakeboard selection

### 3. Add Decorations
- Select decoration techniques from the catalog
- Specify quantities and custom text
- Add special notes for complex decorations

### 4. Add Other Items (Optional)
- Cupcakes, cake pops, cookies, macarons
- Additional products or services

### 5. Upload Reference Image
- Upload customer's inspiration photo
- This image will be visible throughout production

### 6. Review Pricing
- System calculates cost based on:
  - Ingredients and recipes
  - Labor hours
  - Decorations
  - Delivery fees
  - Volume breakpoints (for bulk orders)
- Apply discounts if applicable

### 7. Confirm Order
- Set order status to **CONFIRMED**
- Order is now visible to the production team

### 8. Handle Bulk/Corporate Orders
- Mark as "Bulk Order" for large quantity orders
- Set bulk quantity (e.g., 24 cupcakes, 50 cake pops)
- Specify production days needed
- These orders appear with **BULK** badge in production views

---

## Manager Workflow

The manager oversees production planning, staff assignments, and quality control.

### 1. Review Incoming Orders
- Navigate to **Production > Prep Review** (`/production/prep`)
- Review new confirmed orders
- Check order completeness:
  - All tiers have cakeboards assigned
  - Recipes are selected
  - Decorations are specified

### 2. Generate Production Tasks
- From Prep Review, click **Generate Tasks** for each order
- System creates standard task sequence:
  1. BAKE - Bake Cakes
  2. PREP - Make Frosting
  3. STACK - Fill & Crumb Coat
  4. COOL - Cool & Level Cakes
  5. FROST - Final Frosting (Top Coat)
  6. FINAL - Cool & Final Touches
  7. PACKAGE - Package for Pickup/Delivery

### 3. Assign Order Lead
- Navigate to **Production > Assignments** (`/production/assignments`)
- Assign a lead decorator/baker to each order
- The lead is responsible for overall order quality

### 4. Batch Planning
- Navigate to **Production > Batch Planner** (`/production/batch-planner`)
- View tasks grouped by type and flavor
- Batch similar tasks together (e.g., all vanilla baking on same day)
- Drag and drop tasks to reschedule
- Consider:
  - Due dates (shown in red)
  - Bulk orders (marked with orange BULK badge)
  - Delivery vs pickup times
  - Tier complexity

### 5. Staff Task Assignment
- Navigate to **Production > Gantt** (`/production/gantt`)
- View timeline of all tasks
- Assign individual tasks to staff members
- Balance workload across team

### 6. Monitor Progress
- **Production Dashboard** (`/production`)
  - View overall production status
  - Check upcoming deliveries
  - Monitor task completion rates
- **My Tasks** view shows staff workload
- **Gantt Chart** shows timeline and dependencies

### 7. Quality Review
- Review completed orders before packaging
- Verify all decorations match specifications
- Check reference image for accuracy
- Approve for delivery/pickup

### 8. Print Reports
- **Assignments Page**: Print staff assignment sheets
- **Order Detail**: Print individual order specs with large image
- Use print button on each page

---

## Decorator/Baker Workflow

Decorators and bakers execute production tasks and update progress.

### 1. Check Assignments
- Navigate to **Production > My Tasks** (`/production/my-tasks`)
- View tasks assigned to you
- See today's tasks and upcoming work

### 2. View Order Details
- Click on an order to see full specifications
- **Assignment Spec** page shows:
  - Large reference image
  - Customer name and event date
  - Tier specifications (size, flavor, filling, frosting)
  - Decoration details with techniques
  - Required skills
  - Special notes

### 3. Start Task
- Click task checkbox or "Start" button
- Task status changes to **IN_PROGRESS**
- Timestamp is recorded

### 4. Complete Task
- Click task checkbox or "Complete" button
- Task status changes to **COMPLETED**
- Next task in sequence becomes available

### 5. Task Dependencies
Standard production sequence:
```
BAKE → PREP → STACK → COOL → FROST → FINAL → PACKAGE
```

- BAKE: Bake all cake layers
- PREP: Make frosting and fillings
- STACK: Torte, fill layers, apply crumb coat
- COOL: Level cakes, allow crumb coat to set
- FROST: Apply final frosting coat
- FINAL: Add decorations, final touches
- PACKAGE: Box for delivery/pickup

### 6. Print Order Sheet
- From order detail, click **Print** button
- Prints page with large image and all specs
- Post at workstation for reference

### 7. Handle Issues
- If blocked, update task status to **BLOCKED**
- Add notes explaining the issue
- Notify manager

---

## Production Task Sequence

### Standard Task Flow

| Step | Task Type | Task Name | Typical Duration | Days Before Event |
|------|-----------|-----------|------------------|-------------------|
| 1 | BAKE | Bake Cakes | 60 min | 2 days |
| 2 | PREP | Make Frosting | 45 min | 2 days |
| 3 | STACK | Fill & Crumb Coat | 45 min | 1 day |
| 4 | COOL | Cool & Level Cakes | 30 min | 1 day |
| 5 | FROST | Final Frosting (Top Coat) | 60 min | 1 day |
| 6 | FINAL | Cool & Final Touches | 30 min | Event day |
| 7 | PACKAGE | Package for Pickup/Delivery | 15 min | Event day |

### Task Type Color Coding

| Task Type | Color | Purpose |
|-----------|-------|---------|
| BAKE | Orange | Baking cake layers |
| PREP | Amber | Making frosting, fillings |
| STACK | Indigo | Assembly, crumb coat |
| COOL | Cyan | Cooling, leveling |
| FROST | Purple | Final frosting |
| FINAL | Teal | Decorations, finishing |
| PACKAGE | Green | Boxing, delivery prep |

---

## Order Status Flow

```
QUOTE → CONFIRMED → IN_PRODUCTION → READY → DELIVERED/PICKED_UP
```

| Status | Description | Who Sets It |
|--------|-------------|-------------|
| QUOTE | Initial order, pricing not finalized | Sales |
| CONFIRMED | Order confirmed, ready for production | Sales |
| IN_PRODUCTION | Production tasks started | Auto/Manager |
| READY | Order complete, awaiting pickup/delivery | Manager |
| DELIVERED | Order delivered to customer | Driver/Manager |
| PICKED_UP | Customer picked up order | Manager |
| CANCELLED | Order cancelled | Sales/Manager |

---

## Quick Reference: System Pages

### Sales
- `/orders` - Order list
- `/orders/new` - Create new order
- `/orders/[id]` - Order detail/edit
- `/customers` - Customer management

### Manager
- `/production` - Production dashboard
- `/production/prep` - Prep review & task generation
- `/production/assignments` - Staff assignments list
- `/production/assignments/[orderId]` - Order detail (printable)
- `/production/batch-planner` - Batch planning with drag-drop
- `/production/gantt` - Timeline view
- `/admin/staff` - Staff management

### Decorator/Baker
- `/production/my-tasks` - Personal task list
- `/production/assignment/[orderId]` - Order spec (with staffId)

### Admin
- `/admin/recipes` - Recipe management
- `/admin/ingredients` - Ingredient catalog
- `/admin/tiers` - Tier size options
- `/admin/decorations` - Decoration techniques
- `/admin/cakeboards` - Cakeboard types
- `/admin/volume-breakpoints` - Bulk pricing rules

---

## Bulk Order Handling

Bulk orders (corporate events, large parties) are handled with special consideration:

1. **Marking as Bulk**: Sales marks order as "Bulk Order" with quantity
2. **Production Days**: Manager can set extended production time
3. **Visual Indicator**: Orange "BULK" badge appears in all views
4. **Batch Planning**: Bulk tasks show quantity (e.g., "BULK x24")
5. **Pricing**: Volume breakpoints automatically apply discounts

---

## Tips for Efficient Production

1. **Batch Similar Tasks**: Bake all vanilla cakes together, all chocolate together
2. **Check Due Dates**: Always verify event date before scheduling
3. **Reference Images**: Keep printed specs at workstation
4. **Update Progress**: Mark tasks complete immediately
5. **Communicate Issues**: Use notes and status updates for blockers
6. **Plan Ahead**: Review next week's orders on Friday
