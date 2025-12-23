import { prisma } from '@/lib/db'
import Link from 'next/link'
import { InfoPopup } from '@/components/InfoPopup'
import { DuplicateButton } from '@/components/DuplicateButton'
import { duplicateDecoration } from '@/app/actions/decorations'

const skillLevelColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
}

const gradeColors: Record<string, string> = {
  STANDARD: 'bg-gray-100 text-gray-800',
  PREMIUM: 'bg-blue-100 text-blue-800',
  LUXURY: 'bg-purple-100 text-purple-800',
}

export default async function DecorationsAdmin() {
  const decorations = await prisma.decorationTechnique.findMany({
    orderBy: [
      { category: 'asc' },
      { subcategory: 'asc' },
      { name: 'asc' },
    ],
    include: {
      LaborRole: true,
    },
  })

  // Group by category
  const groupedByCategory = decorations.reduce((acc, dec) => {
    if (!acc[dec.category]) {
      acc[dec.category] = []
    }
    acc[dec.category].push(dec)
    return acc
  }, {} as Record<string, typeof decorations>)

  const categories = Object.keys(groupedByCategory).sort()

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Decoration Techniques</h1>
          <p className="mt-1 text-sm text-gray-500">
            {decorations.length} techniques across {categories.length} categories
          </p>
        </div>
        <Link
          href="/admin/decorations/new"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
        >
          Add Technique
        </Link>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm mr-3">
              {groupedByCategory[category].length}
            </span>
            {category}
          </h2>

          <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '900px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technique
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subcategory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center">
                      Skill
                      <InfoPopup
                        title="Skill Level"
                        description="Decorator experience required: LOW = entry-level decorators, MEDIUM = experienced decorators, HIGH = master decorators with specialized training."
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center">
                      Grade
                      <InfoPopup
                        title="Material Grade"
                        description="Quality tier of materials used: STANDARD = everyday quality, PREMIUM = higher-end materials, LUXURY = top-tier specialty materials (e.g., real gold leaf)."
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center">
                      Cost
                      <InfoPopup
                        title="Material Cost"
                        description="Material cost ONLY (consumables like fondant, chocolate, edible paint). Does NOT include labor. The base cake size shown indicates what size these costs are calculated for. Scale up for larger cakes (e.g., 8&quot; ≈ 1.5x, 10&quot; ≈ 2x)."
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center">
                      Labor
                      <InfoPopup
                        title="Labor Time & Role"
                        description="Time in minutes to complete this technique and who performs it. Labor cost = (minutes ÷ 60) × role hourly rate. Role determines the pay rate used."
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center">
                      Unit
                      <InfoPopup
                        title="Pricing Unit"
                        description="How this technique is priced: CAKE = applied once per whole cake (e.g., drip finish), TIER = charged per tier for multi-tier cakes (e.g., tier divider florals), SET = per set of items regardless of cake size (e.g., a bouquet of sugar flowers)."
                      />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedByCategory[category].map((dec) => (
                  <tr key={dec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500">
                      {dec.sku}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{dec.name}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={dec.description}>
                        {dec.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {dec.subcategory}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${skillLevelColors[dec.skillLevel]}`}>
                        {dec.skillLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColors[dec.materialGrade]}`}>
                        {dec.materialGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${parseFloat(dec.defaultCostPerUnit.toString()).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">for {dec.baseCakeSize}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{dec.laborMinutes} min</div>
                      <div className="text-xs text-gray-400">
                        {dec.LaborRole ? (
                          <span className="text-blue-600">{dec.LaborRole.name}</span>
                        ) : (
                          <span className="text-gray-400">Decorator</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {dec.unit.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        <Link
                          href={`/admin/decorations/${dec.id}`}
                          className="text-pink-600 hover:text-pink-900"
                        >
                          Edit
                        </Link>
                        <DuplicateButton
                          action={duplicateDecoration.bind(null, dec.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Duplicate
                        </DuplicateButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">By Skill Level</h3>
          <div className="mt-2 space-y-1">
            {['LOW', 'MEDIUM', 'HIGH'].map((level) => {
              const count = decorations.filter((d) => d.skillLevel === level).length
              return (
                <div key={level} className="flex justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded-full ${skillLevelColors[level]}`}>{level}</span>
                  <span className="text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">By Material Grade</h3>
          <div className="mt-2 space-y-1">
            {['STANDARD', 'PREMIUM', 'LUXURY'].map((grade) => {
              const count = decorations.filter((d) => d.materialGrade === grade).length
              return (
                <div key={grade} className="flex justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded-full ${gradeColors[grade]}`}>{grade}</span>
                  <span className="text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Cost Range</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Min</span>
              <span className="text-gray-900">
                ${Math.min(...decorations.map((d) => parseFloat(d.defaultCostPerUnit.toString()))).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max</span>
              <span className="text-gray-900">
                ${Math.max(...decorations.map((d) => parseFloat(d.defaultCostPerUnit.toString()))).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg</span>
              <span className="text-gray-900">
                ${(decorations.reduce((sum, d) => sum + parseFloat(d.defaultCostPerUnit.toString()), 0) / decorations.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
