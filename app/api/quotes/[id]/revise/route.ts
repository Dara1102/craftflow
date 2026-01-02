import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/quotes/[id]/revise
 * Create a new revision of an existing quote
 * Copies all quote data and increments version number
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quoteId = parseInt(id)

    // Get the original quote with all related data
    const originalQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        QuoteTier: true,
        QuoteDecoration: true
      }
    })

    if (!originalQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Determine the original quote ID (for revision chain)
    // If this quote is already a revision, use its originalQuoteId
    // Otherwise, use this quote's ID as the original
    const rootQuoteId = originalQuote.originalQuoteId || originalQuote.id

    // Get the highest version number in the revision chain
    const latestVersion = await prisma.quote.aggregate({
      where: {
        OR: [
          { id: rootQuoteId },
          { originalQuoteId: rootQuoteId }
        ]
      },
      _max: {
        version: true
      }
    })

    const newVersion = (latestVersion._max.version || 1) + 1

    // Generate new quote number with version suffix
    const baseQuoteNumber = originalQuote.quoteNumber.replace(/-v\d+$/, '')
    const newQuoteNumber = `${baseQuoteNumber}-v${newVersion}`

    // Create the new revision
    const revision = await prisma.$transaction(async (tx) => {
      // Create the new quote (revision)
      const newQuote = await tx.quote.create({
        data: {
          quoteNumber: newQuoteNumber,
          customerId: originalQuote.customerId,
          customerName: originalQuote.customerName,
          eventDate: originalQuote.eventDate,
          eventType: originalQuote.eventType,
          theme: originalQuote.theme,
          occasion: originalQuote.occasion,
          colors: originalQuote.colors,
          accentColors: originalQuote.accentColors,
          cakeType: originalQuote.cakeType,
          desiredServings: originalQuote.desiredServings,
          isDelivery: originalQuote.isDelivery,
          deliveryZoneId: originalQuote.deliveryZoneId,
          deliveryDistance: originalQuote.deliveryDistance,
          deliveryContact: originalQuote.deliveryContact,
          deliveryPhone: originalQuote.deliveryPhone,
          deliveryTime: originalQuote.deliveryTime,
          deliveryAddress: originalQuote.deliveryAddress,
          bakerHours: originalQuote.bakerHours,
          assistantHours: originalQuote.assistantHours,
          topperType: originalQuote.topperType,
          topperText: originalQuote.topperText,
          customTopperFee: originalQuote.customTopperFee,
          markupPercent: originalQuote.markupPercent,
          depositPercent: originalQuote.depositPercent,
          discountType: originalQuote.discountType,
          discountValue: originalQuote.discountValue,
          discountReason: originalQuote.discountReason,
          notes: originalQuote.notes,
          termsAndConditions: originalQuote.termsAndConditions,
          status: 'DRAFT', // New revision starts as draft
          version: newVersion,
          originalQuoteId: rootQuoteId
        }
      })

      // Copy all tiers
      for (const tier of originalQuote.QuoteTier) {
        await tx.quoteTier.create({
          data: {
            quoteId: newQuote.id,
            tierIndex: tier.tierIndex,
            tierSizeId: tier.tierSizeId,
            batterRecipeId: tier.batterRecipeId,
            batterMultiplier: tier.batterMultiplier,
            fillingRecipeId: tier.fillingRecipeId,
            fillingMultiplier: tier.fillingMultiplier,
            frostingRecipeId: tier.frostingRecipeId,
            frostingMultiplier: tier.frostingMultiplier,
            flavor: tier.flavor,
            filling: tier.filling,
            finishType: tier.finishType
          }
        })
      }

      // Copy all decorations
      for (const dec of originalQuote.QuoteDecoration) {
        await tx.quoteDecoration.create({
          data: {
            quoteId: newQuote.id,
            decorationTechniqueId: dec.decorationTechniqueId,
            quantity: dec.quantity,
            unitOverride: dec.unitOverride,
            tierIndices: dec.tierIndices,
            notes: dec.notes
          }
        })
      }

      return newQuote
    })

    return NextResponse.json({
      success: true,
      revision,
      message: `Created revision v${newVersion}`
    })
  } catch (error) {
    console.error('Error creating quote revision:', error)
    return NextResponse.json(
      { error: 'Failed to create quote revision', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
