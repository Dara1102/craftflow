import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/customers/[id] - Get a single customer with orders
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        CakeOrder: {
          orderBy: { eventDate: 'desc' },
          include: {
            CakeTier: {
              include: { TierSize: true },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update a customer
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { name, company, email, phone, address, birthday, notes } = body

  try {
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(company !== undefined && { company: company?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check if customer has orders
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { CakeOrder: true } } },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customer._count.CakeOrder > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing orders' },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
