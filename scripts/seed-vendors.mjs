import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const vendors = [
  {
    name: 'Costco',
    website: 'https://www.costco.com',
    notes: 'Bulk items, butter, eggs, flour. Membership required.',
    isActive: true,
  },
  {
    name: 'Restaurant Depot',
    website: 'https://www.restaurantdepot.com',
    notes: 'Commercial supplies, bulk ingredients. Membership required.',
    isActive: true,
  },
  {
    name: 'US Foods',
    website: 'https://www.usfoods.com',
    notes: 'Foodservice distributor. Delivery available.',
    isActive: true,
  },
  {
    name: 'Sysco',
    website: 'https://www.sysco.com',
    notes: 'Foodservice distributor. Delivery available.',
    isActive: true,
  },
  {
    name: 'Amazon',
    website: 'https://www.amazon.com',
    notes: 'Specialty items, decorations, equipment.',
    isActive: true,
  },
  {
    name: 'Walmart',
    website: 'https://www.walmart.com',
    notes: 'Emergency supplies, basic ingredients.',
    isActive: true,
  },
  {
    name: "BJ's Wholesale",
    website: 'https://www.bjs.com',
    notes: 'Bulk items alternative to Costco.',
    isActive: true,
  },
  {
    name: 'WebstaurantStore',
    website: 'https://www.webstaurantstore.com',
    notes: 'Online restaurant supply. Cake boxes, boards, supplies.',
    isActive: true,
  },
  {
    name: 'Global Sugar Art',
    website: 'https://www.globalsugarart.com',
    notes: 'Specialty cake decorating supplies, fondant, colors.',
    isActive: true,
  },
  {
    name: "Baker's Authority",
    website: 'https://www.bakersauthority.com',
    notes: 'Professional baking supplies and ingredients.',
    isActive: true,
  },
]

async function main() {
  console.log('Seeding vendors...')

  for (const vendor of vendors) {
    const existing = await prisma.vendor.findUnique({
      where: { name: vendor.name }
    })

    if (existing) {
      console.log(`  Updating: ${vendor.name}`)
      await prisma.vendor.update({
        where: { name: vendor.name },
        data: vendor
      })
    } else {
      console.log(`  Creating: ${vendor.name}`)
      await prisma.vendor.create({
        data: vendor
      })
    }
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
