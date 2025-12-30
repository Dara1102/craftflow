import BatchTypesList from './batch-types-list'
import { prisma } from '@/lib/db'

export default async function BatchTypesAdmin() {
  const batchTypes = await prisma.batchTypeConfig.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { code: 'asc' }
    ],
  })

  // Parse dependsOn JSON for client component
  const plainBatchTypes = batchTypes.map(bt => ({
    ...bt,
    dependsOn: bt.dependsOn ? JSON.parse(bt.dependsOn) as string[] : [],
  }))

  // Get all codes for dependency dropdown
  const allCodes = batchTypes.map(bt => bt.code)

  return (
    <div className="max-w-full overflow-hidden py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Batch Types</h1>
        <p className="text-gray-600 mb-6">
          Configure the production workflow steps. Define dependencies between steps and lead times before event dates.
        </p>
        <BatchTypesList initialBatchTypes={plainBatchTypes} allCodes={allCodes} />
      </div>
    </div>
  )
}
