import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PRODUCTION_DEFAULTS, PRODUCTION_SETTING_KEYS } from '@/lib/production-settings'

// GET /api/settings - Get all settings as a key-value object
export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    // Convert to a key-value object for easy access
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value
    })

    // Return with defaults for costing-related settings and production settings
    return NextResponse.json({
      LaborRatePerHour: settingsMap.LaborRatePerHour || '20',
      MarkupPercent: settingsMap.MarkupPercent || '0.7',
      // Production settings with defaults
      [PRODUCTION_SETTING_KEYS.layersPerTier]: settingsMap[PRODUCTION_SETTING_KEYS.layersPerTier] || PRODUCTION_DEFAULTS.layersPerTier.toString(),
      [PRODUCTION_SETTING_KEYS.layerHeightInches]: settingsMap[PRODUCTION_SETTING_KEYS.layerHeightInches] || PRODUCTION_DEFAULTS.layerHeightInches.toString(),
      [PRODUCTION_SETTING_KEYS.standardTierHeightInches]: settingsMap[PRODUCTION_SETTING_KEYS.standardTierHeightInches] || PRODUCTION_DEFAULTS.standardTierHeightInches.toString(),
      [PRODUCTION_SETTING_KEYS.batterGramsPerCubicInch]: settingsMap[PRODUCTION_SETTING_KEYS.batterGramsPerCubicInch] || PRODUCTION_DEFAULTS.batterGramsPerCubicInch.toString(),
      [PRODUCTION_SETTING_KEYS.buttercreamInternalGramsPerLayer]: settingsMap[PRODUCTION_SETTING_KEYS.buttercreamInternalGramsPerLayer] || PRODUCTION_DEFAULTS.buttercreamInternalGramsPerLayer.toString(),
      [PRODUCTION_SETTING_KEYS.buttercreamCrumbCoatGramsPerSqInch]: settingsMap[PRODUCTION_SETTING_KEYS.buttercreamCrumbCoatGramsPerSqInch] || PRODUCTION_DEFAULTS.buttercreamCrumbCoatGramsPerSqInch.toString(),
      [PRODUCTION_SETTING_KEYS.defaultSurplusPercent]: settingsMap[PRODUCTION_SETTING_KEYS.defaultSurplusPercent] || PRODUCTION_DEFAULTS.defaultSurplusPercent.toString(),
      [PRODUCTION_SETTING_KEYS.defaultUnits]: settingsMap[PRODUCTION_SETTING_KEYS.defaultUnits] || PRODUCTION_DEFAULTS.defaultUnits,
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
