import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/vendors/[id] - Get a single vendor with ingredient links
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(id) },
      include: {
        IngredientVendor: {
          include: {
            Ingredient: true,
          },
          orderBy: {
            Ingredient: { name: 'asc' },
          },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Convert Decimal fields to numbers
    const plainVendor = {
      ...vendor,
      ingredientVendors: vendor.IngredientVendor.map(iv => ({
        ...iv,
        packSize: Number(iv.packSize),
        pricePerPack: Number(iv.pricePerPack),
        costPerIngredientUnit: iv.costPerIngredientUnit ? Number(iv.costPerIngredientUnit) : null,
        ingredient: {
          ...iv.Ingredient,
          costPerUnit: Number(iv.Ingredient.costPerUnit),
        },
      })),
    }

    return NextResponse.json(plainVendor)
  } catch (error) {
    console.error('Failed to fetch vendor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

// PATCH /api/vendors/[id] - Update a vendor
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { name, website, contactName, contactPhone, contactEmail, notes, isActive } = body

  try {
    // Check if vendor exists
    const existing = await prisma.vendor.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.vendor.findUnique({
        where: { name: name.trim() },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A vendor with this name already exists' },
          { status: 400 }
        )
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('Failed to update vendor:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

// DELETE /api/vendors/[id] - Delete a vendor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check if vendor has ingredient links
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { IngredientVendor: true } } },
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    if (vendor._count.IngredientVendor > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with linked ingredients. Remove ingredient links first or deactivate the vendor.' },
        { status: 400 }
      )
    }

    await prisma.vendor.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete vendor:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    )
  }
}
