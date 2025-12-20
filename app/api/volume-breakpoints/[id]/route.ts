import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/volume-breakpoints/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const breakpoint = await prisma.volumeBreakpoint.findUnique({
      where: { id: parseInt(id) },
      include: {
        MenuItem: { select: { id: true, name: true } },
        ProductType: { select: { id: true, name: true } }
      }
    })

    if (!breakpoint) {
      return NextResponse.json(
        { error: 'Volume breakpoint not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(breakpoint)
  } catch (error) {
    console.error('Failed to fetch volume breakpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch volume breakpoint' },
      { status: 500 }
    )
  }
}

// PATCH /api/volume-breakpoints/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const {
      minQuantity,
      maxQuantity,
      discountPercent,
      pricePerUnit,
      isActive
    } = body

    const breakpoint = await prisma.volumeBreakpoint.update({
      where: { id: parseInt(id) },
      data: {
        ...(minQuantity !== undefined && { minQuantity }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(pricePerUnit !== undefined && { pricePerUnit }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        MenuItem: { select: { id: true, name: true } },
        ProductType: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(breakpoint)
  } catch (error) {
    console.error('Failed to update volume breakpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update volume breakpoint' },
      { status: 500 }
    )
  }
}

// DELETE /api/volume-breakpoints/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.volumeBreakpoint.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete volume breakpoint:', error)
    return NextResponse.json(
      { error: 'Failed to delete volume breakpoint' },
      { status: 500 }
    )
  }
}
