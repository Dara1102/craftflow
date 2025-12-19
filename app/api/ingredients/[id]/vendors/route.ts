import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/ingredients/[id]/vendors - List all vendor links for an ingredient
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: {
        ingredientVendors: {
          include: {
            vendor: true,
          },
          orderBy: [
            { isPreferred: 'desc' },
            { vendor: { name: 'asc' } },
          ],
        },
      },
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    // Convert Decimal fields to numbers
    const vendors = ingredient.ingredientVendors.map(iv => ({
      id: iv.id,
      vendorId: iv.vendorId,
      vendorName: iv.vendor.name,
      vendorSku: iv.vendorSku,
      vendorProductName: iv.vendorProductName,
      packSize: Number(iv.packSize),
      packUnit: iv.packUnit,
      pricePerPack: Number(iv.pricePerPack),
      costPerIngredientUnit: iv.costPerIngredientUnit ? Number(iv.costPerIngredientUnit) : null,
      reorderUrl: iv.reorderUrl,
      isPreferred: iv.isPreferred,
      lastPurchaseDate: iv.lastPurchaseDate,
      notes: iv.notes,
    }))

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Failed to fetch ingredient vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredient vendors' },
      { status: 500 }
    )
  }
}

// POST /api/ingredients/[id]/vendors - Add a vendor link to an ingredient
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ingredientId = parseInt(id)

  try {
    const body = await request.json()
    const {
      vendorId,
      vendorSku,
      vendorProductName,
      packSize,
      packUnit,
      pricePerPack,
      reorderUrl,
      isPreferred,
      notes,
    } = body

    if (!vendorId || !packSize || !packUnit || pricePerPack === undefined) {
      return NextResponse.json(
        { error: 'Vendor ID, pack size, pack unit, and price per pack are required' },
        { status: 400 }
      )
    }

    // Check if ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Check if link already exists
    const existing = await prisma.ingredientVendor.findUnique({
      where: {
        ingredientId_vendorId: {
          ingredientId,
          vendorId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This ingredient-vendor link already exists' },
        { status: 400 }
      )
    }

    // Calculate cost per ingredient unit
    // This requires unit conversion logic - for now, assume same units
    const costPerIngredientUnit = Number(pricePerPack) / Number(packSize)

    // If setting as preferred, unset other preferred vendors for this ingredient
    if (isPreferred) {
      await prisma.ingredientVendor.updateMany({
        where: { ingredientId },
        data: { isPreferred: false },
      })
    }

    const ingredientVendor = await prisma.ingredientVendor.create({
      data: {
        ingredientId,
        vendorId,
        vendorSku: vendorSku?.trim() || null,
        vendorProductName: vendorProductName?.trim() || null,
        packSize,
        packUnit: packUnit.trim(),
        pricePerPack,
        costPerIngredientUnit,
        reorderUrl: reorderUrl?.trim() || null,
        isPreferred: isPreferred || false,
        notes: notes?.trim() || null,
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json({
      id: ingredientVendor.id,
      vendorId: ingredientVendor.vendorId,
      vendorName: ingredientVendor.vendor.name,
      vendorSku: ingredientVendor.vendorSku,
      vendorProductName: ingredientVendor.vendorProductName,
      packSize: Number(ingredientVendor.packSize),
      packUnit: ingredientVendor.packUnit,
      pricePerPack: Number(ingredientVendor.pricePerPack),
      costPerIngredientUnit: ingredientVendor.costPerIngredientUnit ? Number(ingredientVendor.costPerIngredientUnit) : null,
      reorderUrl: ingredientVendor.reorderUrl,
      isPreferred: ingredientVendor.isPreferred,
      notes: ingredientVendor.notes,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create ingredient vendor link:', error)
    return NextResponse.json(
      { error: 'Failed to create ingredient vendor link' },
      { status: 500 }
    )
  }
}

// DELETE /api/ingredients/[id]/vendors?vendorId=X - Remove a vendor link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const vendorId = searchParams.get('vendorId')

  if (!vendorId) {
    return NextResponse.json(
      { error: 'Vendor ID is required' },
      { status: 400 }
    )
  }

  try {
    const ingredientVendor = await prisma.ingredientVendor.findUnique({
      where: {
        ingredientId_vendorId: {
          ingredientId: parseInt(id),
          vendorId: parseInt(vendorId),
        },
      },
    })

    if (!ingredientVendor) {
      return NextResponse.json(
        { error: 'Ingredient vendor link not found' },
        { status: 404 }
      )
    }

    await prisma.ingredientVendor.delete({
      where: {
        ingredientId_vendorId: {
          ingredientId: parseInt(id),
          vendorId: parseInt(vendorId),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete ingredient vendor link:', error)
    return NextResponse.json(
      { error: 'Failed to delete ingredient vendor link' },
      { status: 500 }
    )
  }
}

// PATCH /api/ingredients/[id]/vendors - Update a vendor link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ingredientId = parseInt(id)
  const body = await request.json()

  const {
    vendorId,
    vendorSku,
    vendorProductName,
    packSize,
    packUnit,
    pricePerPack,
    reorderUrl,
    isPreferred,
    lastPurchaseDate,
    notes,
  } = body

  if (!vendorId) {
    return NextResponse.json(
      { error: 'Vendor ID is required' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.ingredientVendor.findUnique({
      where: {
        ingredientId_vendorId: {
          ingredientId,
          vendorId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Ingredient vendor link not found' },
        { status: 404 }
      )
    }

    // Calculate cost per ingredient unit if pack size or price changed
    let costPerIngredientUnit = existing.costPerIngredientUnit
    if (packSize !== undefined || pricePerPack !== undefined) {
      const newPackSize = packSize ?? existing.packSize
      const newPrice = pricePerPack ?? existing.pricePerPack
      costPerIngredientUnit = Number(newPrice) / Number(newPackSize)
    }

    // If setting as preferred, unset other preferred vendors for this ingredient
    if (isPreferred === true) {
      await prisma.ingredientVendor.updateMany({
        where: {
          ingredientId,
          NOT: { vendorId },
        },
        data: { isPreferred: false },
      })
    }

    const updated = await prisma.ingredientVendor.update({
      where: {
        ingredientId_vendorId: {
          ingredientId,
          vendorId,
        },
      },
      data: {
        ...(vendorSku !== undefined && { vendorSku: vendorSku?.trim() || null }),
        ...(vendorProductName !== undefined && { vendorProductName: vendorProductName?.trim() || null }),
        ...(packSize !== undefined && { packSize }),
        ...(packUnit !== undefined && { packUnit: packUnit.trim() }),
        ...(pricePerPack !== undefined && { pricePerPack }),
        ...(costPerIngredientUnit !== undefined && { costPerIngredientUnit }),
        ...(reorderUrl !== undefined && { reorderUrl: reorderUrl?.trim() || null }),
        ...(isPreferred !== undefined && { isPreferred }),
        ...(lastPurchaseDate !== undefined && { lastPurchaseDate: lastPurchaseDate ? new Date(lastPurchaseDate) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json({
      id: updated.id,
      vendorId: updated.vendorId,
      vendorName: updated.vendor.name,
      vendorSku: updated.vendorSku,
      vendorProductName: updated.vendorProductName,
      packSize: Number(updated.packSize),
      packUnit: updated.packUnit,
      pricePerPack: Number(updated.pricePerPack),
      costPerIngredientUnit: updated.costPerIngredientUnit ? Number(updated.costPerIngredientUnit) : null,
      reorderUrl: updated.reorderUrl,
      isPreferred: updated.isPreferred,
      lastPurchaseDate: updated.lastPurchaseDate,
      notes: updated.notes,
    })
  } catch (error) {
    console.error('Failed to update ingredient vendor link:', error)
    return NextResponse.json(
      { error: 'Failed to update ingredient vendor link' },
      { status: 500 }
    )
  }
}
