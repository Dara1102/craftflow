import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default batch types with their dependencies and lead times
const defaultBatchTypes = [
  {
    code: 'BAKE',
    name: 'Bake Cakes',
    description: 'Baking cake batter into layers',
    dependsOn: null,  // No dependencies - first step
    leadTimeDays: 3,  // 3 days before event
    sortOrder: 1,
    isBatchable: true,
    color: 'orange'
  },
  {
    code: 'PREP',
    name: 'Make Frosting',
    description: 'Preparing buttercream, fillings, and frostings',
    dependsOn: null,  // Can run parallel with BAKE
    leadTimeDays: 2,  // 2 days before event
    sortOrder: 2,
    isBatchable: true,
    color: 'amber'
  },
  {
    code: 'STACK',
    name: 'Stack & Fill',
    description: 'Compile layers, fill with frosting, crumb coat, and top coat',
    dependsOn: JSON.stringify(['BAKE', 'PREP']),  // Depends on both BAKE and PREP
    leadTimeDays: 2,  // 2 days before event (after BAKE cools)
    sortOrder: 3,
    isBatchable: true,
    color: 'indigo'
  },
  {
    code: 'ASSEMBLE',
    name: 'Assemble',
    description: 'Final assembly - attach tiers, structural support, finishing touches',
    dependsOn: JSON.stringify(['STACK']),
    leadTimeDays: 1,  // 1 day before event
    sortOrder: 4,
    isBatchable: true,
    color: 'purple'
  },
  {
    code: 'DECORATE',
    name: 'Decorate',
    description: 'Final decoration, piping, flowers, toppers',
    dependsOn: JSON.stringify(['ASSEMBLE']),
    leadTimeDays: 1,  // 1 day before event
    sortOrder: 5,
    isBatchable: false,  // Usually order-specific
    color: 'teal'
  }
]

async function main() {
  console.log('Seeding batch type configurations...')

  for (const batchType of defaultBatchTypes) {
    const existing = await prisma.batchTypeConfig.findUnique({
      where: { code: batchType.code }
    })

    if (existing) {
      console.log(`  Updating ${batchType.code}: ${batchType.name}`)
      await prisma.batchTypeConfig.update({
        where: { code: batchType.code },
        data: batchType
      })
    } else {
      console.log(`  Creating ${batchType.code}: ${batchType.name}`)
      await prisma.batchTypeConfig.create({
        data: batchType
      })
    }
  }

  console.log(`\nSeeded ${defaultBatchTypes.length} batch types.`)

  // Show summary
  const allTypes = await prisma.batchTypeConfig.findMany({
    orderBy: { sortOrder: 'asc' }
  })

  console.log('\nBatch Type Workflow:')
  for (const type of allTypes) {
    const deps = type.dependsOn ? JSON.parse(type.dependsOn).join(', ') : 'none'
    console.log(`  ${type.sortOrder}. ${type.code} (${type.name})`)
    console.log(`     Lead time: ${type.leadTimeDays} days, Depends on: ${deps}`)
  }
}

main()
  .catch((e) => {
    console.error('Error seeding batch types:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
