import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; decorationId: string }> }
) {
  const { decorationId } = await params
  const body = await request.json()

  const { quantity, notes } = body

  try {
    const orderDecoration = await prisma.orderDecoration.update({
      where: { id: parseInt(decorationId) },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(notes !== undefined && { notes })
      },
      include: {
        decorationTechnique: true
      }
    })

    return NextResponse.json(orderDecoration)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update decoration' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; decorationId: string }> }
) {
  const { decorationId } = await params

  try {
    await prisma.orderDecoration.delete({
      where: { id: parseInt(decorationId) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove decoration' },
      { status: 500 }
    )
  }
}
