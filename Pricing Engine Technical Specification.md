# Pricing Engine Technical Specification
## Detailed Implementation Guide

This document provides the detailed technical specification for implementing the pricing engine that allows salespeople to generate quotes while tracking material costs in real-time.

---

## Architecture Overview

### Data Flow

```
User Input (Quote Builder)
    ↓
Quote Input Validation
    ↓
Pricing Engine Service
    ├──→ Ingredient Cost Calculator
    ├──→ Decoration Cost Calculator
    ├──→ Labor Cost Calculator
    └──→ Material Availability Checker
    ↓
Cost Aggregation
    ↓
Markup Application
    ↓
Quote Output (JSON + UI Update)
```

### Core Service: `lib/services/pricing-engine.ts`

---

## Detailed Implementation

### 1. Enhanced Prisma Schema

Add these models to support the pricing engine:

```prisma
// Enhanced models for pricing engine

model Quote {
  id              String   @id @default(cuid())
  quoteNumber     String   @unique // e.g., "Q-2024-001"
  customerId      String?
  customerName    String
  customerEmail   String?
  status          QuoteStatus @default(DRAFT)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  expiresAt       DateTime
  eventDate       DateTime
  
  // Pricing
  markupPercent   Decimal
  basePrice       Decimal
  customItems     Json     // Array of CustomLineItem
  discounts       Json     // Array of Discount
  finalPrice      Decimal
  
  // Order details
  servings        Int
  estimatedHours  Decimal
  notes           String?
  
  // Relations
  tiers           QuoteTier[]
  costBreakdown   Json?    // Cached OrderCostBreakdown
  
  @@index([customerId])
  @@index([status])
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
  CONVERTED_TO_ORDER
}

model QuoteTier {
  id              String   @id @default(cuid())
  quoteId         String
  quote           Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  tierIndex       Int      // 1 = bottom tier
  tierSizeId      String
  tierSize        TierSize @relation(fields: [tierSizeId], references: [id])
  flavor          String
  filling         String?
  finishType      String   // "buttercream", "fondant", "ganache"
  decorationComplexity String @default("SIMPLE") // SIMPLE, MODERATE, COMPLEX, INTRICATE
  
  @@index([quoteId])
}

model Inventory {
  id              String   @id @default(cuid())
  ingredientId    String   @unique
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])
  quantity        Decimal  // Current stock
  reservedQty     Decimal  @default(0) // Reserved for orders
  availableQty    Decimal  // Calculated: quantity - reservedQty
  unit            String
  reorderPoint    Decimal? // Alert when below this
  lastUpdated     DateTime @default(now())
  
  @@index([ingredientId])
}

model MaterialReservation {
  id              String   @id @default(cuid())
  orderId         String?
  quoteId         String?
  ingredientId    String
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])
  quantity        Decimal
  unit            String
  status          ReservationStatus @default(RESERVED)
  createdAt       DateTime @default(now())
  releasedAt      DateTime?
  
  @@index([orderId])
  @@index([quoteId])
  @@index([ingredientId])
}

enum ReservationStatus {
  RESERVED
  CONSUMED
  RELEASED
}

model PricingRule {
  id              String   @id @default(cuid())
  name            String
  ruleType        PricingRuleType
  customerId      String?  // null = default rule
  orderType       String?  // "wedding", "birthday", etc.
  minServings     Int?
  maxServings     Int?
  markupPercent   Decimal
  isActive        Boolean  @default(true)
  priority        Int      @default(0) // Higher priority = evaluated first
  
  @@index([customerId])
  @@index([isActive])
}

enum PricingRuleType {
  DEFAULT_MARKUP
  CUSTOMER_SPECIFIC
  ORDER_TYPE_SPECIFIC
  VOLUME_BASED
}

model CostHistory {
  id              String   @id @default(cuid())
  ingredientId    String?
  recipeId        String?
  cost            Decimal
  unit            String
  effectiveDate   DateTime @default(now())
  notes           String?
  
  @@index([ingredientId])
  @@index([recipeId])
  @@index([effectiveDate])
}
```

---

## Pricing Engine Service Implementation

### File: `lib/services/pricing-engine.ts`

```typescript
import { prisma } from '@/lib/prisma';
import type { CakeOrder, CakeTier, TierSize, Recipe, Ingredient } from '@prisma/client';

// Type definitions
export interface OrderCostBreakdown {
  // Material Costs
  ingredientCost: number;
  decorationCost: number;
  structuralMaterialCost: number;
  totalMaterialCost: number;
  
  // Labor Costs
  laborCost: number;
  laborHours: number;
  
  // Totals
  totalCostToCompany: number;
  costPerServing: number;
  
  // Pricing
  baseMarkup: number;
  suggestedPrice: number;
  pricePerServing: number;
  
  // Detailed breakdowns
  ingredients: IngredientUsage[];
  decorations: DecorationUsage[];
  laborBreakdown: LaborBreakdown;
  
  // Metadata
  calculationTimestamp: Date;
  pricingVersion: string;
}

export interface IngredientUsage {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  source: string; // Which tier/recipe it came from
}

export interface DecorationUsage {
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  calculationMethod: string;
}

export interface LaborBreakdown {
  baseHours: number;
  complexityMultiplier: number;
  tierMultiplier: number;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
}

export interface QuoteInput {
  customerId?: string;
  customerName: string;
  eventDate: Date;
  servings?: number;
  estimatedHours?: number;
  tiers: {
    tierIndex: number;
    tierSizeId: string;
    flavor: string;
    filling?: string;
    finishType: string;
    decorationComplexity?: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'INTRICATE';
  }[];
  markupPercent?: number;
  customLineItems?: CustomLineItem[];
  discounts?: Discount[];
}

export interface CustomLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Discount {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  reason: string;
}

export class PricingEngine {
  private readonly PRICING_VERSION = '1.0.0';
  
  /**
   * Calculate cost breakdown for an existing order
   * 
   * @param orderId - Order ID
   * @param includeFullRecipes - If true, includes instructions for baker (production use)
   */
  async calculateOrderCost(
    orderId: string,
    includeFullRecipes: boolean = false
  ): Promise<OrderCostBreakdown> {
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        tiers: {
          include: {
            tierSize: {
              include: {
                batterRecipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: true,
                      },
                    },
                    laborRole: true, // Include labor role
                    // Note: instructions, prepMinutes, bakeMinutes, coolMinutes are included
                    // automatically if includeFullRecipes is true (they're part of Recipe model)
                  },
                },
                frostingRecipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: true,
                      },
                    },
                    laborRole: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    return this.calculateCostFromTiers(order.tiers, order.estimatedHours);
  }
  
  /**
   * Calculate cost for quote input (no database order yet)
   */
  async calculateQuoteCost(quoteInput: QuoteInput): Promise<OrderCostBreakdown> {
    // Load tier sizes and recipes
    const tierSizes = await prisma.tierSize.findMany({
      where: {
        id: { in: quoteInput.tiers.map(t => t.tierSizeId) },
      },
      include: {
        batterRecipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
        frostingRecipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });
    
    // Build tier objects similar to CakeTier
    const tiers = quoteInput.tiers.map(t => {
      const tierSize = tierSizes.find(ts => ts.id === t.tierSizeId);
      if (!tierSize) throw new Error(`TierSize ${t.tierSizeId} not found`);
      
      return {
        tierIndex: t.tierIndex,
        tierSize,
        flavor: t.flavor,
        filling: t.filling,
        finishType: t.finishType,
        decorationComplexity: t.decorationComplexity || 'SIMPLE',
      };
    });
    
    const estimatedHours = quoteInput.estimatedHours || 
      await this.estimateLaborHours(tiers);
    
    return this.calculateCostFromTiers(tiers, estimatedHours);
  }
  
  /**
   * Core calculation logic
   */
  private async calculateCostFromTiers(
    tiers: any[],
    estimatedHours: number
  ): Promise<OrderCostBreakdown> {
    // 1. Calculate ingredient costs
    const ingredientBreakdown = await this.calculateIngredientCosts(tiers);
    const ingredientCost = ingredientBreakdown.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    
    // 2. Calculate decoration costs
    const decorationBreakdown = await this.calculateDecorationCosts(tiers);
    const decorationCost = decorationBreakdown.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    
    // 3. Calculate structural material costs
    const structuralCost = await this.calculateStructuralMaterials(tiers);
    
    // 4. Calculate labor costs
    const laborBreakdown = await this.calculateLaborCost(
      tiers,
      estimatedHours
    );
    
    // 5. Calculate totals
    const totalMaterialCost = ingredientCost + decorationCost + structuralCost;
    const totalCostToCompany = totalMaterialCost + laborBreakdown.totalCost;
    
    // 6. Calculate servings
    const totalServings = tiers.reduce(
      (sum, tier) => sum + tier.tierSize.servings,
      0
    );
    
    const costPerServing = totalServings > 0 
      ? totalCostToCompany / totalServings 
      : 0;
    
    return {
      ingredientCost,
      decorationCost,
      structuralMaterialCost: structuralCost,
      totalMaterialCost,
      laborCost: laborBreakdown.totalCost,
      laborHours: laborBreakdown.totalHours,
      totalCostToCompany,
      costPerServing,
      baseMarkup: 0, // Will be applied later
      suggestedPrice: 0, // Will be calculated with markup
      pricePerServing: 0,
      ingredients: ingredientBreakdown,
      decorations: decorationBreakdown,
      laborBreakdown,
      calculationTimestamp: new Date(),
      pricingVersion: this.PRICING_VERSION,
    };
  }
  
  /**
   * Calculate ingredient costs from tiers
   * Note: For costing, we use laborMinutes (quick calculation)
   * For production, include full recipe with instructions
   */
  private async calculateIngredientCosts(
    tiers: any[],
    includeFullRecipe: boolean = false // Set to true to include instructions for baker
  ): Promise<IngredientUsage[]> {
    const ingredientMap = new Map<string, IngredientUsage>();
    
    for (const tier of tiers) {
      const tierSize = tier.tierSize;
      
      // Process batter recipe
      if (tierSize.batterRecipe) {
        await this.processRecipe(
          tierSize.batterRecipe,
          tierSize.batterMultiplier,
          ingredientMap,
          `Tier ${tier.tierIndex} - Batter`,
          includeFullRecipe
        );
      }
      
      // Process frosting recipe
      if (tierSize.frostingRecipe && tierSize.frostingMultiplier) {
        await this.processRecipe(
          tierSize.frostingRecipe,
          tierSize.frostingMultiplier,
          ingredientMap,
          `Tier ${tier.tierIndex} - Frosting`
        );
      }
      
      // Process filling recipe (if exists)
      // TODO: Add filling recipe support
    }
    
    return Array.from(ingredientMap.values());
  }
  
  /**
   * Process a recipe and aggregate ingredients
   * 
   * Note on Instructions vs laborMinutes:
   * - instructions: Step-by-step JSON for baker (production use)
   * - prepMinutes, bakeMinutes, coolMinutes: Time breakdown from instructions
   * - laborMinutes: Total labor time (calculated from instructions or manual entry)
   * 
   * For costing: Use laborMinutes (already calculated, fast)
   * For production: Include full recipe with instructions for baker
   */
  private async processRecipe(
    recipe: Recipe & { ingredients: any[] },
    multiplier: number,
    ingredientMap: Map<string, IngredientUsage>,
    source: string,
    includeFullRecipe: boolean = false
  ): Promise<void> {
    for (const recipeIngredient of recipe.ingredients) {
      const ingredient = recipeIngredient.ingredient;
      const quantity = Number(recipeIngredient.quantity) * multiplier;
      const unitCost = Number(ingredient.costPerUnit);
      const totalCost = quantity * unitCost;
      
      const existing = ingredientMap.get(ingredient.id);
      if (existing) {
        existing.quantity += quantity;
        existing.totalCost += totalCost;
        existing.source += `, ${source}`;
      } else {
        ingredientMap.set(ingredient.id, {
          ingredientId: ingredient.id,
          name: ingredient.name,
          quantity,
          unit: ingredient.unit,
          unitCost,
          totalCost,
          source,
        });
      }
    }
  }
  
  /**
   * Calculate decoration costs (fondant, etc.)
   */
  private async calculateDecorationCosts(
    tiers: any[]
  ): Promise<DecorationUsage[]> {
    const decorations: DecorationUsage[] = [];
    
    // Get fondant material
    const fondant = await prisma.decorationMaterial.findFirst({
      where: {
        usageRuleType: 'FONDANT_PER_SURFACE_AREA',
      },
    });
    
    if (fondant) {
      let totalFondantNeeded = 0;
      
      for (const tier of tiers) {
        if (tier.finishType === 'fondant') {
          const tierSize = tier.tierSize;
          const diameter = Number(tierSize.diameterCm);
          const height = Number(tierSize.heightCm);
          
          // Calculate surface area
          const radius = diameter / 2;
          const topArea = Math.PI * radius * radius;
          const circumference = Math.PI * diameter;
          const sideArea = circumference * height;
          const totalArea = topArea + sideArea;
          
          // Calculate fondant needed
          const fondantPerArea = Number(fondant.usageRuleValue);
          const fondantNeeded = totalArea * fondantPerArea;
          totalFondantNeeded += fondantNeeded;
        }
      }
      
      if (totalFondantNeeded > 0) {
        decorations.push({
          materialId: fondant.id,
          name: fondant.name,
          quantity: totalFondantNeeded,
          unit: fondant.unit,
          unitCost: Number(fondant.costPerUnit),
          totalCost: totalFondantNeeded * Number(fondant.costPerUnit),
          calculationMethod: 'Surface area calculation',
        });
      }
    }
    
    return decorations;
  }
  
  /**
   * Calculate structural materials (boards, dowels)
   */
  private async calculateStructuralMaterials(tiers: any[]): Promise<number> {
    let totalCost = 0;
    
    // Boards: 1 per order (or per tier for large orders)
    const board = await prisma.decorationMaterial.findFirst({
      where: {
        name: { contains: 'board', mode: 'insensitive' },
      },
    });
    
    if (board) {
      const boardQuantity = tiers.length > 3 ? tiers.length : 1;
      totalCost += boardQuantity * Number(board.costPerUnit);
    }
    
    // Dowels: 4 per tier except top tier
    const dowel = await prisma.decorationMaterial.findFirst({
      where: {
        name: { contains: 'dowel', mode: 'insensitive' },
      },
    });
    
    if (dowel) {
      const dowelQuantity = Math.max(0, tiers.length - 1) * 4;
      totalCost += dowelQuantity * Number(dowel.costPerUnit);
    }
    
    return totalCost;
  }
  
  /**
   * Calculate labor cost
   */
  private async calculateLaborCost(
    tiers: any[],
    estimatedHours: number
  ): Promise<LaborBreakdown> {
    // Get labor rate from settings
    const laborRateSetting = await prisma.setting.findUnique({
      where: { key: 'LaborRatePerHour' },
    });
    
    const hourlyRate = laborRateSetting 
      ? Number(laborRateSetting.value) 
      : 20; // Default
    
    // Calculate complexity multipliers
    let complexityMultiplier = 1.0;
    let tierMultiplier = 1.0;
    
    for (const tier of tiers) {
      // Finish type multiplier
      switch (tier.finishType) {
        case 'fondant':
          complexityMultiplier = Math.max(complexityMultiplier, 1.5);
          break;
        case 'ganache':
          complexityMultiplier = Math.max(complexityMultiplier, 1.2);
          break;
        case 'buttercream':
        default:
          complexityMultiplier = Math.max(complexityMultiplier, 1.0);
          break;
      }
      
      // Decoration complexity
      switch (tier.decorationComplexity) {
        case 'INTRICATE':
          complexityMultiplier = Math.max(complexityMultiplier, 2.0);
          break;
        case 'COMPLEX':
          complexityMultiplier = Math.max(complexityMultiplier, 1.5);
          break;
        case 'MODERATE':
          complexityMultiplier = Math.max(complexityMultiplier, 1.2);
          break;
        case 'SIMPLE':
        default:
          break;
      }
    }
    
    // Tier multiplier (multi-tier cakes take more time)
    if (tiers.length > 1) {
      tierMultiplier = 1.0 + (tiers.length - 1) * 0.2;
    }
    
    // Base hours calculation
    const baseHoursPerTier = 2.0; // Default
    const baseHours = tiers.length * baseHoursPerTier;
    
    // Use provided estimate or calculate
    const totalHours = estimatedHours || 
      baseHours * complexityMultiplier * tierMultiplier;
    
    const totalCost = totalHours * hourlyRate;
    
    return {
      baseHours,
      complexityMultiplier,
      tierMultiplier,
      totalHours,
      hourlyRate,
      totalCost,
    };
  }
  
  /**
   * Estimate labor hours based on tiers
   */
  private async estimateLaborHours(tiers: any[]): Promise<number> {
    const laborBreakdown = await this.calculateLaborCost(tiers, 0);
    return laborBreakdown.totalHours;
  }
  
  /**
   * Apply markup and calculate final price
   */
  async applyPricing(
    costBreakdown: OrderCostBreakdown,
    customerId?: string,
    orderType?: string,
    servings?: number
  ): Promise<OrderCostBreakdown> {
    // Get markup percentage
    let markupPercent = await this.getMarkupPercent(
      customerId,
      orderType,
      servings
    );
    
    // Calculate prices
    const suggestedPrice = costBreakdown.totalCostToCompany * (1 + markupPercent);
    const pricePerServing = servings && servings > 0
      ? suggestedPrice / servings
      : costBreakdown.pricePerServing;
    
    return {
      ...costBreakdown,
      baseMarkup: markupPercent,
      suggestedPrice,
      pricePerServing,
    };
  }
  
  /**
   * Get markup percentage based on pricing rules
   */
  private async getMarkupPercent(
    customerId?: string,
    orderType?: string,
    servings?: number
  ): Promise<number> {
    // Get default markup from settings
    const defaultMarkup = await prisma.setting.findUnique({
      where: { key: 'MarkupPercent' },
    });
    
    let markupPercent = defaultMarkup 
      ? Number(defaultMarkup.value) 
      : 0.7; // Default 70%
    
    // Check for customer-specific pricing rules
    if (customerId) {
      const customerRule = await prisma.pricingRule.findFirst({
        where: {
          customerId,
          ruleType: 'CUSTOMER_SPECIFIC',
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      
      if (customerRule) {
        markupPercent = Number(customerRule.markupPercent);
      }
    }
    
    // Check for order type rules
    if (orderType) {
      const orderTypeRule = await prisma.pricingRule.findFirst({
        where: {
          orderType,
          ruleType: 'ORDER_TYPE_SPECIFIC',
          isActive: true,
          ...(servings && {
            minServings: { lte: servings },
            maxServings: { gte: servings },
          }),
        },
        orderBy: { priority: 'desc' },
      });
      
      if (orderTypeRule) {
        markupPercent = Number(orderTypeRule.markupPercent);
      }
    }
    
    return markupPercent;
  }
  
  /**
   * Check material availability
   */
  async checkMaterialAvailability(
    costBreakdown: OrderCostBreakdown
  ): Promise<{
    available: boolean;
    warnings: string[];
    shortages: {
      ingredientId: string;
      name: string;
      needed: number;
      available: number;
    }[];
  }> {
    const warnings: string[] = [];
    const shortages: any[] = [];
    
    for (const ingredient of costBreakdown.ingredients) {
      const inventory = await prisma.inventory.findUnique({
        where: { ingredientId: ingredient.ingredientId },
      });
      
      if (!inventory) {
        warnings.push(`No inventory record for ${ingredient.name}`);
        continue;
      }
      
      const available = Number(inventory.availableQty);
      const needed = ingredient.quantity;
      
      if (available < needed) {
        shortages.push({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          needed,
          available,
        });
      } else if (available < needed * 1.2) {
        // Warning if less than 20% buffer
        warnings.push(
          `Low stock for ${ingredient.name}: ${available} ${ingredient.unit} available, ${needed} ${ingredient.unit} needed`
        );
      }
    }
    
    return {
      available: shortages.length === 0,
      warnings,
      shortages,
    };
  }
}
```

---

## API Routes

### File: `app/api/quotes/calculate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PricingEngine } from '@/lib/services/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const quoteInput = await request.json();
    const engine = new PricingEngine();
    
    // Calculate cost
    const costBreakdown = await engine.calculateQuoteCost(quoteInput);
    
    // Apply pricing
    const pricedBreakdown = await engine.applyPricing(
      costBreakdown,
      quoteInput.customerId,
      quoteInput.orderType,
      quoteInput.servings
    );
    
    // Check availability
    const availability = await engine.checkMaterialAvailability(costBreakdown);
    
    return NextResponse.json({
      costBreakdown: pricedBreakdown,
      availability,
    });
  } catch (error) {
    console.error('Quote calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate quote' },
      { status: 500 }
    );
  }
}
```

---

## Frontend Integration

### Quote Builder Hook: `lib/hooks/useQuoteCalculator.ts`

```typescript
import { useState, useCallback } from 'react';
import type { QuoteInput, OrderCostBreakdown } from '@/lib/services/pricing-engine';

export function useQuoteCalculator() {
  const [loading, setLoading] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState<OrderCostBreakdown | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  
  const calculateQuote = useCallback(async (quoteInput: QuoteInput) => {
    setLoading(true);
    try {
      const response = await fetch('/api/quotes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteInput),
      });
      
      if (!response.ok) {
        throw new Error('Calculation failed');
      }
      
      const data = await response.json();
      setCostBreakdown(data.costBreakdown);
      setAvailability(data.availability);
    } catch (error) {
      console.error('Quote calculation error:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    calculateQuote,
    costBreakdown,
    availability,
    loading,
  };
}
```

---

## Testing Strategy

### Unit Tests: `__tests__/pricing-engine.test.ts`

```typescript
import { PricingEngine } from '@/lib/services/pricing-engine';
import { prismaMock } from '@/lib/prisma-mock';

describe('PricingEngine', () => {
  let engine: PricingEngine;
  
  beforeEach(() => {
    engine = new PricingEngine();
  });
  
  describe('calculateIngredientCosts', () => {
    it('should calculate ingredient costs correctly', async () => {
      // Mock data and test
    });
  });
  
  describe('calculateDecorationCosts', () => {
    it('should calculate fondant costs based on surface area', async () => {
      // Test fondant calculation
    });
  });
  
  describe('applyPricing', () => {
    it('should apply default markup', async () => {
      // Test markup application
    });
    
    it('should apply customer-specific markup', async () => {
      // Test customer pricing rules
    });
  });
});
```

---

## Performance Considerations

1. **Caching**: Cache cost breakdowns for quotes to avoid recalculation
2. **Batch Loading**: Use Prisma `include` to load all needed data in one query
3. **Debouncing**: Debounce quote calculations in UI (wait 500ms after last change)
4. **Background Jobs**: For large orders, calculate costs in background

---

## Next Steps

1. Implement the PricingEngine service
2. Create API routes for quote calculation
3. Build quote builder UI components
4. Add material availability checks
5. Implement quote persistence
6. Add PDF generation for quotes
7. Create admin interface for pricing rules
