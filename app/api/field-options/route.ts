import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/field-options - Get all field options grouped by category
export async function GET() {
  try {
    const options = await prisma.fieldOption.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // Group by category
    const grouped = options.reduce((acc, opt) => {
      if (!acc[opt.category]) {
        acc[opt.category] = []
      }
      acc[opt.category].push({
        id: opt.id,
        name: opt.name,
      })
      return acc
    }, {} as Record<string, { id: number; name: string }[]>)

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Failed to fetch field options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch field options' },
      { status: 500 }
    )
  }
}

// POST /api/field-options - Add a new field option
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, name } = body

    if (!category || !name) {
      return NextResponse.json(
        { error: 'Category and name are required' },
        { status: 400 }
      )
    }

    // Get the max sort order for this category
    const maxSort = await prisma.fieldOption.findFirst({
      where: { category },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const option = await prisma.fieldOption.create({
      data: {
        category,
        name,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        isActive: true,
      },
    })

    return NextResponse.json(option)
  } catch (error) {
    console.error('Failed to create field option:', error)
    return NextResponse.json(
      { error: 'Failed to create field option' },
      { status: 500 }
    )
  }
}
