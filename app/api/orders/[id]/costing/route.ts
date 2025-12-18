import { NextRequest, NextResponse } from 'next/server'
import { calculateOrderCosting } from '@/lib/costing'

/**
 * GET /api/orders/[id]/costing
 * Get full costing breakdown for an order using the central costing library
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = parseInt(id)

    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    // Calculate costing using the central library
    const costing = await calculateOrderCosting(orderId, false)

    return NextResponse.json(costing)
  } catch (error) {
    console.error('Error calculating order costing:', error)
    return NextResponse.json(
      { error: 'Failed to calculate order costing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
