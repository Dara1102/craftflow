import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/inventory/[id] - Get inventory item with lots
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id)

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        TierSize: { select: { id: true, name: true, shape: true, servings: true } },
        Recipe: { select: { id: true, name: true, type: true } },
        InventoryItemRecipe: {
          include: {
            Recipe: { select: { id: true, name: true, type: true } }
          }
        },
        InventoryLot: {
          orderBy: { producedAt: 'asc' }, // FIFO order
          include: {
            StockProductionTask: {
              select: { id: true, taskName: true, completedAt: true }
            }
          }
        },
        StockProductionTask: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { scheduledDate: 'asc' },
          take: 5
        },
        InventoryReservation: {
          where: { status: 'RESERVED' },
          include: {
            CakeOrder: {
              select: { id: true, customerName: true, eventDate: true }
            }
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Calculate stats
    const totalStock = item.InventoryLot.reduce((sum, lot) => sum + lot.quantity, 0)
    const reservedStock = item.InventoryReservation.reduce((sum, res) => sum + res.quantity, 0)
    const availableStock = totalStock - reservedStock
    const pendingProduction = item.StockProductionTask.reduce((sum, task) =>
      sum + (task.targetQuantity - task.completedQuantity), 0)

    return NextResponse.json({
      ...item,
      stats: {
        totalStock,
        reservedStock,
        availableStock,
        pendingProduction,
        isLowStock: availableStock <= item.minStock
      }
    })
  } catch (error) {
    console.error('Failed to fetch inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

// PATCH /api/inventory/[id] - Update inventory item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id)

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    // Allow updating these fields
    const allowedFields = [
      'name', 'description', 'unit', 'minStock', 'maxStock',
      'shelfLifeDays', 'storageLocation', 'isActive', 'tierSizeId',
      'recipeId', 'flavor'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        TierSize: { select: { id: true, name: true } },
        Recipe: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/[id] - Deactivate inventory item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id)

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }

  try {
    // Soft delete - just deactivate
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/[id] - Update item with recipe links
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id)

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { recipeLinks, ...itemData } = body

    // Update item fields if provided
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'sku', 'description', 'unit', 'minStock', 'maxStock',
      'shelfLifeDays', 'storageLocation', 'isActive', 'tierSizeId',
      'recipeId', 'flavor', 'productType'
    ]

    for (const field of allowedFields) {
      if (itemData[field] !== undefined) {
        updateData[field] = itemData[field]
      }
    }

    // Update item
    if (Object.keys(updateData).length > 0) {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: updateData
      })
    }

    // Update recipe links if provided
    if (recipeLinks !== undefined) {
      // Delete existing links
      await prisma.inventoryItemRecipe.deleteMany({
        where: { inventoryItemId: itemId }
      })

      // Create new links
      if (recipeLinks && recipeLinks.length > 0) {
        await prisma.inventoryItemRecipe.createMany({
          data: recipeLinks.map((link: { recipeId: number; recipeType: string; quantityPerUnit: number; notes?: string }) => ({
            inventoryItemId: itemId,
            recipeId: link.recipeId,
            recipeType: link.recipeType,
            quantityPerUnit: link.quantityPerUnit,
            notes: link.notes || null
          }))
        })
      }
    }

    // Fetch and return updated item
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        TierSize: { select: { id: true, name: true } },
        Recipe: { select: { id: true, name: true } },
        InventoryItemRecipe: {
          include: {
            Recipe: { select: { id: true, name: true, type: true } }
          }
        }
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/[id] - Add stock (create a lot)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const itemId = parseInt(id)

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { quantity, lotNumber, notes, producedByTaskId } = body

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive number' },
        { status: 400 }
      )
    }

    // Get item for shelf life calculation
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: { shelfLifeDays: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Calculate expiration date
    const producedAt = new Date()
    const expiresAt = item.shelfLifeDays
      ? new Date(producedAt.getTime() + item.shelfLifeDays * 24 * 60 * 60 * 1000)
      : null

    // Create lot and update current stock
    const [lot] = await prisma.$transaction([
      prisma.inventoryLot.create({
        data: {
          inventoryItemId: itemId,
          quantity,
          originalQty: quantity,
          producedAt,
          expiresAt,
          lotNumber: lotNumber || null,
          notes: notes || null,
          producedByTaskId: producedByTaskId || null
        }
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: { increment: quantity } }
      })
    ])

    return NextResponse.json(lot, { status: 201 })
  } catch (error) {
    console.error('Failed to add stock:', error)
    return NextResponse.json(
      { error: 'Failed to add stock' },
      { status: 500 }
    )
  }
}
