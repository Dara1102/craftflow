import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings - Get all settings as a key-value object
export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    // Convert to a key-value object for easy access
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value
    })

    // Return with defaults for costing-related settings
    return NextResponse.json({
      LaborRatePerHour: settingsMap.LaborRatePerHour || '20',
      MarkupPercent: settingsMap.MarkupPercent || '0.7',
      ...settingsMap,
    })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
