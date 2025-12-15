import Link from 'next/link'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import TierForm from '../tier-form'

export default async function EditTierSize({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tierSizeId = parseInt(id)

  const [tierSize, laborRoles] = await Promise.all([
    prisma.tierSize.findUnique({
      where: { id: tierSizeId }
    }),
    prisma.laborRole.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  ])

  if (!tierSize) {
    notFound()
  }

  const plainTierSize = {
    id: tierSize.id,
    name: tierSize.name,
    shape: tierSize.shape,
    diameterCm: Number(tierSize.diameterCm),
    lengthCm: tierSize.lengthCm ? Number(tierSize.lengthCm) : null,
    widthCm: tierSize.widthCm ? Number(tierSize.widthCm) : null,
    heightCm: Number(tierSize.heightCm),
    volumeMl: tierSize.volumeMl,
    servings: tierSize.servings,
    assemblyMinutes: tierSize.assemblyMinutes,
    assemblyRoleId: tierSize.assemblyRoleId
  }

  const plainLaborRoles = laborRoles.map(role => ({
    id: role.id,
    name: role.name,
    hourlyRate: Number(role.hourlyRate)
  }))

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/admin/tiers" className="hover:text-pink-600">Tier Sizes</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">{tierSize.name}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Tier Size</h1>
        <TierForm tierSize={plainTierSize} laborRoles={plainLaborRoles} />
      </div>
    </div>
  )
}
