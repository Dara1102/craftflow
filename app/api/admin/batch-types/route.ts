import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { BatchTypeConfig } from '@prisma/client'

export async function GET() {
  try {
    const batchTypes = await prisma.batchTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    // Transform to the format expected by the frontend
    const formattedTypes = batchTypes.map((bt: BatchTypeConfig) => ({
      code: bt.code,
      name: bt.name,
      leadTimeDays: bt.leadTimeDays,
      dependsOn: bt.dependsOn ? JSON.parse(bt.dependsOn) : [],
      isBatchable: bt.isBatchable,
      color: bt.color
    }))

    return NextResponse.json({ batchTypes: formattedTypes })
  } catch (error) {
    console.error('Failed to fetch batch types:', error)
    return NextResponse.json({ error: 'Failed to fetch batch types' }, { status: 500 })
  }
}
