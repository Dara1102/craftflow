# Claude Code Instructions for Craftflow

## Critical Rules

### 1. NEVER Use Local Cost Calculations

**DO NOT** use `reduce()`, `sum()`, `useMemo()` or any local JavaScript to calculate costs in UI components.

**ALWAYS** use debounced API calls:
- `/api/orders/calculate` - for order forms
- `/api/quotes/calculate` - for quote forms

**Why:** Local calculations use simplified formulas that drift from server calculations. A $3 difference cascades through markup to become a $5+ difference in final price. See `docs/REGRESSION_ASSESSMENT.md` Issue 8.

**Correct Pattern (from Quote Edit):**
```typescript
useEffect(() => {
  const calculateCost = async () => {
    const response = await fetch('/api/orders/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentFormState })
    })
    setCosting(await response.json())
  }
  const debounce = setTimeout(calculateCost, 500)
  return () => clearTimeout(debounce)
}, [formDependencies])
```

### 2. All Pricing Flows Through lib/costing.ts

The single source of truth for all cost calculations is `lib/costing.ts`. Never duplicate this logic.

### 3. Check Consistency Across Pages

When modifying pricing display, verify the same order/quote shows the same price on:
- Order Edit sidebar
- Order Costing page
- Order Summary page
- Quote Detail page

Run: `npm test -- --testPathPatterns=costing-consistency`

## Before Creating New Pages

1. Check if similar pages exist (Quote Edit, Order Edit) and copy their patterns
2. For any page displaying costs, use the centralized costing API
3. Run the consistency tests after implementation

## Key Files

- `lib/costing.ts` - All cost calculations
- `lib/production-settings.ts` - Volume, surface area calculations
- `app/api/orders/calculate/route.ts` - Order form live costing
- `app/api/quotes/calculate/route.ts` - Quote form live costing
- `docs/REGRESSION_ASSESSMENT.md` - Known issues and prevention strategies
