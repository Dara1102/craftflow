# CraftFlow – Data Model Diagram (Mermaid ERD)

```mermaid
erDiagram

  Business ||--o{ BusinessUser : has
  User ||--o{ BusinessUser : joins
  Business ||--o{ Subscription : has
  SubscriptionPlan ||--o{ Subscription : defines

  Business ||--o{ ProductCategory : offers
  Business ||--o{ Customer : serves
  Business ||--o{ Material : uses
  Business ||--o{ CustomElement : defines
  Business ||--o{ WorkflowDefinition : configures
  Business ||--o{ LaborRole : employs
  Business ||--o{ GlossaryTerm : defines
  Business ||--o{ FileAsset : owns
  Business ||--o{ Recipe : uses
  Business ||--o{ AIAsset : generates
  Business ||--o{ AIPromptLog : logs
  Business ||--o{ Invoice : bills

  %% Users & Tenancy
  Business {
    uuid id
    string name
    string timezone
    string currency_code
  }

  User {
    uuid id
    string email
    string name
    boolean is_global_admin
  }

  BusinessUser {
    uuid id
    uuid business_id
    uuid user_id
    string role
  }

  SubscriptionPlan {
    uuid id
    string name
    int monthly_price_cents
    int yearly_price_cents
  }

  Subscription {
    uuid id
    uuid business_id
    uuid plan_id
    string status
  }

  %% Products & Customers
  ProductCategory {
    uuid id
    uuid business_id
    string name
    string slug
  }

  Customer {
    uuid id
    uuid business_id
    string name
    string email
    string phone
  }

  Business ||--o{ Order : receives
  Order ||--|| Customer : from
  ProductCategory ||--o{ Order : categorizes

  Order {
    uuid id
    uuid business_id
    uuid customer_id
    uuid product_category_id
    string status
    string title
    date due_date
    string priority
  }

  Order ||--o{ OrderStatusHistory : changes
  OrderStatusHistory {
    uuid id
    uuid order_id
    string from_status
    string to_status
  }

  %% Design & Components
  Order ||--|| ProductDesign : has
  ProductDesign ||--o{ Component : composed_of
  ProductDesign ||--o{ OrderCustomElement : uses

  ProductDesign {
    uuid id
    uuid order_id
    uuid product_category_id
    string design_name
    json style_tags
    json design_attributes_json
    int complexity_score
  }

  Component {
    uuid id
    uuid product_design_id
    string name
    string type
    int position_index
    json dimensions_json
    json material_attributes_json
  }

  CustomElement ||--o{ OrderCustomElement : applied_as

  CustomElement {
    uuid id
    uuid business_id
    string name
    string category
    int complexity_level
    float default_labor_hours
  }

  OrderCustomElement {
    uuid id
    uuid order_id
    uuid custom_element_id
    int quantity
  }

  %% Materials, Recipes, BOM
  UnitOfMeasure ||--o{ Material : measures
  Business ||--o{ Material : stocks
  Business ||--o{ Recipe : defines
  Recipe ||--o{ RecipeMaterial : uses
  Order ||--o{ BOMItem : requires
  Component ||--o{ BOMItem : consumes
  Material ||--o{ BOMItem : included_in
  Material ||--o{ MaterialCostHistory : cost_changes

  UnitOfMeasure {
    uuid id
    string symbol
    string name
  }

  Material {
    uuid id
    uuid business_id
    string name
    string category
    uuid unit_of_measure_id
    int cost_per_unit_cents
  }

  Recipe {
    uuid id
    uuid business_id
    string name
    string type
    string yield_description
  }

  RecipeMaterial {
    uuid id
    uuid recipe_id
    uuid material_id
    float quantity
    uuid unit_of_measure_id
  }

  BOMItem {
    uuid id
    uuid order_id
    uuid material_id
    uuid component_id
    float quantity_required
    int estimated_cost_cents
  }

  MaterialCostHistory {
    uuid id
    uuid material_id
    int old_cost_per_unit_cents
    int new_cost_per_unit_cents
  }

  %% Labor & Pricing
  Business ||--o{ PricingRule : configures
  Business ||--o{ LaborRate : sets
  LaborRole ||--o{ LaborRate : priced_by

  LaborRole {
    uuid id
    uuid business_id
    string name
  }

  LaborRate {
    uuid id
    uuid business_id
    uuid labor_role_id
    int hourly_rate_cents
  }

  PricingRule {
    uuid id
    uuid business_id
    uuid product_category_id
    string type
    json params_json
  }

  %% Workflows & Production
  ProductCategory ||--o{ WorkflowDefinition : has
  WorkflowDefinition ||--o{ WorkflowStepDefinition : contains
  WorkflowDefinition ||--o{ ProductionOrder : applied_to
  ProductionOrder ||--o{ ProductionTask : composed_of
  WorkflowStepDefinition ||--o{ ProductionTask : instanced_as

  WorkflowDefinition {
    uuid id
    uuid business_id
    uuid product_category_id
    string name
  }

  WorkflowStepDefinition {
    uuid id
    uuid workflow_definition_id
    string name
    string department
    int position_index
  }

  ProductionOrder {
    uuid id
    uuid business_id
    uuid order_id
    uuid workflow_definition_id
    uuid current_step_definition_id
    string status
  }

  ProductionTask {
    uuid id
    uuid production_order_id
    uuid workflow_step_definition_id
    string name
    string department
    float estimated_hours
    float actual_hours
    string status
  }

  %% AI & Files
  Business ||--o{ FileAsset : stores
  Order ||--o{ AIAsset : references
  AIAsset ||--o{ AIPromptLog : generated_from

  FileAsset {
    uuid id
    uuid business_id
    string storage_path
    string file_name
    string mime_type
  }

  AIAsset {
    uuid id
    uuid business_id
    uuid order_id
    string type
    uuid file_id
    json content_json
  }

  AIPromptLog {
    uuid id
    uuid business_id
    uuid order_id
    string prompt_type
    string model_name
  }

  %% Glossary & Terminology
  Business ||--o{ GlossaryTerm : defines

  GlossaryTerm {
    uuid id
    uuid business_id
    string term
    string definition
    json categories
    uuid image_file_id
  }

  %% Invoices & Payments
  Order ||--o{ Invoice : billed_by
  Invoice ||--o{ Payment : paid_by

  Invoice {
    uuid id
    uuid business_id
    uuid order_id
    string number
    string status
    int total_cents
  }

  Payment {
    uuid id
    uuid business_id
    uuid invoice_id
    int amount_cents
    string status
  }