# Craftflow User Flows

## Complete System Flow

```mermaid
flowchart TD
    subgraph CUSTOMER["Customer Intake"]
        inquiry[Customer Inquiry]
        consultation[Consultation]
    end

    subgraph QUOTING["Quote Process"]
        quote_new[Create Quote<br>/quotes/new]
        quote_edit[Edit Quote<br>/quotes/id/edit]
        quote_review[Review Quote<br>/quotes/id]
        quote_send[Send to Customer]
        quote_revise[Customer Requests Changes]
        quote_approved[Customer Approves]
        quote_declined[Quote Declined]
    end

    subgraph ORDERING["Order Process"]
        order_create[Convert to Order<br>/orders/new]
        order_details[Order Details<br>/orders/id]
        order_costing[Review Costing<br>/orders/id/costing]
        order_decorations[Confirm Decorations<br>/orders/id/decorations]
        order_confirmed[Order Confirmed]
        deposit[Collect Deposit]
    end

    subgraph PRODUCTION["Production Process"]
        prod_prep[Prep Review<br>/production/prep]
        generate_tasks[Generate Tasks]
        batch_plan[Batch Planning<br>/production/batch-planner]
        assign_staff[Assign Staff<br>/production/assignments]

        subgraph TASKS["Task Execution"]
            task_bake[BAKE<br>Bake Cakes]
            task_prep[PREP<br>Make Frosting]
            task_stack[STACK<br>Fill & Crumb]
            task_cool[COOL<br>Level Cakes]
            task_frost[FROST<br>Top Coat]
            task_final[FINAL<br>Decorations]
            task_package[PACKAGE<br>Box & Label]
        end

        quality_check[Quality Check]
    end

    subgraph FULFILLMENT["Fulfillment"]
        ready[Order Ready]
        delivery_schedule[Schedule Delivery<br>/production/delivery]
        pickup[Customer Pickup]
        deliver[Deliver Order]
        complete[Order Complete]
        collect_balance[Collect Balance]
    end

    subgraph ADMIN["Admin & Setup"]
        recipes[Manage Recipes<br>/admin/recipes]
        ingredients[Manage Ingredients<br>/admin/ingredients]
        decorations[Decoration Catalog<br>/admin/decorations]
        staff[Staff Management<br>/admin/staff]
        customers[Customer Database<br>/admin/customers]
    end

    %% Customer Intake Flow
    inquiry --> consultation
    consultation --> quote_new

    %% Quote Flow
    quote_new --> quote_edit
    quote_edit --> quote_review
    quote_review --> quote_send
    quote_send --> quote_approved
    quote_send --> quote_revise
    quote_send --> quote_declined
    quote_revise --> quote_edit

    %% Quote to Order Conversion
    quote_approved --> order_create
    order_create --> order_details
    order_details --> order_costing
    order_costing --> order_decorations
    order_decorations --> deposit
    deposit --> order_confirmed

    %% Order to Production
    order_confirmed --> prod_prep
    prod_prep --> generate_tasks
    generate_tasks --> batch_plan
    batch_plan --> assign_staff

    %% Task Sequence
    assign_staff --> task_bake
    task_bake --> task_prep
    task_prep --> task_stack
    task_stack --> task_cool
    task_cool --> task_frost
    task_frost --> task_final
    task_final --> task_package
    task_package --> quality_check

    %% Fulfillment
    quality_check --> ready
    ready --> delivery_schedule
    ready --> pickup
    delivery_schedule --> deliver
    deliver --> complete
    pickup --> complete
    complete --> collect_balance

    %% Admin feeds into process
    recipes -.-> task_bake
    ingredients -.-> prod_prep
    decorations -.-> order_decorations
    staff -.-> assign_staff
    customers -.-> inquiry

    %% Styling
    classDef quote fill:#fef3c7,stroke:#f59e0b
    classDef order fill:#dbeafe,stroke:#3b82f6
    classDef production fill:#d1fae5,stroke:#10b981
    classDef fulfillment fill:#fce7f3,stroke:#ec4899
    classDef admin fill:#e5e7eb,stroke:#6b7280

    class quote_new,quote_edit,quote_review,quote_send,quote_approved quote
    class order_create,order_details,order_costing,order_decorations,order_confirmed order
    class prod_prep,generate_tasks,batch_plan,assign_staff,task_bake,task_prep,task_stack,task_cool,task_frost,task_final,task_package,quality_check production
    class ready,delivery_schedule,pickup,deliver,complete fulfillment
    class recipes,ingredients,decorations,staff,customers admin
```

---

## Quote Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Quote
    Draft --> Sent: Send to Customer
    Sent --> Revision: Customer Requests Changes
    Revision --> Sent: Resend
    Sent --> Approved: Customer Approves
    Sent --> Declined: Customer Declines
    Approved --> Converted: Convert to Order
    Converted --> [*]
    Declined --> [*]

    note right of Approved
        Triggers order creation
        with all quote details
    end note
```

---

## Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> QUOTE: From Quote
    [*] --> NEW: Direct Order
    QUOTE --> PENDING
    NEW --> PENDING
    PENDING --> CONFIRMED: Deposit Received
    CONFIRMED --> IN_PRODUCTION: Tasks Generated
    IN_PRODUCTION --> READY: All Tasks Complete
    READY --> DELIVERED: Delivered to Customer
    READY --> PICKED_UP: Customer Pickup
    DELIVERED --> COMPLETE: Balance Collected
    PICKED_UP --> COMPLETE: Balance Collected
    COMPLETE --> [*]

    PENDING --> CANCELLED: Customer Cancels
    CONFIRMED --> CANCELLED: Customer Cancels
    CANCELLED --> [*]
```

---

## Production Task Flow

```mermaid
flowchart LR
    subgraph DAY1["Day -2 (2 days before)"]
        BAKE[BAKE<br>60 min]
        PREP[PREP<br>45 min]
    end

    subgraph DAY2["Day -1 (1 day before)"]
        STACK[STACK<br>45 min]
        COOL[COOL<br>30 min]
        FROST[FROST<br>60 min]
    end

    subgraph DAY3["Event Day"]
        FINAL[FINAL<br>30 min]
        PACKAGE[PACKAGE<br>15 min]
        DELIVER[DELIVER]
    end

    BAKE --> PREP
    PREP --> STACK
    STACK --> COOL
    COOL --> FROST
    FROST --> FINAL
    FINAL --> PACKAGE
    PACKAGE --> DELIVER

    classDef day1 fill:#fed7aa,stroke:#f97316
    classDef day2 fill:#c4b5fd,stroke:#8b5cf6
    classDef day3 fill:#bbf7d0,stroke:#22c55e

    class BAKE,PREP day1
    class STACK,COOL,FROST day2
    class FINAL,PACKAGE,DELIVER day3
```

---

## Staff Workflow by Role

```mermaid
flowchart TB
    subgraph SALES["Sales Person"]
        s1[Receive Inquiry]
        s2[Create Quote]
        s3[Send Quote]
        s4[Convert to Order]
        s5[Collect Deposit]
    end

    subgraph MANAGER["Manager"]
        m1[Review Orders]
        m2[Generate Tasks]
        m3[Batch Planning]
        m4[Assign Staff]
        m5[Quality Check]
        m6[Approve Delivery]
    end

    subgraph DECORATOR["Decorator/Baker"]
        d1[Check My Tasks]
        d2[View Order Specs]
        d3[Complete BAKE]
        d4[Complete PREP]
        d5[Complete STACK]
        d6[Complete FROST]
        d7[Complete FINAL]
        d8[Mark Complete]
    end

    subgraph DRIVER["Driver"]
        dr1[View Delivery Schedule]
        dr2[Load Orders]
        dr3[Deliver]
        dr4[Confirm Delivery]
    end

    s1 --> s2 --> s3 --> s4 --> s5
    s5 --> m1
    m1 --> m2 --> m3 --> m4
    m4 --> d1
    d1 --> d2 --> d3 --> d4 --> d5 --> d6 --> d7 --> d8
    d8 --> m5
    m5 --> m6
    m6 --> dr1 --> dr2 --> dr3 --> dr4
```

---

## Editable Flow Format (YAML)

Use this to describe changes you want:

```yaml
flows:
  - name: Quote to Order
    steps:
      - page: /quotes/new
        action: Create quote
        next: /quotes/[id]/edit
      - page: /quotes/[id]/edit
        action: Configure tiers, decorations, pricing
        next: /quotes/[id]
      - page: /quotes/[id]
        action: Review and send to customer
        next: Customer receives email
      - trigger: Customer approves
        action: Quote status → APPROVED
        next: /orders/new (pre-filled from quote)
      - page: /orders/new
        action: Confirm order details
        next: /orders/[id]
      - page: /orders/[id]
        action: Collect deposit
        next: Order status → CONFIRMED

  - name: Order to Production
    steps:
      - trigger: Order CONFIRMED
        action: Appears in /production/prep
      - page: /production/prep
        action: Manager reviews, clicks Generate Tasks
        next: Tasks created in database
      - page: /production/batch-planner
        action: Group similar tasks, schedule dates
      - page: /production/assignments
        action: Assign lead decorator
      - trigger: Tasks assigned
        action: Appears in /production/my-tasks for staff

  - name: Task Execution
    sequence:
      - BAKE → PREP → STACK → COOL → FROST → FINAL → PACKAGE
    notes: Each task has status PENDING → IN_PROGRESS → COMPLETED
```

---

## How to View These Diagrams

1. **GitHub**: Push this file and view in repo - GitHub renders Mermaid
2. **Mermaid Live**: Copy a diagram to [mermaid.live](https://mermaid.live)
3. **VS Code**: Install "Markdown Preview Mermaid Support" extension

## How to Request Changes

Tell me things like:
- "Add a step between Quote Approved and Order Created for contract signing"
- "The COOL step should happen before STACK, not after"
- "Add a Customer Portal section where customers can view their order status"
- "We need an approval gate between FINAL and PACKAGE for manager sign-off"
