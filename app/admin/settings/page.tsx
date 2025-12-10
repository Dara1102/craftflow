import SettingsForm from './settings-form'
import { prisma } from '@/lib/db'

export default async function SettingsAdmin() {
  const [settings, deliveryStartPoints] = await Promise.all([
    prisma.setting.findMany(),
    prisma.deliveryStartPoint.findMany({
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
    })
  ])

  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)

  // Convert Decimal fields to numbers for JSON serialization
  const plainStartPoints = deliveryStartPoints.map(sp => ({
    ...sp,
    latitude: sp.latitude ? Number(sp.latitude) : null,
    longitude: sp.longitude ? Number(sp.longitude) : null,
  }))

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
        <SettingsForm initialSettings={settingsMap} initialStartPoints={plainStartPoints} />
      </div>
    </div>
  )
}