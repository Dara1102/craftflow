import CakeboardTypesList from './cakeboard-types-list'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function CakeboardsAdmin() {
  const [cakeboardTypes, vendors] = await Promise.all([
    prisma.cakeboardType.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        Vendor: {
          select: { id: true, name: true }
        },
        _count: {
          select: { CakeTier: true }
        }
      }
    }),
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ])

  // Convert Decimal to number for client component
  const plainTypes = cakeboardTypes.map(type => ({
    id: type.id,
    name: type.name,
    description: type.description,
    vendorId: type.vendorId,
    vendorName: type.Vendor?.name || null,
    availableSizes: type.availableSizes,
    availableShapes: type.availableShapes,
    costPerUnit: type.costPerUnit ? Number(type.costPerUnit) : null,
    notes: type.notes,
    sortOrder: type.sortOrder,
    isActive: type.isActive,
    tierCount: type._count.CakeTier,
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <span className="text-gray-900">Cakeboards</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Cakeboard Types</h1>
        <p className="text-gray-600 mb-6">
          Define cakeboard types (acrylic, drum, masonite, etc.) with available sizes and shapes.
          Link to vendors for shopping list integration.
        </p>
        <CakeboardTypesList initialTypes={plainTypes} vendors={vendors} />
      </div>
    </div>
  )
}
