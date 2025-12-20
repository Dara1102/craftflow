import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cakeboardTypes = [
  {
    name: 'Drum',
    description: 'Standard cake drum - sturdy base for presentation',
    availableSizes: '8,10,12,14,16,18',
    availableShapes: 'round,square',
    sortOrder: 1
  },
  {
    name: 'Board',
    description: 'Thin cardboard cake board for between tiers',
    availableSizes: '6,8,10,12,14',
    availableShapes: 'round,square',
    sortOrder: 2
  },
  {
    name: 'Acrylic',
    description: 'Clear acrylic separator or display board',
    availableSizes: '6,8,10,12,14,16',
    availableShapes: 'round,square,rectangle',
    sortOrder: 3
  },
  {
    name: 'Masonite',
    description: 'Durable masonite board for heavy cakes',
    availableSizes: '10,12,14,16,18',
    availableShapes: 'round,square',
    sortOrder: 4
  },
  {
    name: 'Foam',
    description: 'Styrofoam dummy/separator',
    availableSizes: '4,6,8,10,12',
    availableShapes: 'round,square',
    sortOrder: 5
  },
  {
    name: 'Gold Drum',
    description: 'Gold-wrapped presentation drum',
    availableSizes: '10,12,14,16',
    availableShapes: 'round,square',
    sortOrder: 6
  },
  {
    name: 'Silver Drum',
    description: 'Silver-wrapped presentation drum',
    availableSizes: '10,12,14,16',
    availableShapes: 'round,square',
    sortOrder: 7
  }
]

async function main() {
  console.log('Seeding cakeboard types...')

  for (const type of cakeboardTypes) {
    const existing = await prisma.cakeboardType.findUnique({
      where: { name: type.name }
    })

    if (existing) {
      console.log(`  Skipping ${type.name} (already exists)`)
    } else {
      await prisma.cakeboardType.create({
        data: {
          ...type,
          isActive: true
        }
      })
      console.log(`  Created ${type.name}`)
    }
  }

  const count = await prisma.cakeboardType.count()
  console.log(`\nDone! ${count} cakeboard types in database.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
