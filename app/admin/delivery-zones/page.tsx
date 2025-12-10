import DeliveryZonesList from './delivery-zones-list'
import { prisma } from '@/lib/db'

export default async function DeliveryZonesAdmin() {
  const zones = await prisma.deliveryZone.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })

  // Convert Decimal to number for client component
  const plainZones = zones.map(zone => ({
    ...zone,
    minDistance: zone.minDistance ? Number(zone.minDistance) : null,
    maxDistance: zone.maxDistance ? Number(zone.maxDistance) : null,
    baseFee: Number(zone.baseFee),
    perMileFee: zone.perMileFee ? Number(zone.perMileFee) : null,
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Delivery Zones</h1>
        <p className="text-gray-600 mb-6">
          Set up delivery zones with distance ranges and fees. These can be applied to orders to calculate delivery costs.
        </p>
        <DeliveryZonesList initialZones={plainZones} />
      </div>
    </div>
  )
}
