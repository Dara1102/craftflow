# CraftFlow – Future Scope (Do NOT implement now)

> IMPORTANT FOR AI:
> This document describes a long-term vision for a multi-tenant, multi-category platform.
> For the current MVP, **do NOT** implement everything here.
> Only use this file for:
> - Naming inspiration
> - Data model ideas for later phases
> The actual build scope is defined in `MVP_SCOPE.md`.

# CraftFlow – Data Model

This document defines the core data entities and relationships for the CraftFlow SaaS platform.

Conventions:
- Multi-tenant: most business-specific entities have a `business_id`.
- IDs are unique (UUID or similar).
- Timestamps: `created_at`, `updated_at` on most tables.
- Names are indicative, exact implementation (SQL vs NoSQL) is up to engineering.

---

## 1. Multi-Tenant & User Model

### 1.1 Business
Represents a tenant (a single company/shop/studio).

Fields:
- `id`
- `name`
- `logo_file_id` (nullable, FK → FileAsset)
- `timezone`
- `currency_code` (e.g., "USD")
- `status` (active, trial, suspended)
- `created_at`
- `updated_at`

### 1.2 User
Represents a person who can log in.

Fields:
- `id`
- `email`
- `password_hash` (or external auth id)
- `name`
- `is_global_admin` (for platform-level admin)
- `created_at`
- `updated_at`

### 1.3 BusinessUser
Associative entity linking Users to Businesses; supports multiple businesses per user.

Fields:
- `id`
- `business_id` (FK → Business)
- `user_id` (FK → User)
- `role` (owner, admin, manager, staff, sales)
- `status` (active, invited, suspended)
- `created_at`
- `updated_at`

---

## 2. SaaS Subscription Model

### 2.1 SubscriptionPlan
Defines platform-level plans.

Fields:
- `id`
- `name` (Starter, Pro, Enterprise)
- `monthly_price_cents`
- `yearly_price_cents`
- `features` (JSON: limits, capabilities)
- `is_default`
- `created_at`
- `updated_at`

### 2.2 Subscription
Represents a Business’s subscription to a plan.

Fields:
- `id`
- `business_id` (FK → Business)
- `plan_id` (FK → SubscriptionPlan)
- `status` (trialing, active, past_due, canceled)
- `billing_cycle` (monthly, yearly)
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end` (boolean)
- `external_subscription_id` (e.g., Stripe)
- `created_at`
- `updated_at`

---

## 3. Product & Category Configuration

### 3.1 ProductCategory
Represents a type of product the business works with (e.g., Cakes, Furniture).

Fields:
- `id`
- `business_id` (FK → Business) (nullable for global defaults)
- `name` (e.g., "Cakes & Desserts")
- `slug` (e.g., "cakes")
- `is_global_template` (boolean; true for platform-level defaults)
- `created_at`
- `updated_at`

### 3.2 ProductTemplate (optional, for later phases)
Predefined templates for common product configurations (e.g., "3-tier wedding cake").

Fields:
- `id`
- `business_id` (nullable for global)
- `product_category_id` (FK → ProductCategory)
- `name`
- `description`
- `config_json` (pre-defined components, defaults)
- `is_active`
- `created_at`
- `updated_at`

---

## 4. Customer & Orders

### 4.1 Customer
End customer / client.

Fields:
- `id`
- `business_id`
- `name`
- `email`
- `phone`
- `billing_address_json`
- `notes`
- `created_at`
- `updated_at`

### 4.2 Order (or OrderHeader)
Represents a custom job or commission.

Fields:
- `id`
- `business_id`
- `customer_id` (FK → Customer)
- `product_category_id` (FK → ProductCategory)
- `status` (draft, proposal_sent, approved, in_production, completed, canceled)
- `title` (internal label: "Rihanna Birthday Cake", "Custom Walnut Table")
- `event_type` (wedding, birthday, launch, etc., nullable)
- `event_date` (nullable)
- `due_date`
- `priority` (normal, rush, vip)
- `budget_min_cents` (nullable)
- `budget_max_cents` (nullable)
- `currency_code`
- `pricing_snapshot_json` (stores frozen cost/price details at approval time)
- `created_at`
- `updated_at`

### 4.3 OrderStatusHistory
Track status changes.

Fields:
- `id`
- `order_id` (FK → Order)
- `from_status`
- `to_status`
- `changed_by_user_id` (nullable, FK → User)
- `changed_at`

---

## 5. Design & Components

### 5.1 ProductDesign
Structured representation of the design concept chosen for an order.

Fields:
- `id`
- `order_id` (FK → Order)
- `design_name`
- `product_category_id`
- `style_tags` (JSON array: ["rustic", "luxury"])
- `description` (long text)
- `complexity_score` (numeric, optional)
- `design_attributes_json` (JSON; category-specific attributes such as tiers, flavors, dimensions)
- `selected_ai_asset_id` (nullable, FK → AIAsset)
- `created_at`
- `updated_at`

### 5.2 Component
Generalized “piece” of the product (e.g., cake tier, table top, bouquet base).

Fields:
- `id`
- `product_design_id` (FK → ProductDesign)
- `name` ("Bottom tier", "Tabletop", "Main bouquet")
- `type` (structural, decorative, functional)
- `position_index` (integer for ordering; 0-based)
- `dimensions_json` (e.g., diameter/height/length/width/weight)
- `material_attributes_json` (JSON: flavors, wood species, fabric type, etc.)
- `notes`
- `created_at`
- `updated_at`

### 5.3 CustomElement
Represents design elements (e.g., "wine bottle sculpture", "gold leaf edge", "engraved logo").

Fields:
- `id`
- `business_id` (nullable for global template)
- `name`
- `category` (topper, decor, finish, engraving, etc.)
- `product_category_ids` (JSON array of IDs)
- `complexity_level` (1–5)
- `default_labor_hours` (numeric, optional)
- `default_material_cost_cents` (optional)
- `pricing_model` (flat_fee, labor_based, material_based)
- `description`
- `image_file_id` (nullable, FK → FileAsset)
- `is_active`
- `created_at`
- `updated_at`

### 5.4 OrderCustomElement
Instance of a CustomElement on a specific order.

Fields:
- `id`
- `order_id` (FK → Order)
- `custom_element_id` (FK → CustomElement)
- `quantity`
- `override_labor_hours` (nullable)
- `override_price_cents` (nullable)
- `notes`

---

## 6. Materials, Recipes & BOM

### 6.1 UnitOfMeasure (optional)
Standardized units for materials.

Fields:
- `id`
- `symbol` ("kg", "g", "lb", "piece", "yard", "board_feet")
- `name`
- `conversion_to_base` (optional numeric factor)

### 6.2 Material
Ingredients, supplies, hardware, florals, etc.

Fields:
- `id`
- `business_id` (nullable for global template)
- `name`
- `category` (ingredient, packaging, hardware, floral, paint, fabric, etc.)
- `unit_of_measure_id` (FK → UnitOfMeasure)
- `cost_per_unit_cents`
- `product_category_ids` (JSON array)
- `description`
- `image_file_id` (nullable, FK → FileAsset)
- `is_active`
- `created_at`
- `updated_at`

### 6.3 MaterialCostHistory
Historical tracking of material cost changes.

Fields:
- `id`
- `material_id` (FK → Material)
- `old_cost_per_unit_cents`
- `new_cost_per_unit_cents`
- `changed_at`
- `changed_by_user_id` (FK → User)

### 6.4 Recipe (optional, more relevant for food / batch-based products)
Represents a repeatable recipe or formula.

Fields:
- `id`
- `business_id`
- `name`
- `type` (cake, filling, frosting, glaze, paint_mix, etc.)
- `yield_description` (e.g., "for one 8-inch round x 2 layers", "per 1kg batch")
- `yield_quantity` (numeric, optional)
- `notes`
- `created_at`
- `updated_at`

### 6.5 RecipeMaterial
Material usage per recipe.

Fields:
- `id`
- `recipe_id` (FK → Recipe)
- `material_id` (FK → Material)
- `quantity`
- `unit_of_measure_id` (FK → UnitOfMeasure)

### 6.6 BOMItem (Bill of Materials)
Calculated or manually added materials for an order/product.

Fields:
- `id`
- `order_id` (FK → Order)
- `material_id` (FK → Material)
- `component_id` (nullable, FK → Component)
- `quantity_required`
- `unit_of_measure_id`
- `estimated_cost_cents`
- `created_at`
- `updated_at`

---

## 7. Labor & Pricing

### 7.1 LaborRole
Roles involved in production.

Fields:
- `id`
- `business_id`
- `name` (baker, decorator, woodworker, jeweler, florist, admin)
- `description`

### 7.2 LaborRate
Hourly rates, optionally time-bound.

Fields:
- `id`
- `business_id`
- `labor_role_id` (FK → LaborRole)
- `hourly_rate_cents`
- `effective_from`
- `effective_to` (nullable)

### 7.3 PricingRule
Rules controlling how final price is calculated.

Fields:
- `id`
- `business_id`
- `product_category_id` (nullable for global)
- `name`
- `type` (margin, per_serving, per_unit_dimension, rush_fee, delivery_fee, complexity_multiplier, etc.)
- `params_json` (e.g., `{ "wedding_per_serving_cents": 850, "party_per_serving_cents": 600 }`)
- `is_active`
- `created_at`
- `updated_at`

---

## 8. Workflows & Production

### 8.1 WorkflowDefinition
Defines the high-level workflow for a product category (configurable per business).

Fields:
- `id`
- `business_id`
- `product_category_id`
- `name` ("Cakes Default Workflow", "Furniture Production Workflow")
- `is_active`
- `created_at`
- `updated_at`

### 8.2 WorkflowStepDefinition
Steps within a workflow, customizable and reorderable.

Fields:
- `id`
- `workflow_definition_id` (FK → WorkflowDefinition)
- `name` ("Intake", "Design", "Baking", "Decorating", "QA", "Delivery")
- `department` (admin, baking, assembly, finishing, QA, delivery, etc.)
- `position_index` (integer; order of steps)
- `description`
- `created_at`
- `updated_at`

### 8.3 ProductionOrder
Represents the production planning wrapper for an approved order.

Fields:
- `id`
- `business_id`
- `order_id` (FK → Order)
- `workflow_definition_id` (FK → WorkflowDefinition)
- `current_step_definition_id` (FK → WorkflowStepDefinition, nullable)
- `status` (scheduled, in_progress, completed, canceled)
- `due_date`
- `priority` (normal, rush, vip)
- `notes`
- `created_at`
- `updated_at`

### 8.4 ProductionTask
Individual tasks for production staff.

Fields:
- `id`
- `production_order_id` (FK → ProductionOrder)
- `workflow_step_definition_id` (FK → WorkflowStepDefinition)
- `name`
- `description`
- `department` (duplicated for faster querying)
- `assigned_business_user_id` (nullable, FK → BusinessUser)
- `estimated_hours`
- `actual_hours` (nullable)
- `status` (not_started, in_progress, completed, blocked)
- `position_index` (for custom ordering inside step)
- `created_at`
- `updated_at`

---

## 9. AI Assets & Prompts

### 9.1 AIAsset
Stores AI-generated images or text concepts.

Fields:
- `id`
- `business_id`
- `order_id` (FK → Order)
- `type` (image_concept, text_concept)
- `file_id` (nullable, FK → FileAsset, for images)
- `content_json` (for text concepts or metadata)
- `short_description`
- `selected` (boolean)
- `created_at`
- `updated_at`

### 9.2 AIPromptLog
History of prompts sent to AI and responses (optional but recommended for debugging and analytics).

Fields:
- `id`
- `business_id`
- `order_id` (nullable)
- `product_category_id` (nullable)
- `prompt_type` (design_ideation, workflow_generation, pricing_explanation)
- `prompt_text`
- `response_summary_text`
- `raw_response_json` (nullable)
- `model_name`
- `created_at`

---

## 10. Files & Images

### 10.1 FileAsset
Generic file representation (images, PDFs, etc.).

Fields:
- `id`
- `business_id` (nullable for global assets)
- `storage_path` or `url`
- `file_name`
- `mime_type`
- `size_bytes`
- `created_at`
- `updated_at`

Entities that can have images:
- `Business` (logo)
- `Material` (material reference images)
- `CustomElement` (design techniques)
- `ProductDesign` (final concept image)
- `GlossaryTerm` (visual examples)
- `AIAsset` (AI images)

---

## 11. Terminology & Glossary

### 11.1 GlossaryTerm
Business-specific terminology and definitions.

Fields:
- `id`
- `business_id`
- `term`
- `definition`
- `categories` (JSON array: ["design", "technical", "internal"])
- `product_category_ids` (JSON array, nullable)
- `image_file_id` (nullable, FK → FileAsset)
- `created_at`
- `updated_at`

---

## 12. Invoicing & Payments (High-Level)

### 12.1 Invoice
Represents a bill for an order (deposit or final).

Fields:
- `id`
- `business_id`
- `order_id` (FK → Order)
- `number` (invoice identifier)
- `status` (draft, sent, paid, partially_paid, void)
- `issue_date`
- `due_date`
- `subtotal_cents`
- `tax_cents`
- `total_cents`
- `currency_code`
- `line_items_json` (or separate InvoiceLineItem table)
- `external_invoice_id` (e.g., Stripe)
- `created_at`
- `updated_at`

### 12.2 Payment
Payment records linked to invoices.

Fields:
- `id`
- `business_id`
- `invoice_id` (FK → Invoice)
- `amount_cents`
- `currency_code`
- `status` (pending, succeeded, failed, refunded)
- `payment_method` (card, bank, cash)
- `external_payment_id`
- `created_at`

---

## 13. Audit & Tracking

### 13.1 AuditLog
Generic event log for admin/troubleshooting.

Fields:
- `id`
- `business_id`
- `user_id` (nullable, FK → User)
- `entity_type` (Order, Material, WorkflowDefinition, etc.)
- `entity_id`
- `action` (create, update, delete, status_change)
- `metadata_json`
- `created_at`

---

## 14. Notes on Configurability & SaaS Design

- **Multi-tenant:** `business_id` is required on most domain entities.
- **Global templates:** Entities like `ProductCategory`, `Material`, `CustomElement`, and `DesignTechniques` can exist with `business_id = null` to serve as global defaults that are cloned into business-specific records.
- **Workflow customization:** `WorkflowDefinition` and `WorkflowStepDefinition` are per-business and per-product-category, allowing each business to rename, reorder, add, or remove steps.
- **Visual consistency:** `Material`, `CustomElement`, and `GlossaryTerm` can all have `image_file_id` fields pointing to `FileAsset` so staff have a visual reference for consistent execution across the team.
- **SaaS constraints & limits:** `SubscriptionPlan` + `Subscription` can be used to enforce limits on:
  - Number of orders per month
  - Number of users
  - AI calls
  - Product categories

This model is intended as a strong starting point and can be extended as additional features are added.
