import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/production/tiers/[id] - Update cakeboard fields for a tier
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tierId = parseInt(id)

    if (isNaN(tierId)) {
      return NextResponse.json({ error: 'Invalid tier ID' }, { status: 400 })
    }

    const body = await request.json()
    const { cakeboardTypeId, cakeboardShape, cakeboardSizeInches, cakeboardNotes } = body

    // Verify tier exists
    const tier = await prisma.cakeTier.findUnique({
      where: { id: tierId },
      include: {
        CakeOrder: {
          include: {
            ProductionPrepSignoff: true
          }
        }
      }
    })

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    // Check if order is locked
    if (tier.CakeOrder?.ProductionPrepSignoff?.lockedAt) {
      return NextResponse.json(
        { error: 'Order is locked and cannot be modified' },
        { status: 403 }
      )
    }

    // Update cakeboard fields
    const updated = await prisma.cakeTier.update({
      where: { id: tierId },
      data: {
        cakeboardTypeId: cakeboardTypeId ?? null,
        cakeboardShape: cakeboardShape ?? null,
        cakeboardSizeInches: cakeboardSizeInches ?? null,
        cakeboardNotes: cakeboardNotes ?? null
      },
      include: {
        CakeboardType: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      tier: {
        id: updated.id,
        cakeboardTypeId: updated.cakeboardTypeId,
        cakeboardTypeName: updated.CakeboardType?.name || null,
        cakeboardShape: updated.cakeboardShape,
        cakeboardSizeInches: updated.cakeboardSizeInches,
        cakeboardNotes: updated.cakeboardNotes
      }
    })
  } catch (error) {
    console.error('Failed to update tier cakeboard:', error)
    return NextResponse.json(
      { error: 'Failed to update tier cakeboard' },
      { status: 500 }
    )
  }
}
