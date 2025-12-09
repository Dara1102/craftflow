# CraftFlow – User Flows

## 0. Overview

CraftFlow is a multi-tenant SaaS application for businesses that create bespoke, made-to-order products (e.g., cakes, furniture, jewelry, florals, prints, garments, etc.).

Core capabilities:
- AI-assisted design intake and concept generation
- Configurable product design workflows by category
- Automated pricing (materials + labor + overhead + margin)
- Production planning and task assignment
- Bill of materials (BOM) and materials management
- Invoicing and basic subscription billing

Each **Business** (tenant) can:
- Define product categories they work in
- Customize workflows per category (steps, names, order)
- Configure materials, ingredients, and components
- Define design techniques and terminology
- Attach images to materials, design techniques, and glossary terms to ensure consistent understanding for staff

This document describes the main user flows for the MVP.

---

## 1. Personas & Roles

### 1.1 Business Owner / Admin
- Signs up the business
- Configures product categories
- Sets up workflows, materials, design techniques, terminology
- Manages subscription and billing
- Manages users and roles

### 1.2 Production Manager
- Reviews and approves quotes
- Generates production plans and tasks
- Manages daily/weekly production boards
- Reviews reports on materials and labor

### 1.3 Maker / Staff (e.g., baker, decorator, woodworker, florist)
- Views assigned tasks
- Uses design techniques and material references (with images) for clarity
- Updates task statuses

### 1.4 Sales / Front-of-House
- Creates new orders/quotes
- Uses AI to generate design concepts with the client
- Sends proposals and tracks approvals

---

## 2. Sign-Up & Business Onboarding

### 2.1 New Account Creation
1. User visits marketing site and clicks **“Start Free Trial”**.
2. User signs up with:
   - Email + password, or
   - OAuth (e.g., Google, Apple)
3. App creates:
   - `User`
   - `Business`
   - `BusinessUser` record with role `owner`.

### 2.2 Business Profile Setup
1. User is taken to **Business Setup Wizard**.
2. Step 1 – Business Info:
   - Business name
   - Logo upload (optional)
   - Timezone
   - Default currency
3. Step 2 – Product Categories:
   - User selects one or more categories:
     - Cakes & Desserts
     - Printing & Merch
     - Jewelry & Metalwork
     - Furniture & Woodworking
     - Florals & Events
     - Fashion & Garments
     - Other (custom name)
4. Step 3 – Defaults:
   - Default labor roles & hourly rates
   - Default target margin (%)
   - Default units (e.g., metric vs imperial)

5. On finish, system:
   - Creates default **WorkflowDefinitions** per selected category (e.g., design → pricing → production → QA → delivery).
   - Seeds default **Materials**, **DesignTechniques**, and **Glossary/Terminology** from global templates (which the business can later customize).

---

## 3. Business Configuration (Workflows, Materials, Techniques, Terminology)

### 3.1 Workflow Configuration (per Category)
1. Admin navigates to **Settings → Workflows**.
2. Admin selects a product category (e.g., Cakes).
3. The system shows current workflow steps:
   - Example: `Intake`, `Design`, `Pricing`, `Production Prep`, `Production`, `QA`, `Delivery`.
4. Admin can:
   - **Rename** steps (e.g., “Production” → “Baking & Decorating”).
   - **Add** new steps.
   - **Delete** steps (with validation for in-use workflows).
   - **Reorder** steps with drag-and-drop.
5. Admin saves changes.
6. System updates `WorkflowDefinition` and `WorkflowStepDefinition` records for that business and category.

### 3.2 Materials & Ingredients Configuration
1. Admin navigates to **Materials & Components**.
2. Tab: **Materials**.
3. Admin sees a table of materials:
   - Name
   - Category (ingredient, packaging, hardware, floral, etc.)
   - Unit (kg, g, piece, board-feet, yard, etc.)
   - Cost per unit
   - Image thumbnail (if any)
4. Admin can:
   - Add new material
   - Edit name, category, unit, cost
   - Upload or change an **image** (e.g., what a specific floral stem or fondant brand looks like).
5. System stores material data and file references for images.

### 3.3 Design Techniques & Terminology
1. Admin navigates to **Design Techniques**.
2. Admin sees a list:
   - Technique Name (e.g., “Semi-Naked Finish”, “Wine Crate Wood Grain”, “Gold Leaf Edge”)
   - Category (finish, decor, structural, etc.)
   - Associated product categories
   - Image thumbnail
3. Admin can:
   - Add technique
   - Attach 1+ reference images (for consistency across staff)
   - Write description and best practices
4. Admin navigates to **Terminology / Glossary**.
5. Admin sees list of terms:
   - Term
   - Definition
   - Optional image (for visual examples)
6. Makers and staff later use this glossary in tasks and design spec displays.

---

## 4. Create New Order / Quote

### 4.1 Start New Order
1. Sales user clicks **“Create New Order”** from navigation.
2. Step 1 – Client & Event:
   - Search for existing customer or create new
   - Event type & date (or due date for product)
   - Priority (normal / rush / VIP)
   - Budget range (optional)
3. Step 2 – Select Product Category & Basic Config:
   - Choose category (e.g., Cakes)
   - For Cakes: servings, tiers, flavors; for Furniture: dimensions, material type; etc.
4. System builds a **structured design draft** (`ProductDesignDraft`) that will be used by AI.

---

## 5. AI Design Ideation Flow

### 5.1 Generate Concepts
1. On the **Design** step of the order, user sees:
   - Structured design form on the left.
   - “Generate AI Concepts” button on the right.
2. User can:
   - Type a freeform description of the design.
   - Choose style tags (e.g., “rustic”, “luxury”, “playful”, etc.).
   - Attach reference images.
3. User clicks **“Generate AI Concepts”**.
4. Backend:
   - Constructs a prompt using:
     - Business profile
     - Product category
     - Structured design attributes
     - Style tags
     - Reference image metadata
   - Sends to AI model(s) for:
     - Concept descriptions (text)
     - Optional image mockups (links)
5. Frontend displays grid of concepts:
   - Title
   - Image (if available)
   - Short description
   - Summary of key elements

### 5.2 Refine & Select Concept
1. User can:
   - Click **“Refine”** and add constraints (“fewer crates”, “more florals”, “simpler design”).
   - Regenerate concepts.
2. User selects one concept and clicks **“Use This Concept”**.
3. System:
   - Saves selected concept as `ProductDesign` for the order.
   - Links any AI images as `AIAsset`.

---

## 6. Pricing & Proposal Flow

### 6.1 Auto-Pricing
1. User navigates to the **Pricing** step of the order.
2. Backend:
   - Uses `ProductDesign`, `Components`, `Materials`, and `LaborRates` to:
     - Estimate material usage (BOM).
     - Calculate material costs.
     - Estimate labor hours by department.
     - Apply pricing rules: overhead + margin + product-category rules.
3. Frontend shows:
   - Suggested price
   - Breakdown tabs: Summary, Materials, Labor, Overhead/Margin

### 6.2 Manual Adjustments
1. User can:
   - Adjust labor hours or rates per order.
   - Add/remove line items (e.g., delivery fee).
   - Apply discounts or markups.
2. System recalculates totals in real-time.

### 6.3 Generate Proposal
1. User clicks **“Generate Proposal”**.
2. System renders:
   - Client details
   - Design summary with selected concept image
   - Itemized pricing
   - Deposit requirement and terms
3. User can:
   - Send proposal via email (link)
   - Download as PDF
4. Order status transitions to `proposal_sent`.

### 6.4 Approval
1. Customer approves via proposal link OR Sales user manually marks as approved.
2. Order status transitions to `approved`.
3. System:
   - Locks pricing snapshot
   - Creates `ProductionOrder` record
   - Assigns the relevant **category workflow** to the order.

---

## 7. Production Planning & Task Assignment

### 7.1 Generate Production Plan
1. Production Manager opens an approved order.
2. Clicks **“Generate Production Plan”**.
3. Backend:
   - Reads `WorkflowDefinition` for the order’s category.
   - Splits production into tasks:
     - Example for Cakes: Admin → Baking → Filling → Icing → Decor → QA → Delivery.
   - Assigns each task:
     - Name
     - Department
     - Estimated hours (based on design complexity)
4. System creates `ProductionTask` records linked to `ProductionOrder`.

### 7.2 Production Board View
1. Manager opens **Production → Board**.
2. Sees Kanban columns based on workflow steps:
   - E.g., Intake / Prep / Baking / Decorating / QA / Delivery
3. Each card is a `ProductionOrder` with key info:
   - Client name
   - Due date
   - Product type
   - Status color
4. Manager can:
   - Drag orders between workflow steps (updates underlying `ProductionTask` status).
   - Open order detail for BOM and notes.

### 7.3 Daily / Weekly Reports
1. Manager goes to **Reports**.
2. Can view for a date range:
   - “Material Requirements” → aggregated BOM across orders.
   - “Tasks by Department” → workload per team.
   - “Orders Due” → list of orders and stages.

---

## 8. Materials & Cost Updates

### 8.1 Updating Material Costs
1. Admin navigates to **Materials & Components → Materials**.
2. Updates `cost_per_unit` inline or in edit modal.
3. System:
   - Records history (for future analytics).
   - Uses new costs only for quotes created after the update.
   - Keeps old costs for already approved orders via snapshotting.

### 8.2 Adding New Materials (with Images)
1. Admin clicks **“Add Material”**.
2. Inputs:
   - Name
   - Category
   - Unit
   - Cost per unit
   - Product categories where it’s used
3. Uploads 1–3 reference images (e.g., photo of a specific bead, floral stem, fondant brand).
4. System saves:
   - New `Material` record
   - Associated `FileAsset` records for images.

---

## 9. Managing Workflows & Terminology (Customization Flow)

### 9.1 Customize Workflow
1. Admin goes to **Settings → Workflows**.
2. For a chosen category:
   - Adds, renames, reorders steps as needed.
3. Clicking “Save” updates definitions and re-renders Production Board columns accordingly.

### 9.2 Maintain Design Techniques & Terminology
1. Admin goes to **Design Techniques**.
2. Adds or edits techniques:
   - Names, descriptions, categories, images.
3. For **Terminology / Glossary**:
   - Admin adds new terms that are specific to that business or region.
   - Each term can have:
     - Definition
     - Example usage
     - Optional reference image
4. Makers and staff can open a **“Reference” drawer** from any order or task to see:
   - Techniques
   - Materials
   - Terminology
   - With images for visual consistency.

---

## 10. Subscription & Billing (SaaS Admin)

### 10.1 Subscription Management
1. Business Owner navigates to **Account → Subscription**.
2. Can:
   - Select tier (Starter, Pro, Enterprise).
   - See usage metrics (number of orders, users, AI calls).
   - Update payment method.
3. System integrates with payment provider (e.g., Stripe).

### 10.2 Limits & Upsell
1. If business approaches limits (e.g., orders/month or AI calls), app shows:
   - “Upgrade to Pro for unlimited AI design concepts and more orders.”
2. Enforcement:
   - Soft limit notifications
   - Hard limit warnings for hitting thresholds (with upgrade paths).

---