import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'

/**
 * GET /api/quotes/[id]
 * Get a specific quote with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quoteId = parseInt(id)

    const quoteRaw = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        Customer: true,
        DeliveryZone: true,
        QuoteTier: {
          include: {
            TierSize: {
              include: {
                LaborRole: true
              }
            },
            Recipe_QuoteTier_batterRecipeIdToRecipe: {
              include: {
                RecipeIngredient: {
                  include: {
                    Ingredient: true
                  }
                },
                LaborRole: true
              }
            },
            Recipe_QuoteTier_fillingRecipeIdToRecipe: {
              include: {
                RecipeIngredient: {
                  include: {
                    Ingredient: true
                  }
                },
                LaborRole: true
              }
            },
            Recipe_QuoteTier_frostingRecipeIdToRecipe: {
              include: {
                RecipeIngredient: {
                  include: {
                    Ingredient: true
                  }
                },
                LaborRole: true
              }
            }
          },
          orderBy: {
            tierIndex: 'asc'
          }
        },
        QuoteDecoration: {
          include: {
            DecorationTechnique: {
              include: {
                LaborRole: true
              }
            }
          }
        },
        QuoteItem: {
          include: {
            MenuItem: {
              include: {
                ProductType: true,
                Recipe_MenuItem_batterRecipeIdToRecipe: true,
                Recipe_MenuItem_fillingRecipeIdToRecipe: true,
                Recipe_MenuItem_frostingRecipeIdToRecipe: true,
                Packaging: true
              }
            },
            Packaging: true
          }
        },
        CakeOrder: true
      }
    })

    if (!quoteRaw) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Helper to transform recipe with ingredients
    const transformRecipe = (recipe: any) => {
      if (!recipe) return null
      return {
        ...recipe,
        laborRole: recipe.LaborRole,
        recipeIngredients: recipe.RecipeIngredient?.map((ri: any) => ({
          ...ri,
          ingredient: ri.Ingredient
        })) || []
      }
    }

    // Transform to expected format for frontend
    const quote = {
      ...quoteRaw,
      customer: quoteRaw.Customer,
      deliveryZone: quoteRaw.DeliveryZone,
      quoteTiers: quoteRaw.QuoteTier.map((tier: any) => ({
        ...tier,
        tierSize: tier.TierSize ? {
          ...tier.TierSize,
          assemblyRole: tier.TierSize.LaborRole
        } : null,
        batterRecipe: transformRecipe(tier.Recipe_QuoteTier_batterRecipeIdToRecipe),
        fillingRecipe: transformRecipe(tier.Recipe_QuoteTier_fillingRecipeIdToRecipe),
        frostingRecipe: transformRecipe(tier.Recipe_QuoteTier_frostingRecipeIdToRecipe)
      })),
      quoteDecorations: quoteRaw.QuoteDecoration.map((dec: any) => ({
        ...dec,
        decorationTechnique: dec.DecorationTechnique ? {
          ...dec.DecorationTechnique,
          laborRole: dec.DecorationTechnique.LaborRole
        } : null
      })),
      quoteItems: quoteRaw.QuoteItem.map((item: any) => ({
        ...item,
        menuItem: item.MenuItem ? {
          ...item.MenuItem,
          productType: item.MenuItem.ProductType,
          batterRecipe: item.MenuItem.Recipe_MenuItem_batterRecipeIdToRecipe,
          fillingRecipe: item.MenuItem.Recipe_MenuItem_fillingRecipeIdToRecipe,
          frostingRecipe: item.MenuItem.Recipe_MenuItem_frostingRecipeIdToRecipe,
          defaultPackaging: item.MenuItem.Packaging
        } : null,
        packaging: item.Packaging
      })),
      convertedOrder: quoteRaw.CakeOrder
    }

    // If quote is ACCEPTED and has locked costing, use that instead of recalculating
    if (quote.status === 'ACCEPTED' && quote.lockedCosting) {
      try {
        const lockedCosting = JSON.parse(quote.lockedCosting)
        return NextResponse.json({
          quote,
          costing: lockedCosting,
          isLocked: true
        })
      } catch (error) {
        console.error('Failed to parse locked costing:', error)
        // Fall through to recalculate
      }
    }
    
    // Calculate current costing
    const quoteInput: QuoteInput = {
      customerId: quote.customerId,
      customerName: quote.customerName,
      eventDate: quote.eventDate,
      tiers: quote.quoteTiers.map(tier => ({
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
      decorations: quote.quoteDecorations.map(dec => ({
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

    const costing = await calculateQuoteCost(quoteInput)

    return NextResponse.json({
      quote,
      costing
    })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/quotes/[id]
 * Update a quote
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quoteId = parseInt(id)
    const body = await request.json()

    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteTiers: {
          include: {
            tierSize: true
          }
        },
        quoteDecorations: {
          include: {
            decorationTechnique: true
          }
        }
      }
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // If status is changing to ACCEPTED, lock the costs
    let lockedCosting = existingQuote.lockedCosting
    let lockedAt = existingQuote.lockedAt
    
    if (body.status === 'ACCEPTED' && existingQuote.status !== 'ACCEPTED') {
      // Calculate and lock costs
      const quoteInput: QuoteInput = {
        customerId: body.customerId !== undefined ? body.customerId : existingQuote.customerId,
        customerName: body.customerName !== undefined ? body.customerName : existingQuote.customerName,
        eventDate: body.eventDate ? new Date(body.eventDate) : existingQuote.eventDate,
        tiers: existingQuote.quoteTiers.map(tier => ({
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
        decorations: existingQuote.quoteDecorations.map(dec => ({
          decorationTechniqueId: dec.decorationTechniqueId,
          quantity: dec.quantity
        })),
        isDelivery: body.isDelivery !== undefined ? body.isDelivery : existingQuote.isDelivery,
        deliveryZoneId: body.deliveryZoneId !== undefined ? body.deliveryZoneId : existingQuote.deliveryZoneId,
        deliveryDistance: body.deliveryDistance !== undefined ? parseFloat(body.deliveryDistance) : (existingQuote.deliveryDistance ? Number(existingQuote.deliveryDistance) : null),
        bakerHours: body.bakerHours !== undefined ? parseFloat(body.bakerHours) : (existingQuote.bakerHours ? Number(existingQuote.bakerHours) : null),
        assistantHours: body.assistantHours !== undefined ? parseFloat(body.assistantHours) : (existingQuote.assistantHours ? Number(existingQuote.assistantHours) : null),
        topperType: body.topperType !== undefined ? body.topperType : existingQuote.topperType,
        topperText: body.topperText !== undefined ? body.topperText : existingQuote.topperText,
        customTopperFee: body.customTopperFee !== undefined ? parseFloat(body.customTopperFee) : (existingQuote.customTopperFee ? Number(existingQuote.customTopperFee) : null),
        markupPercent: body.markupPercent !== undefined ? parseFloat(body.markupPercent) : Number(existingQuote.markupPercent),
        discountType: body.discountType !== undefined ? body.discountType : existingQuote.discountType,
        discountValue: body.discountValue !== undefined ? parseFloat(body.discountValue) : (existingQuote.discountValue ? Number(existingQuote.discountValue) : null),
        discountReason: body.discountReason !== undefined ? body.discountReason : existingQuote.discountReason
      }
      
      const { calculateQuoteCost } = await import('@/lib/costing')
      const finalCosting = await calculateQuoteCost(quoteInput)
      lockedCosting = JSON.stringify(finalCosting)
      lockedAt = new Date()
    }

    // Use a transaction to update quote and optionally replace tiers/decorations
    // Increase timeout to 30 seconds for larger updates
    const quote = await prisma.$transaction(async (tx) => {
      // If tiers are provided, delete existing and create new ones
      if (body.tiers && Array.isArray(body.tiers)) {
        await tx.quoteTier.deleteMany({
          where: { quoteId }
        })

        for (const tier of body.tiers) {
          await tx.quoteTier.create({
            data: {
              quoteId,
              tierSizeId: tier.tierSizeId,
              tierIndex: tier.tierIndex,
              batterRecipeId: tier.batterRecipeId || null,
              batterMultiplier: tier.batterMultiplier || null,
              fillingRecipeId: tier.fillingRecipeId || null,
              fillingMultiplier: tier.fillingMultiplier || null,
              frostingRecipeId: tier.frostingRecipeId || null,
              frostingMultiplier: tier.frostingMultiplier || null,
              flavor: tier.flavor || null,
              filling: tier.filling || null,
              finishType: tier.finishType || null
            }
          })
        }
      }

      // If decorations are provided, delete existing and create new ones
      if (body.decorations && Array.isArray(body.decorations)) {
        await tx.quoteDecoration.deleteMany({
          where: { quoteId }
        })

        for (const dec of body.decorations) {
          await tx.quoteDecoration.create({
            data: {
              quoteId,
              decorationTechniqueId: dec.decorationTechniqueId,
              quantity: dec.quantity || 1,
              unitOverride: dec.unitOverride || null,
              tierIndices: dec.tierIndices || [],
              notes: dec.notes || null
            }
          })
        }
      }

      // Build update data object, only including fields that are provided
      // Helper to safely parse float, returning null for invalid/empty values
      const safeParseFloat = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null
        const parsed = parseFloat(value)
        return isNaN(parsed) ? null : parsed
      }

      const updateData: any = {}

      // Handle customer relation
      if (body.customerId !== undefined) {
        if (body.customerId === null) {
          updateData.customer = { disconnect: true }
        } else {
          updateData.customer = { connect: { id: body.customerId } }
        }
      }

      // Handle delivery zone relation
      if (body.deliveryZoneId !== undefined) {
        if (body.deliveryZoneId === null) {
          updateData.deliveryZone = { disconnect: true }
        } else {
          updateData.deliveryZone = { connect: { id: body.deliveryZoneId } }
        }
      }

      // Scalar fields
      if (body.customerName !== undefined) updateData.customerName = body.customerName
      if (body.eventDate) updateData.eventDate = new Date(body.eventDate)
      if (body.eventType !== undefined) updateData.eventType = body.eventType
      if (body.theme !== undefined) updateData.theme = body.theme
      if (body.occasion !== undefined) updateData.occasion = body.occasion
      if (body.colors !== undefined) updateData.colors = body.colors
      if (body.accentColors !== undefined) updateData.accentColors = body.accentColors
      if (body.budgetMin !== undefined) updateData.budgetMin = safeParseFloat(body.budgetMin)
      if (body.budgetMax !== undefined) updateData.budgetMax = safeParseFloat(body.budgetMax)
      if (body.cakeType !== undefined) updateData.cakeType = body.cakeType
      if (body.desiredServings !== undefined) updateData.desiredServings = body.desiredServings
      if (body.isDelivery !== undefined) updateData.isDelivery = body.isDelivery
      if (body.deliveryDistance !== undefined) updateData.deliveryDistance = safeParseFloat(body.deliveryDistance)
      if (body.deliveryContact !== undefined) updateData.deliveryContact = body.deliveryContact
      if (body.deliveryPhone !== undefined) updateData.deliveryPhone = body.deliveryPhone
      if (body.deliveryTime) updateData.deliveryTime = new Date(body.deliveryTime)
      if (body.deliveryAddress !== undefined) updateData.deliveryAddress = body.deliveryAddress
      if (body.bakerHours !== undefined) updateData.bakerHours = safeParseFloat(body.bakerHours)
      if (body.assistantHours !== undefined) updateData.assistantHours = safeParseFloat(body.assistantHours)
      if (body.topperType !== undefined) updateData.topperType = body.topperType
      if (body.topperText !== undefined) updateData.topperText = body.topperText
      if (body.customTopperFee !== undefined) updateData.customTopperFee = safeParseFloat(body.customTopperFee)
      if (body.markupPercent !== undefined) updateData.markupPercent = safeParseFloat(body.markupPercent)
      if (body.depositPercent !== undefined) {
        updateData.depositPercent = body.depositPercent === null ? null : safeParseFloat(body.depositPercent)
      }
      if (body.discountType !== undefined) updateData.discountType = body.discountType
      if (body.discountValue !== undefined) updateData.discountValue = safeParseFloat(body.discountValue)
      if (body.discountReason !== undefined) updateData.discountReason = body.discountReason
      if (body.status !== undefined) updateData.status = body.status
      if (body.expiresAt) updateData.expiresAt = new Date(body.expiresAt)
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.termsAndConditions !== undefined) updateData.termsAndConditions = body.termsAndConditions
      if (body.status === 'SENT' && !existingQuote.sentAt) updateData.sentAt = new Date()

      // Lock costs when quote is accepted
      if (lockedCosting !== undefined) updateData.lockedCosting = lockedCosting
      if (lockedAt !== undefined) updateData.lockedAt = lockedAt

      // Update main quote fields
      return tx.quote.update({
        where: { id: quoteId },
        data: updateData,
        include: {
          customer: true,
          deliveryZone: true,
          quoteTiers: {
            include: {
              tierSize: true,
              batterRecipe: true,
              fillingRecipe: true,
              frostingRecipe: true
            },
            orderBy: {
              tierIndex: 'asc'
            }
          },
          quoteDecorations: {
            include: {
              decorationTechnique: true
            }
          }
        }
      })
    }, {
      maxWait: 30000, // 30 seconds max wait to acquire connection
      timeout: 60000, // 60 seconds timeout for the transaction
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Failed to update quote', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
