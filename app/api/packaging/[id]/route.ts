import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packagingId = parseInt(id)

    const packaging = await prisma.packaging.findUnique({
      where: { id: packagingId }
    })

    if (!packaging) {
      return NextResponse.json(
        { error: 'Packaging not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(packaging)
  } catch (error) {
    console.error('Error fetching packaging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packagingId = parseInt(id)
    const data = await request.json()

    const packaging = await prisma.packaging.update({
      where: { id: packagingId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.sizeFit !== undefined && { sizeFit: data.sizeFit }),
        ...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.reorderUrl !== undefined && { reorderUrl: data.reorderUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
      }
    })

    return NextResponse.json(packaging)
  } catch (error) {
    console.error('Error updating packaging:', error)
    return NextResponse.json(
      { error: 'Failed to update packaging' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packagingId = parseInt(id)

    // Soft delete
    await prisma.packaging.update({
      where: { id: packagingId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting packaging:', error)
    return NextResponse.json(
      { error: 'Failed to delete packaging' },
      { status: 500 }
    )
  }
}
