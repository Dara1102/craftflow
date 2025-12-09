# CraftFlow – SaaS Plan & Paywall Strategy

## 0. Purpose

This document defines:
- Subscription tiers
- Feature access rules
- Usage-based limits
- How the backend enforces limits (before billing is integrated)
- How the paywall UX behaves across the app

This strategy allows us to **simulate a full SaaS business model in dev**, long before we integrate Stripe or production billing.

---

# 1. Subscription Tiers (MVP)

We will launch with three tiers:

## Starter
- Target: very small shops and solopreneurs
- Max 10 orders/month
- Max 100 AI design calls/month
- Max 1 product category
- Limited workflows
- No advanced analytics
- No bulk production planning
- Can upload up to 50 assets (materials/images)
- Limited storage (e.g., 1GB)

## Pro
- Target: small–mid studios (bakeries, woodshops, boutique fabricators)
- Up to 200 orders/month
- Up to 2,000 AI design calls/month
- Up to 3 product categories
- Advanced workflows (customizable)
- Full analytics
- Bulk production planning
- Priority queue for AI generation
- Higher storage limit (e.g., 20GB)

## Enterprise
- Target: multi-location studios, franchises, event production firms
- Unlimited orders/month
- Unlimited AI calls (fair use applies)
- Unlimited product categories
- Dedicated onboarding
- Custom workflows per department
- Custom analytics dashboards
- SSO / user provisioning
- Custom storage limits

---

# 2. Enforcement Model (Core Logic)

All enforcement happens at the backend via:

1. **PlanConfig** (static config map, e.g., PLANS.starter)
2. **Subscription table** → Business active plan
3. **Usage counters**
4. **Feature guards** (throw if over limit)
5. **Upgrade-required responses**

Example: preventing excess AI design calls:

```ts
await assertCanUseAiDesign(businessId);
// throws if user is at limit

---

# ✅ 2. Upgrade Flow & Paywall UX Design Document  
Add this as `/docs/paywall_user_flows.md`

---

## `paywall_user_flows.md`

```md
# CraftFlow – Paywall & Upgrade User Flows

This document describes how the user experiences tier-based limitations across the application.

This is UX-only and does not involve real payments yet.

---

# 1. Paywall UX Goals

- Make features discoverable even if not available
- Make the upgrade path obvious but not annoying
- Provide clear value justification for each paid tier
- Show limits before the user hits them

---

# 2. Global UX Patterns

### A. Locked features
Displayed with:
- grey background
- padlock icon
- tooltip: “Upgrade to Pro to enable this”

### B. Soft nudges
When a Starter user uses 80% of monthly AI calls:
- banner at top of AI Design page:  
  “You're close to your limit — upgrade for unlimited AI design concepts.”

### C. Hard stop
When user hits the limit:
- Modal:
  
  - CTA: “View Plans”

### D. Feature comparison panel
On the upgrade screen, show a simple comparison grid:
- Starter vs Pro vs Enterprise  
- Exactly which features unlock on upgrade

---

# 3. Key Paywall Touchpoints

### 3.1 Creating a new order
If over limit:
- Block creation
- Show modal
- Offer upgrade

### 3.2 AI design generation
Before calling `runDesignAgent`:
- Backend check → throws if limit exceeded
- Frontend catches error → opens upgrade modal

### 3.3 Production analytics
Analytics (task forecasting, material demand):
- Only available for Pro+
- Starter sees blurred panel with:
“Unlock advanced analytics with Pro.”

### 3.4 Adding product categories
Starter max = 1  
If they try to add more:
- Redirect to Plans page

---

# 4. Upgrade Flow (MVP)

Since billing is not implemented, upgrading only changes the `Subscription.plan` field manually or via an admin UI.

### Flow:
1. User clicks “Upgrade Now”
2. They land on `/account/upgrade`
3. They see plan comparison
4. They click “Select Pro Plan”
5. **Mock upgrade**:
 - Set `Subscription.plan = "pro"`
 - Show success page:
   “You’re now on Pro! Enjoy advanced features.”

Later, Stripe replaces this flow.

---

# 5. Integration with Real Billing (Future)

When adding real billing:
- Replace the "mock upgrade" with Stripe Checkout
- Add webhook handler:
- Stripe → CraftFlow updates Subscription table