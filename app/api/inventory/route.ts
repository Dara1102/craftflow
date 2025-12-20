import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/inventory - List all inventory items with current stock levels
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productType = searchParams.get('productType')
  const flavor = searchParams.get('flavor')
  const lowStock = searchParams.get('lowStock') === 'true'
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const where: Record<string, unknown> = {}

    if (!includeInactive) {
      where.isActive = true
    }

    if (productType) {
      where.productType = productType
    }

    if (flavor) {
      where.flavor = { contains: flavor, mode: 'insensitive' }
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        TierSize: { select: { id: true, name: true, shape: true } },
        Recipe: { select: { id: true, name: true, type: true } },
        InventoryLot: {
          where: { quantity: { gt: 0 } },
          orderBy: { producedAt: 'asc' }, // FIFO order
          select: {
            id: true,
            quantity: true,
            producedAt: true,
            expiresAt: true,
            lotNumber: true
          }
        },
        _count: {
          select: {
            StockProductionTask: true,
            InventoryReservation: true
          }
        }
      },
      orderBy: [
        { productType: 'asc' },
        { name: 'asc' }
      ]
    })

    // Calculate actual current stock from lots and check low stock
    const itemsWithStock = items.map(item => {
      const lotStock = item.InventoryLot.reduce((sum, lot) => sum + lot.quantity, 0)
      const isLowStock = lotStock <= item.minStock
      const oldestLot = item.InventoryLot[0] // First lot is oldest (FIFO)

      return {
        ...item,
        calculatedStock: lotStock,
        isLowStock,
        oldestLotDate: oldestLot?.producedAt || null,
        oldestLotExpires: oldestLot?.expiresAt || null
      }
    })

    // Filter by low stock if requested
    const result = lowStock
      ? itemsWithStock.filter(item => item.isLowStock)
      : itemsWithStock

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Create a new inventory item
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      sku,
      name,
      productType,
      tierSizeId,
      recipeId,
      flavor,
      description,
      unit,
      minStock,
      maxStock,
      shelfLifeDays,
      storageLocation
    } = body

    if (!sku || !name || !productType) {
      return NextResponse.json(
        { error: 'sku, name, and productType are required' },
        { status: 400 }
      )
    }

    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name,
        productType,
        tierSizeId: tierSizeId || null,
        recipeId: recipeId || null,
        flavor: flavor || null,
        description: description || null,
        unit: unit || 'each',
        currentStock: 0,
        minStock: minStock || 0,
        maxStock: maxStock || null,
        shelfLifeDays: shelfLifeDays || null,
        storageLocation: storageLocation || null
      },
      include: {
        TierSize: { select: { id: true, name: true } },
        Recipe: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
