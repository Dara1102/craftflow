import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const roles = await prisma.laborRole.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })

  // Convert Decimal to number for JSON serialization
  const plainRoles = roles.map(role => ({
    ...role,
    hourlyRate: Number(role.hourlyRate),
  }))

  return NextResponse.json(plainRoles)
}
