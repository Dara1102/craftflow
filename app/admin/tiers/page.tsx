import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function TierSizesAdmin() {
  const tierSizes = await prisma.tierSize.findMany({
    include: {
      assemblyRole: true
    },
    orderBy: {
      diameterCm: 'asc'
    }
  })

  // Helper to convert cm to inches
  const cmToInches = (cm: number) => (cm / 2.54).toFixed(1)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Tier Sizes</h1>
          <Link
            href="/admin/tiers/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Tier Size
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shape
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimensions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assembly Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tierSizes.map((tier) => {
                const diameterCm = parseFloat(tier.diameterCm.toString())
                const heightCm = parseFloat(tier.heightCm.toString())
                const lengthCm = tier.lengthCm ? parseFloat(tier.lengthCm.toString()) : null
                const widthCm = tier.widthCm ? parseFloat(tier.widthCm.toString()) : null

                return (
                  <tr key={tier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {tier.shape || 'Round'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lengthCm && widthCm ? (
                        <div>
                          <div>{lengthCm.toFixed(1)} × {widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm</div>
                          <div className="text-xs text-gray-400">
                            {cmToInches(lengthCm)}" × {cmToInches(widthCm)}" × {cmToInches(heightCm)}"
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>{diameterCm.toFixed(1)} × {heightCm.toFixed(1)} cm</div>
                          <div className="text-xs text-gray-400">
                            {cmToInches(diameterCm)}" × {cmToInches(heightCm)}"
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tier.volumeMl ? (
                        <span>{tier.volumeMl.toLocaleString()} ml</span>
                      ) : (
                        <span className="text-gray-400">Not calculated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tier.servings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tier.assemblyMinutes ? (
                        <div>
                          <span>{tier.assemblyMinutes} min</span>
                          <span className="text-xs text-gray-400 block">
                            {tier.assemblyRole?.name || 'Baker'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/admin/tiers/${tier.id}`}
                        className="text-pink-600 hover:text-pink-900 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
