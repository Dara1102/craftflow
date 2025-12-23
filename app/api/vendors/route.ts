import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/vendors - List all vendors or search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        AND: [
          includeInactive ? {} : { isActive: true },
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { contactName: { contains: search, mode: 'insensitive' } },
                  { contactEmail: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { IngredientVendor: true },
        },
      },
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Failed to fetch vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, website, contactName, contactPhone, contactEmail, notes, isActive } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.vendor.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 400 }
      )
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        website: website?.trim() || null,
        contactName: contactName?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('Failed to create vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
