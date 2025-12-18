import { NextRequest, NextResponse } from 'next/server'
import { calculateOrderCosting } from '@/lib/costing'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

/**
 * GET /api/orders/[id]/production
 * 
 * Returns full order costing with complete recipe data including:
 * - Step-by-step instructions
 * - Prep/bake/cool time breakdowns
 * - Scaled ingredients for each tier
 * - Scaled labor times
 * 
 * This endpoint is designed for production use - bakers need the full recipe details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = parseInt(id)

    // Verify order exists
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        cakeTiers: {
          include: {
            tierSize: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Calculate costing with full recipe data
    const costing = await calculateOrderCosting(orderId, true) // includeFullRecipes = true

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: order.customer?.name || order.customerName,
        eventDate: order.eventDate,
        status: order.status,
        notes: order.notes
      },
      costing,
      // Production-specific data
      production: {
        recipes: costing.productionRecipes || [],
        totalServings: costing.totalServings,
        ingredients: costing.ingredients,
        laborBreakdown: costing.laborBreakdown
      }
    })
  } catch (error) {
    console.error('Production data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production data' },
      { status: 500 }
    )
  }
}

