import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const laborRoles = [
  {
    name: 'Decorator',
    description: 'Skilled decoration work including fondant, piping, sugar flowers, hand-painting',
    hourlyRate: 30.00,
    sortOrder: 1,
  },
  {
    name: 'Baker',
    description: 'Batter prep, baking, basic assembly, frosting',
    hourlyRate: 21.00,
    sortOrder: 2,
  },
  {
    name: 'Bakery Assistant',
    description: 'Cupcake decorating, stacking, packaging, simple finishing',
    hourlyRate: 18.00,
    sortOrder: 3,
  },
]

async function main() {
  console.log('Seeding labor roles...')

  for (const role of laborRoles) {
    const existing = await prisma.laborRole.findUnique({
      where: { name: role.name }
    })

    if (existing) {
      console.log(`  Updating: ${role.name}`)
      await prisma.laborRole.update({
        where: { name: role.name },
        data: role
      })
    } else {
      console.log(`  Creating: ${role.name}`)
      await prisma.laborRole.create({
        data: role
      })
    }
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
