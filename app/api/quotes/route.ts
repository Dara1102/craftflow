import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQuoteCost, QuoteInput } from '@/lib/costing'

/**
 * GET /api/quotes
 * List all quotes with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (customerId) {
      where.customerId = parseInt(customerId)
    }

    const quotesRaw = await prisma.quote.findMany({
      where,
      include: {
        Customer: true,
        DeliveryZone: true,
        QuoteTier: {
          include: {
            TierSize: true,
            Recipe_QuoteTier_batterRecipeIdToRecipe: true,
            Recipe_QuoteTier_fillingRecipeIdToRecipe: true,
            Recipe_QuoteTier_frostingRecipeIdToRecipe: true
          }
        },
        QuoteDecoration: {
          include: {
            DecorationTechnique: true
          }
        },
        QuoteItem: {
          include: {
            MenuItem: {
              include: {
                ProductType: true
              }
            },
            Packaging: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to expected format for frontend
    const quotes = quotesRaw.map(quote => ({
      ...quote,
      customer: quote.Customer,
      deliveryZone: quote.DeliveryZone,
      quoteTiers: quote.QuoteTier.map(tier => ({
        ...tier,
        tierSize: tier.TierSize,
        batterRecipe: tier.Recipe_QuoteTier_batterRecipeIdToRecipe,
        fillingRecipe: tier.Recipe_QuoteTier_fillingRecipeIdToRecipe,
        frostingRecipe: tier.Recipe_QuoteTier_frostingRecipeIdToRecipe
      })),
      quoteDecorations: quote.QuoteDecoration.map(dec => ({
        ...dec,
        decorationTechnique: dec.DecorationTechnique
      })),
      quoteItems: quote.QuoteItem.map(item => ({
        ...item,
        menuItem: item.MenuItem ? {
          ...item.MenuItem,
          productType: item.MenuItem.ProductType
        } : null,
        packaging: item.Packaging
      }))
    }))

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/quotes
 * Create a new quote
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid request body', 
          details: 'Request body must be valid JSON'
        },
        { status: 400 }
      )
    }

    // Validate required fields
    const trimmedCustomerName = body.customerName?.trim() || ''
    if (!trimmedCustomerName) {
      return NextResponse.json(
        { error: 'Customer name is required', details: 'Customer name cannot be empty' },
        { status: 400 }
      )
    }
    if (!body.eventDate) {
      return NextResponse.json(
        { error: 'Event date is required', details: 'Please select an event date' },
        { status: 400 }
      )
    }
    const validTiers = body.tiers?.filter((t: any) => t.tierSizeId && t.tierSizeId > 0) || []
    if (validTiers.length === 0) {
      return NextResponse.json(
        { error: 'At least one tier with a size is required', details: 'Please add at least one tier and select a size' },
        { status: 400 }
      )
    }

    // Generate quote number
    // Safety check: ensure quote model exists
    if (typeof prisma.quote === 'undefined') {
      return NextResponse.json(
        { 
          error: 'Prisma client not updated', 
          details: 'The Quote model is missing from Prisma client. Please run: npx prisma generate && restart dev server'
        },
        { status: 500 }
      )
    }
    
    const year = new Date().getFullYear()
    const lastQuote = await prisma.quote.findFirst({
      where: {
        quoteNumber: {
          startsWith: `Q-${year}-`
        }
      },
      orderBy: {
        quoteNumber: 'desc'
      }
    })

    let quoteNumber: string
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2])
      quoteNumber = `Q-${year}-${String(lastNum + 1).padStart(3, '0')}`
    } else {
      quoteNumber = `Q-${year}-001`
    }

    // Calculate costing
    const quoteInput: QuoteInput = {
      customerId: body.customerId || null,
      customerName: trimmedCustomerName,
      eventDate: new Date(body.eventDate),
      tiers: validTiers.map((tier: any) => ({
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

    // Validate markupPercent before creating quote
    let markupPercentValue: number
    if (body.markupPercent !== undefined && body.markupPercent !== null) {
      const parsed = parseFloat(body.markupPercent.toString())
      if (!isNaN(parsed)) {
        markupPercentValue = parsed
      } else {
        // Invalid value, use default
        markupPercentValue = parseFloat(costing.markupPercent?.toString() || '0.70')
      }
    } else {
      // Use costing markupPercent or default
      markupPercentValue = parseFloat(costing.markupPercent?.toString() || '0.70')
    }
    
    // Ensure markupPercent is valid (not NaN)
    if (isNaN(markupPercentValue)) {
      markupPercentValue = 0.70 // Default 70% markup
    }

    // Prepare decorations data with validation
    const decorationsToCreate = (body.decorations || [])
      .filter((dec: any) => {
        // Filter out invalid decorations
        if (!dec.decorationTechniqueId) {
          console.warn('Skipping decoration without decorationTechniqueId:', dec)
          return false
        }
        return true
      })
      .map((dec: any) => {
        // Ensure tierIndices is an array of valid positive integers
        let tierIndices: number[] = []
        if (dec.tierIndices !== undefined && dec.tierIndices !== null) {
          if (Array.isArray(dec.tierIndices)) {
            tierIndices = dec.tierIndices
              .map((ti: any) => {
                const num = typeof ti === 'number' ? ti : parseInt(ti)
                return isNaN(num) ? null : num
              })
              .filter((ti: number | null): ti is number => ti !== null && ti > 0)
          }
        }
        
        // Validate unitOverride if provided
        const validUnits = ['SINGLE', 'CAKE', 'TIER', 'SET']
        const unitOverride = dec.unitOverride && validUnits.includes(dec.unitOverride)
          ? dec.unitOverride
          : null
        
        // Ensure decorationTechniqueId is valid
        const decorationId = parseInt(dec.decorationTechniqueId.toString())
        if (isNaN(decorationId) || decorationId <= 0) {
          throw new Error(`Invalid decorationTechniqueId: ${dec.decorationTechniqueId}`)
        }
        
        return {
          decorationTechniqueId: decorationId,
          quantity: dec.quantity ? Math.max(1, parseInt(dec.quantity.toString())) : 1,
          unitOverride: unitOverride,
          tierIndices: tierIndices, // Always an array, even if empty
          notes: dec.notes || null
        }
      })

    // Prepare tiers data with validation
    const tiersToCreate = validTiers.map((tier: any) => {
      // Validate tier data
      if (!tier.tierSizeId || tier.tierSizeId <= 0) {
        throw new Error(`Invalid tierSizeId: ${tier.tierSizeId}`)
      }
      
      // Ensure all numeric fields are properly parsed
      const batterMultiplier = tier.batterMultiplier !== undefined && tier.batterMultiplier !== null
        ? (isNaN(parseFloat(tier.batterMultiplier.toString())) ? null : parseFloat(tier.batterMultiplier.toString()))
        : null
      const fillingMultiplier = tier.fillingMultiplier !== undefined && tier.fillingMultiplier !== null
        ? (isNaN(parseFloat(tier.fillingMultiplier.toString())) ? null : parseFloat(tier.fillingMultiplier.toString()))
        : null
      const frostingMultiplier = tier.frostingMultiplier !== undefined && tier.frostingMultiplier !== null
        ? (isNaN(parseFloat(tier.frostingMultiplier.toString())) ? null : parseFloat(tier.frostingMultiplier.toString()))
        : null
      
      return {
        tierIndex: tier.tierIndex || 1,
        tierSizeId: tier.tierSizeId,
        batterRecipeId: tier.batterRecipeId || null,
        batterMultiplier: batterMultiplier,
        fillingRecipeId: tier.fillingRecipeId || null,
        fillingMultiplier: fillingMultiplier,
        frostingRecipeId: tier.frostingRecipeId || null,
        frostingMultiplier: frostingMultiplier,
        flavor: tier.flavor || null,
        filling: tier.filling || null,
        finishType: tier.finishType || null
      }
    })

    // Final validation before Prisma create
    if (!quoteNumber || quoteNumber.trim() === '') {
      throw new Error('Quote number is required')
    }
    if (!trimmedCustomerName || trimmedCustomerName.trim() === '') {
      throw new Error('Customer name is required')
    }
    if (!body.eventDate) {
      throw new Error('Event date is required')
    }
    if (isNaN(markupPercentValue) || markupPercentValue < 0) {
      throw new Error(`Invalid markupPercent: ${markupPercentValue}`)
    }
    if (tiersToCreate.length === 0) {
      throw new Error('At least one tier is required')
    }
    
    // Validate all tiers have valid tierSizeId
    for (const tier of tiersToCreate) {
      if (!tier.tierSizeId || tier.tierSizeId <= 0) {
        throw new Error(`Invalid tierSizeId in tier: ${JSON.stringify(tier)}`)
      }
    }
    
    // Validate all decorations have valid decorationTechniqueId
    for (const dec of decorationsToCreate) {
      if (!dec.decorationTechniqueId || dec.decorationTechniqueId <= 0) {
        throw new Error(`Invalid decorationTechniqueId in decoration: ${JSON.stringify(dec)}`)
      }
    }

    // Prepare products (QuoteItems) data
    const productsToCreate = (body.products || [])
      .filter((product: any) => product.menuItemId && product.menuItemId > 0)
      .map((product: any) => ({
        itemType: 'MENU_ITEM' as const,
        menuItemId: parseInt(product.menuItemId.toString()),
        quantity: product.quantity ? Math.max(1, parseInt(product.quantity.toString())) : 1,
        packagingId: product.packagingId ? parseInt(product.packagingId.toString()) : null,
        packagingQty: product.packagingQty ? parseInt(product.packagingQty.toString()) : null,
        notes: product.notes || null
      }))

    // Log data being sent in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Quote data to create:', {
        quoteNumber,
        customerId: body.customerId || null,
        customerName: trimmedCustomerName,
        eventDate: body.eventDate,
        markupPercent: markupPercentValue,
        markupPercentType: typeof markupPercentValue,
        tierCount: tiersToCreate.length,
        decorationCount: decorationsToCreate.length,
        sampleTier: tiersToCreate[0],
        sampleDecoration: decorationsToCreate[0]
      })
    }

    // Create quote with tiers and decorations
    // Wrap in try-catch to get more specific error details
    let quote
    try {
      quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: body.customerId || null,
        customerName: trimmedCustomerName,
        eventDate: new Date(body.eventDate),
        eventType: body.eventType || null,
        theme: body.theme || null,
        occasion: body.occasion || null,
        colors: body.colors || null,
        accentColors: body.accentColors || null,
        cakeType: body.cakeType || null,
        desiredServings: body.desiredServings || null,
        isDelivery: body.isDelivery || false,
        deliveryZoneId: body.deliveryZoneId || null,
        deliveryDistance: body.deliveryDistance ? parseFloat(body.deliveryDistance.toString()) : null,
        deliveryContact: body.deliveryContact || null,
        deliveryPhone: body.deliveryPhone || null,
        deliveryTime: body.deliveryTime ? new Date(body.deliveryTime) : null,
        deliveryAddress: body.deliveryAddress || null,
        bakerHours: body.bakerHours ? parseFloat(body.bakerHours.toString()) : null,
        assistantHours: body.assistantHours ? parseFloat(body.assistantHours.toString()) : null,
        topperType: body.topperType || null,
        topperText: body.topperText || null,
        customTopperFee: body.customTopperFee ? parseFloat(body.customTopperFee.toString()) : null,
        markupPercent: markupPercentValue, // Prisma accepts number for Decimal
        depositPercent: body.depositPercent !== undefined && body.depositPercent !== null
          ? parseFloat(body.depositPercent.toString())
          : null,
        discountType: body.discountType || null,
        discountValue: body.discountValue ? parseFloat(body.discountValue.toString()) : null,
        discountReason: body.discountReason || null,
        status: body.status || 'DRAFT',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        notes: body.notes || null,
        termsAndConditions: body.termsAndConditions || null,
        budgetMin: body.budgetMin !== undefined && body.budgetMin !== null
          ? parseFloat(body.budgetMin.toString())
          : null,
        budgetMax: body.budgetMax !== undefined && body.budgetMax !== null
          ? parseFloat(body.budgetMax.toString())
          : null,
        quoteTiers: {
          create: tiersToCreate
        },
        quoteDecorations: {
          create: decorationsToCreate
        },
        quoteItems: {
          create: productsToCreate
        }
      },
      include: {
        Customer: true,
        DeliveryZone: true,
        QuoteTier: {
          include: {
            TierSize: true,
            Recipe_QuoteTier_batterRecipeIdToRecipe: true,
            Recipe_QuoteTier_fillingRecipeIdToRecipe: true,
            Recipe_QuoteTier_frostingRecipeIdToRecipe: true
          }
        },
        QuoteDecoration: {
          include: {
            DecorationTechnique: true
          }
        },
        QuoteItem: {
          include: {
            MenuItem: {
              include: {
                ProductType: true
              }
            },
            Packaging: true
          }
        }
      }
    })

    // Transform to expected format for frontend
    quote = {
      ...quote,
      customer: quote.Customer,
      deliveryZone: quote.DeliveryZone,
      quoteTiers: quote.QuoteTier.map((tier: any) => ({
        ...tier,
        tierSize: tier.TierSize,
        batterRecipe: tier.Recipe_QuoteTier_batterRecipeIdToRecipe,
        fillingRecipe: tier.Recipe_QuoteTier_fillingRecipeIdToRecipe,
        frostingRecipe: tier.Recipe_QuoteTier_frostingRecipeIdToRecipe
      })),
      quoteDecorations: quote.QuoteDecoration.map((dec: any) => ({
        ...dec,
        decorationTechnique: dec.DecorationTechnique
      })),
      quoteItems: quote.QuoteItem.map((item: any) => ({
        ...item,
        menuItem: item.MenuItem ? {
          ...item.MenuItem,
          productType: item.MenuItem.ProductType
        } : null,
        packaging: item.Packaging
      }))
    } as any
    } catch (createError) {
      // Log the specific Prisma create error with full details
      console.error('Prisma create error details:', {
        error: createError,
        errorType: typeof createError,
        errorString: String(createError),
        errorKeys: createError && typeof createError === 'object' ? Object.keys(createError) : [],
        ...(createError && typeof createError === 'object' && 'code' in createError ? {
          prismaCode: (createError as any).code,
          prismaMeta: (createError as any).meta,
          prismaMessage: (createError as any).message
        } : {})
      })
      // Re-throw to be caught by outer catch
      throw createError
    }

    return NextResponse.json({
      quote,
      costing
    })
  } catch (error) {
    console.error('Error creating quote:', error)
    
    // Try to extract meaningful error information
    let errorMessage = 'Unknown error occurred while creating quote'
    let errorCode: string | undefined
    let errorMeta: any = {}
    
    // Handle Prisma errors specifically
    if (error && typeof error === 'object') {
      const err = error as any
      
      // Prisma error codes
      if ('code' in err) {
        errorCode = err.code
        errorMeta = err.meta || {}
        
        switch (err.code) {
          case 'P2002':
            errorMessage = 'A quote with this number already exists'
            break
          case 'P2003':
            errorMessage = `Invalid reference: ${err.meta?.field_name || 'One or more related records do not exist'}`
            break
          case 'P2025':
            errorMessage = 'Record not found'
            break
          case 'P2009':
            errorMessage = `Invalid data format: ${err.meta?.target || 'unknown field'}`
            break
          case 'P2011':
            errorMessage = `Null constraint violation: ${err.meta?.target || 'required field is missing'}`
            break
          case 'P2012':
            errorMessage = `Missing required value: ${err.meta?.path || 'required field'}`
            break
          default:
            errorMessage = err.message || `Database error: ${err.code}`
        }
      } else if (error instanceof Error) {
        // Standard Error object
        errorMessage = error.message
        errorMeta = {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      } else {
        // Try to stringify the error
        try {
          errorMessage = JSON.stringify(error)
        } catch {
          errorMessage = String(error)
        }
      }
    }
    
    // Log full error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', {
        error,
        errorMessage,
        errorCode,
        errorMeta,
        errorString: String(error),
        errorType: typeof error
      })
    }
    
    // Return a properly formatted error response
    // Always ensure we return a valid JSON object
    const errorResponse: any = {
      error: 'Failed to create quote',
      details: errorMessage || 'An unknown error occurred'
    }
    
    if (errorCode) {
      errorResponse.code = errorCode
    }
    
    if (Object.keys(errorMeta).length > 0) {
      errorResponse.meta = errorMeta
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.debug = {
        meta: errorMeta,
        ...(error instanceof Error && {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500) // Limit stack trace length
        }),
        errorString: String(error),
        errorType: typeof error
      }
    }
    
    // Ensure we can serialize the response
    try {
      const jsonString = JSON.stringify(errorResponse)
      return NextResponse.json(
        errorResponse,
        { status: 500 }
      )
    } catch (serializeError) {
      // If we can't serialize, return a minimal error
      console.error('Failed to serialize error response:', serializeError)
      return NextResponse.json(
        {
          error: 'Failed to create quote',
          details: errorMessage || 'An error occurred and could not be serialized'
        },
        { status: 500 }
      )
    }
  }
}

