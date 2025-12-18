import { NextRequest, NextResponse } from 'next/server'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'

/**
 * POST /api/quotes/calculate
 * Calculate cost for draft quote data (no database writes)
 * Used for real-time pricing in the quote builder UI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.customerName || !body.eventDate || !body.tiers || body.tiers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, eventDate, tiers' },
        { status: 400 }
      )
    }

    // Transform request body to QuoteInput format
    const quoteInput: QuoteInput = {
      customerId: body.customerId || null,
      customerName: body.customerName,
      eventDate: new Date(body.eventDate),
      tiers: body.tiers.map((tier: any) => ({
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
      decorations: body.decorations || [],
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

    return NextResponse.json(costing)
  } catch (error) {
    console.error('Quote calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate quote cost', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
