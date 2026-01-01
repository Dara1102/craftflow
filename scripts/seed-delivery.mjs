import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding delivery zones and start points...')
  const now = new Date()

  // Delivery Start Points (bakery locations)
  const startPoints = [
    { name: 'Main Bakery', address: '123 Main Street, Austin, TX 78701', isDefault: true, sortOrder: 1 },
    { name: 'Downtown Kitchen', address: '456 Congress Ave, Austin, TX 78701', isDefault: false, sortOrder: 2 },
  ]

  for (const sp of startPoints) {
    await prisma.deliveryStartPoint.upsert({
      where: { id: -1 }, // Force create via unique constraint workaround
      update: {},
      create: { ...sp, updatedAt: now }
    }).catch(async () => {
      // If upsert fails, try to find existing or create
      const existing = await prisma.deliveryStartPoint.findFirst({ where: { name: sp.name } })
      if (!existing) {
        await prisma.deliveryStartPoint.create({ data: { ...sp, updatedAt: now } })
      }
    })
  }
  console.log('✓ Delivery start points created')

  // Delivery Zones
  const zones = [
    { name: 'Local (0-5 miles)', description: 'Within 5 miles of bakery', minDistance: 0, maxDistance: 5, baseFee: 10.00, perMileFee: null, sortOrder: 1 },
    { name: 'Near (5-15 miles)', description: '5 to 15 miles from bakery', minDistance: 5, maxDistance: 15, baseFee: 20.00, perMileFee: 1.50, sortOrder: 2 },
    { name: 'Far (15-30 miles)', description: '15 to 30 miles from bakery', minDistance: 15, maxDistance: 30, baseFee: 35.00, perMileFee: 2.00, sortOrder: 3 },
    { name: 'Extended (30+ miles)', description: 'Over 30 miles - custom quote', minDistance: 30, maxDistance: 100, baseFee: 75.00, perMileFee: 2.50, sortOrder: 4 },
    { name: 'Free Pickup', description: 'Customer picks up at bakery', minDistance: null, maxDistance: null, baseFee: 0, perMileFee: null, sortOrder: 0 },
  ]

  for (const zone of zones) {
    await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: { ...zone, updatedAt: now },
      create: { ...zone, updatedAt: now }
    })
  }
  console.log('✓ Delivery zones created')

  console.log('\n🎉 Delivery data seeded successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
