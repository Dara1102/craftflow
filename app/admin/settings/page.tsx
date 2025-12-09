import SettingsForm from './settings-form'
import { prisma } from '@/lib/db'

export default async function SettingsAdmin() {
  const settings = await prisma.setting.findMany()
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
        <SettingsForm initialSettings={settingsMap} />
      </div>
    </div>
  )
}