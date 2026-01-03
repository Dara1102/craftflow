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

    // Transform to expected format for frontend and calculate costs
    const quotes = await Promise.all(quotesRaw.map(async quote => {
      let estimatedCost = null

      // Get price adjustment value (added to final price separately)
      const adjustment = quote.priceAdjustment ? Number(quote.priceAdjustment) : 0

      // Always calculate cost on the fly to ensure accuracy
      // (locked costing may be stale if products weren't included when it was locked)
      try {
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
            quantity: dec.quantity,
            unitOverride: dec.unitOverride as 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined,
            tierIndices: dec.tierIndices as number[] | undefined
          })),
          products: quote.QuoteItem.map(item => ({
            menuItemId: item.menuItemId!,
            quantity: item.quantity,
            packagingId: item.packagingId,
            packagingQty: item.packagingQty
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
        // Add price adjustment to get the true customer price
        estimatedCost = costing.finalPrice + adjustment
      } catch (costError) {
        console.error(`Failed to calculate cost for quote ${quote.id}:`, costError)
      }

      return {
        ...quote,
        estimatedCost,
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
      }
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
    
    // Helper function to generate next quote number
    const generateQuoteNumber = async (): Promise<string> => {
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

      if (lastQuote) {
        const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2])
        return `Q-${year}-${String(lastNum + 1).padStart(3, '0')}`
      } else {
        return `Q-${year}-001`
      }
    }

    let quoteNumber = await generateQuoteNumber()

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
    // Retry up to 3 times if quote number conflict occurs (P2002)
    let quote
    let retryCount = 0
    const maxRetries = 3
    let usedQuoteNumber = quoteNumber

    while (retryCount < maxRetries) {
      try {
        quote = await prisma.quote.create({
      data: {
        quoteNumber: usedQuoteNumber,
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
        depositType: body.depositType || null,
        depositAmount: body.depositAmount !== undefined && body.depositAmount !== null
          ? parseFloat(body.depositAmount.toString())
          : null,
        discountType: body.discountType || null,
        discountValue: body.discountValue ? parseFloat(body.discountValue.toString()) : null,
        discountReason: body.discountReason || null,
        priceAdjustment: body.priceAdjustment !== undefined && body.priceAdjustment !== null
          ? parseFloat(body.priceAdjustment.toString())
          : null,
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
        QuoteTier: {
          create: tiersToCreate
        },
        QuoteDecoration: {
          create: decorationsToCreate
        },
        QuoteItem: {
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
        // Successfully created - break out of retry loop
        break
      } catch (createError: any) {
        // Check if it's a quote number conflict (P2002 unique constraint)
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('quoteNumber')) {
          retryCount++
          if (retryCount < maxRetries) {
            // Generate a new quote number and retry
            usedQuoteNumber = await generateQuoteNumber()
            console.log(`Quote number conflict, retrying with: ${usedQuoteNumber}`)
            continue
          }
        }

        // Log the specific Prisma create error with full details
        console.error('Prisma create error details:', {
          error: createError,
          errorType: typeof createError,
          errorString: String(createError),
          errorKeys: createError && typeof createError === 'object' ? Object.keys(createError) : [],
          ...(createError && typeof createError === 'object' && 'code' in createError ? {
            prismaCode: createError.code,
            prismaMeta: createError.meta,
            prismaMessage: createError.message
          } : {})
        })
        // Re-throw to be caught by outer catch
        throw createError
      }
    }

    // Check if we successfully created the quote
    if (!quote) {
      throw new Error('Failed to create quote after retries')
    }

    // Build response with optional message about quote number change
    const response: any = { quote, costing }
    if (usedQuoteNumber !== quoteNumber) {
      response.message = `Quote number ${quoteNumber} was already taken. Your quote was assigned number ${usedQuoteNumber}.`
    }

    return NextResponse.json(response)
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



