import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'
import QuoteDetailClient from './QuoteDetailClient'

// Default quote policy boilerplate
const DEFAULT_QUOTE_POLICY = `**Quote Terms & Conditions**

1. **Validity**: This quote is valid for 30 days from the date of issue.

2. **Deposit**: A 50% non-refundable deposit is required to confirm your order. The remaining balance is due 7 days before the event date.

3. **Changes**: Order changes may be made up to 14 days before the event date. Changes made after this time may incur additional fees or may not be possible.

4. **Cancellation**:
   - More than 30 days before event: Full deposit refund minus $50 administrative fee
   - 14-30 days before event: 50% deposit refund
   - Less than 14 days before event: No refund

5. **Delivery**: Delivery fees are non-refundable. We are not responsible for damage caused by third-party handling after delivery.

6. **Allergies**: Please inform us of any allergies. While we take precautions, our kitchen handles nuts, dairy, eggs, and gluten.

7. **Images**: Design images are for reference only. Final cake may vary slightly due to the handcrafted nature of our work.

8. **Storage**: Cakes should be stored in a cool, dry place and consumed within 3 days of delivery.`

// Helper to build revision history from quote data
function buildRevisionHistory(quote: any) {
  const history: Array<{
    id: number
    quoteNumber: string
    version: number
    status: string
    createdAt: string
  }> = []

  // If this is a revision, include the original
  if (quote.Quote) {
    history.push({
      id: quote.Quote.id,
      quoteNumber: quote.Quote.quoteNumber,
      version: quote.Quote.version,
      status: quote.Quote.status,
      createdAt: quote.Quote.createdAt.toISOString()
    })
  }

  // Include this quote if it's the original (version 1)
  if (quote.version === 1) {
    history.push({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      version: quote.version,
      status: quote.status,
      createdAt: quote.createdAt.toISOString()
    })
  }

  // Include all revisions
  if (quote.other_Quote) {
    for (const rev of quote.other_Quote) {
      // Don't add duplicates
      if (!history.some(h => h.id === rev.id)) {
        history.push({
          id: rev.id,
          quoteNumber: rev.quoteNumber,
          version: rev.version,
          status: rev.status,
          createdAt: rev.createdAt.toISOString()
        })
      }
    }
  }

  // Add current quote if it's a revision and not already in history
  if (quote.version > 1 && !history.some(h => h.id === quote.id)) {
    history.push({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      version: quote.version,
      status: quote.status,
      createdAt: quote.createdAt.toISOString()
    })
  }

  // Sort by version
  return history.sort((a, b) => a.version - b.version)
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quoteId = parseInt(id)

  // Fetch settings
  const [quotePolicySetting, defaultDepositSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'QuotePolicy' } }),
    prisma.setting.findUnique({ where: { key: 'DefaultDepositPercent' } })
  ])
  const defaultPolicy = quotePolicySetting?.value || DEFAULT_QUOTE_POLICY
  const defaultDepositPercent = defaultDepositSetting?.value
    ? parseFloat(defaultDepositSetting.value)
    : 0.5

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      Customer: true,
      DeliveryZone: true,
      QuoteTier: {
        include: {
          TierSize: true,
          Recipe_QuoteTier_batterRecipeIdToRecipe: true,
          Recipe_QuoteTier_fillingRecipeIdToRecipe: true,
          Recipe_QuoteTier_frostingRecipeIdToRecipe: true
        },
        orderBy: {
          tierIndex: 'asc'
        }
      },
      QuoteDecoration: {
        include: {
          DecorationTechnique: true
        }
      },
      CakeOrder: true,
      Quote: {
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          status: true,
          createdAt: true
        }
      },
      other_Quote: {
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          status: true,
          createdAt: true
        },
        orderBy: {
          version: 'asc'
        }
      }
    }
  })

  if (!quote) {
    notFound()
  }

  // Calculate costing
  const quoteInput: QuoteInput = {
    customerId: quote.customerId,
    customerName: quote.customerName,
    eventDate: quote.eventDate,
    tiers: quote.QuoteTier.map((tier: typeof quote.QuoteTier[0]) => ({
      tierSizeId: tier.tierSizeId,
      tierIndex: tier.tierIndex,
      batterRecipeId: tier.batterRecipeId,
      batterMultiplier: tier.batterMultiplier ? Number(tier.batterMultiplier) : null,
      fillingRecipeId: tier.fillingRecipeId,
      fillingMultiplier: tier.fillingMultiplier ? Number(tier.fillingMultiplier) : null,
      frostingRecipeId: tier.frostingRecipeId,
      frostingMultiplier: tier.frostingMultiplier ? Number(tier.frostingMultiplier) : null,
      flavor: tier.flavor,
      filling: tier.filling,
      finishType: tier.finishType
    })),
    decorations: quote.QuoteDecoration.map((dec: typeof quote.QuoteDecoration[0]) => ({
      decorationTechniqueId: dec.decorationTechniqueId,
      quantity: dec.quantity,
      unitOverride: dec.unitOverride || undefined,
      tierIndices: dec.tierIndices && dec.tierIndices.length > 0 ? dec.tierIndices : undefined
    })),
    isDelivery: quote.isDelivery,
    deliveryZoneId: quote.deliveryZoneId,
    deliveryDistance: quote.deliveryDistance ? Number(quote.deliveryDistance) : null,
    bakerHours: quote.bakerHours ? Number(quote.bakerHours) : null,
    assistantHours: quote.assistantHours ? Number(quote.assistantHours) : null,
    topperType: quote.topperType,
    topperText: quote.topperText,
    customTopperFee: quote.customTopperFee ? Number(quote.customTopperFee) : null,
    markupPercent: Number(quote.markupPercent),
    discountType: quote.discountType,
    discountValue: quote.discountValue ? Number(quote.discountValue) : null,
    discountReason: quote.discountReason
  }

  const costingRaw = await calculateQuoteCost(quoteInput)

  // Serialize costing to convert Decimal types to plain numbers
  // Remove recipeMatches as it contains complex objects not needed for display
  const costing = {
    totalServings: costingRaw.totalServings,
    ingredients: costingRaw.ingredients,
    decorations: costingRaw.decorations,
    topper: costingRaw.topper,
    delivery: costingRaw.delivery,
    discount: costingRaw.discount,
    laborBreakdown: costingRaw.laborBreakdown,
    ingredientCost: costingRaw.ingredientCost,
    decorationMaterialCost: costingRaw.decorationMaterialCost,
    decorationLaborCost: costingRaw.decorationLaborCost,
    topperCost: costingRaw.topperCost,
    deliveryCost: costingRaw.deliveryCost,
    baseLaborCost: costingRaw.baseLaborCost,
    totalLaborCost: costingRaw.totalLaborCost,
    totalCost: costingRaw.totalCost,
    markupPercent: costingRaw.markupPercent,
    suggestedPrice: costingRaw.suggestedPrice,
    discountAmount: costingRaw.discountAmount,
    finalPrice: costingRaw.finalPrice,
    costPerServing: costingRaw.costPerServing,
    suggestedPricePerServing: costingRaw.suggestedPricePerServing
  }

  // Serialize quote data for client component
  const serializedQuote = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    customerName: quote.customerName,
    customerId: quote.customerId,
    customer: quote.Customer ? {
      id: quote.Customer.id,
      name: quote.Customer.name,
      email: quote.Customer.email,
      phone: quote.Customer.phone,
      company: quote.Customer.company
    } : null,
    eventDate: quote.eventDate.toISOString(),
    eventType: quote.eventType,
    theme: quote.theme,
    occasion: quote.occasion,
    colors: quote.colors,
    accentColors: quote.accentColors,
    desiredServings: quote.desiredServings,
    budgetMin: quote.budgetMin ? Number(quote.budgetMin) : null,
    budgetMax: quote.budgetMax ? Number(quote.budgetMax) : null,
    isDelivery: quote.isDelivery,
    deliveryZone: quote.DeliveryZone ? {
      id: quote.DeliveryZone.id,
      name: quote.DeliveryZone.name
    } : null,
    deliveryAddress: quote.deliveryAddress,
    deliveryTime: quote.deliveryTime?.toISOString() || null,
    topperType: quote.topperType,
    topperText: quote.topperText,
    termsAndConditions: quote.termsAndConditions || defaultPolicy,
    expiresAt: quote.expiresAt?.toISOString() || null,
    sentAt: quote.sentAt?.toISOString() || null,
    notes: quote.notes,
    convertedOrderId: quote.convertedOrderId,
    depositPercent: quote.depositPercent ? Number(quote.depositPercent) : null,
    version: quote.version,
    originalQuoteId: quote.originalQuoteId,
    revisionHistory: buildRevisionHistory(quote),
    quoteTiers: quote.QuoteTier.map((tier: typeof quote.QuoteTier[0]) => ({
      id: tier.id,
      tierIndex: tier.tierIndex,
      tierSize: {
        id: tier.TierSize.id,
        name: tier.TierSize.name,
        servings: tier.TierSize.servings,
        shape: tier.TierSize.shape
      },
      flavor: tier.flavor,
      filling: tier.filling,
      finishType: tier.finishType,
      batterRecipe: tier.Recipe_QuoteTier_batterRecipeIdToRecipe ? { id: tier.Recipe_QuoteTier_batterRecipeIdToRecipe.id, name: tier.Recipe_QuoteTier_batterRecipeIdToRecipe.name } : null,
      fillingRecipe: tier.Recipe_QuoteTier_fillingRecipeIdToRecipe ? { id: tier.Recipe_QuoteTier_fillingRecipeIdToRecipe.id, name: tier.Recipe_QuoteTier_fillingRecipeIdToRecipe.name } : null,
      frostingRecipe: tier.Recipe_QuoteTier_frostingRecipeIdToRecipe ? { id: tier.Recipe_QuoteTier_frostingRecipeIdToRecipe.id, name: tier.Recipe_QuoteTier_frostingRecipeIdToRecipe.name } : null
    })),
    quoteDecorations: quote.QuoteDecoration.map((dec: typeof quote.QuoteDecoration[0]) => ({
      id: dec.id,
      quantity: dec.quantity,
      notes: dec.notes,
      decorationTechnique: {
        id: dec.DecorationTechnique.id,
        name: dec.DecorationTechnique.name,
        category: dec.DecorationTechnique.category
      }
    }))
  }

  return (
    <QuoteDetailClient
      quote={serializedQuote}
      costing={costing}
      defaultPolicy={defaultPolicy}
      defaultDepositPercent={defaultDepositPercent}
    />
  )
}
