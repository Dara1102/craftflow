import { NextRequest, NextResponse } from 'next/server'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'

/**
 * POST /api/orders/calculate
 * Calculate cost for order form data (no database writes)
 * Used for real-time pricing in the order edit UI
 *
 * Uses the same calculation logic as quotes since both need
 * to calculate costs from form input data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.customerName || !body.eventDate) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, eventDate' },
        { status: 400 }
      )
    }

    // Transform request body to QuoteInput format
    // (same structure works for both quotes and orders)
    const quoteInput: QuoteInput = {
      customerId: body.customerId || null,
      customerName: body.customerName,
      eventDate: new Date(body.eventDate),
      tiers: (body.tiers || []).map((tier: any) => ({
        tierSizeId: tier.tierSizeId,
        tierIndex: tier.tierIndex || 1,
        batterRecipeId: tier.batterRecipeId || null,
        batterMultiplier: tier.batterMultiplier || null,
        fillingRecipeId: tier.fillingRecipeId || null,
        fillingMultiplier: tier.fillingMultiplier || null,
        frostingRecipeId: tier.frostingRecipeId || null,
        frostingMultiplier: tier.frostingMultiplier || null,
        flavor: tier.flavor || null,
        filling: tier.filling || null,
        finishType: tier.finishType || null
      })),
      decorations: (body.decorations || []).map((dec: any) => ({
        decorationTechniqueId: dec.decorationTechniqueId,
        quantity: dec.quantity || 1,
        unitOverride: dec.unitOverride || undefined,
        tierIndices: dec.tierIndices || undefined
      })),
      products: (body.products || []).map((p: any) => ({
        menuItemId: p.menuItemId,
        quantity: p.quantity || 1,
        packagingSelections: p.packagingSelections || [],
        packagingId: p.packagingId || null,
        packagingQty: p.packagingQty || null,
        notes: p.notes || null
      })),
      isDelivery: body.isDelivery || false,
      deliveryZoneId: body.deliveryZoneId || null,
      deliveryDistance: body.deliveryDistance || null,
      bakerHours: body.bakerHours || null,
      assistantHours: body.assistantHours || null,
      topperType: body.topperType || null,
      topperText: body.topperText || null,
      customTopperFee: body.customTopperFee || null,
      markupPercent: body.markupPercent,
      discountType: body.discountType || null,
      discountValue: body.discountValue || null,
      discountReason: body.discountReason || null
    }

    const costing = await calculateQuoteCost(quoteInput)

    // For orders, add the priceAdjustment to finalPrice if provided
    // (quotes handle this separately in UI, but orders expect it included)
    const priceAdjustment = body.priceAdjustment || 0
    const adjustedCosting = {
      ...costing,
      priceAdjustment,
      finalPrice: costing.finalPrice + priceAdjustment
    }

    return NextResponse.json(adjustedCosting)
  } catch (error) {
    console.error('Order calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate order cost', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
