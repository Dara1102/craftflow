import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'

/**
 * POST /api/quotes/[id]/convert
 * Convert an accepted quote to an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quoteId = parseInt(id)

    // Get the quote with all related data including recipe names
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        QuoteTier: {
          include: {
            Recipe_QuoteTier_batterRecipeIdToRecipe: true,
            Recipe_QuoteTier_fillingRecipeIdToRecipe: true,
            Recipe_QuoteTier_frostingRecipeIdToRecipe: true
          }
        },
        QuoteDecoration: true,
        QuoteItem: true
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Check if quote is in ACCEPTED status
    if (quote.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Quote must be accepted before converting to order' },
        { status: 400 }
      )
    }

    // Check if already converted
    if (quote.convertedOrderId) {
      return NextResponse.json(
        { error: 'Quote has already been converted to an order', orderId: quote.convertedOrderId },
        { status: 400 }
      )
    }

    // Calculate estimated hours from actual costing labor breakdown
    const quoteInput: QuoteInput = {
      customerId: quote.customerId,
      customerName: quote.customerName,
      eventDate: quote.eventDate,
      tiers: quote.QuoteTier.map(tier => ({
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
      decorations: quote.QuoteDecoration.map(dec => ({
        decorationTechniqueId: dec.decorationTechniqueId,
        quantity: dec.quantity
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

    const costing = await calculateQuoteCost(quoteInput)

    // Sum up total hours from labor breakdown
    const estimatedHours = costing.laborBreakdown.reduce((total, labor) => total + labor.hours, 0)

    // Create the order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the CakeOrder
      const newOrder = await tx.cakeOrder.create({
        data: {
          customerId: quote.customerId,
          customerName: quote.customerName,
          eventDate: quote.eventDate,
          cakeType: quote.cakeType,
          desiredServings: quote.desiredServings,
          theme: quote.theme,
          occasion: quote.occasion,
          colors: quote.colors,
          accentColors: quote.accentColors,
          isDelivery: quote.isDelivery,
          deliveryZoneId: quote.deliveryZoneId,
          deliveryDistance: quote.deliveryDistance,
          deliveryContact: quote.deliveryContact,
          deliveryPhone: quote.deliveryPhone,
          deliveryTime: quote.deliveryTime,
          deliveryAddress: quote.deliveryAddress,
          estimatedHours: estimatedHours,
          bakerHours: quote.bakerHours,
          assistantHours: quote.assistantHours,
          topperType: quote.topperType,
          topperText: quote.topperText,
          customTopperFee: quote.customTopperFee,
          markupPercent: quote.markupPercent,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          discountReason: quote.discountReason,
          notes: quote.notes,
          status: 'CONFIRMED'
        }
      })

      // Create CakeTiers from QuoteTiers
      // Use recipe names as fallback for legacy flavor/filling/finishType fields
      for (const tier of quote.QuoteTier) {
        // Derive values: use legacy field if set, otherwise use recipe name
        const derivedFlavor = tier.flavor || tier.Recipe_QuoteTier_batterRecipeIdToRecipe?.name || null
        const derivedFilling = tier.filling || tier.Recipe_QuoteTier_fillingRecipeIdToRecipe?.name || null
        const derivedFinishType = tier.finishType || tier.Recipe_QuoteTier_frostingRecipeIdToRecipe?.name || null

        await tx.cakeTier.create({
          data: {
            cakeOrderId: newOrder.id,
            tierIndex: tier.tierIndex,
            tierSizeId: tier.tierSizeId,
            batterRecipeId: tier.batterRecipeId,
            batterMultiplier: tier.batterMultiplier,
            fillingRecipeId: tier.fillingRecipeId,
            fillingMultiplier: tier.fillingMultiplier,
            frostingRecipeId: tier.frostingRecipeId,
            frostingMultiplier: tier.frostingMultiplier,
            flavor: derivedFlavor,
            filling: derivedFilling,
            finishType: derivedFinishType
          }
        })
      }

      // Create OrderDecorations from QuoteDecorations
      for (const dec of quote.QuoteDecoration) {
        await tx.orderDecoration.create({
          data: {
            cakeOrderId: newOrder.id,
            decorationTechniqueId: dec.decorationTechniqueId,
            quantity: dec.quantity,
            notes: dec.notes
          }
        })
      }

      // Create OrderItems from QuoteItems (products like cupcakes, cake pops, etc.)
      for (const item of quote.QuoteItem) {
        await tx.orderItem.create({
          data: {
            cakeOrderId: newOrder.id,
            itemType: item.itemType,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            packagingId: item.packagingId,
            packagingQty: item.packagingQty,
            notes: item.notes
          }
        })
      }

      // Update the quote with the converted order ID
      await tx.quote.update({
        where: { id: quoteId },
        data: { convertedOrderId: newOrder.id }
      })

      return newOrder
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'Quote successfully converted to order'
    })
  } catch (error) {
    console.error('Error converting quote to order:', error)
    return NextResponse.json(
      { error: 'Failed to convert quote to order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
