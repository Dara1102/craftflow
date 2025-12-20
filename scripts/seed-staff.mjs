import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const staffMembers = [
  {
    name: 'Sarah Baker',
    email: 'sarah@craftflow.com',
    phone: '(555) 123-4567',
    isManager: true,
    roles: ['Baker', 'Decorator']
  },
  {
    name: 'Mike Johnson',
    email: 'mike@craftflow.com',
    phone: '(555) 234-5678',
    isManager: false,
    roles: ['Baker']
  },
  {
    name: 'Emily Chen',
    email: 'emily@craftflow.com',
    phone: '(555) 345-6789',
    isManager: false,
    roles: ['Decorator']
  },
  {
    name: 'David Wilson',
    email: 'david@craftflow.com',
    phone: null,
    isManager: false,
    roles: ['Bakery Assistant']
  },
  {
    name: 'Lisa Martinez',
    email: 'lisa@craftflow.com',
    phone: '(555) 456-7890',
    isManager: true,
    roles: ['Decorator', 'Baker']
  }
]

async function main() {
  console.log('Seeding staff members...')

  // Get labor roles
  const laborRoles = await prisma.laborRole.findMany()
  const roleMap = new Map(laborRoles.map(r => [r.name, r.id]))

  for (const staffData of staffMembers) {
    const existing = await prisma.staff.findUnique({
      where: { name: staffData.name }
    })

    if (existing) {
      console.log(`  Skipping ${staffData.name} (already exists)`)
      continue
    }

    // Get role IDs
    const roleIds = staffData.roles
      .map(roleName => roleMap.get(roleName))
      .filter((id): id is number => id !== undefined)

    const staff = await prisma.staff.create({
      data: {
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone,
        isManager: staffData.isManager,
        isActive: true,
        StaffRole: roleIds.length > 0 ? {
          create: roleIds.map((roleId, index) => ({
            laborRoleId: roleId,
            isPrimary: index === 0
          }))
        } : undefined
      }
    })

    console.log(`  Created ${staff.name}${staffData.isManager ? ' (Manager)' : ''}`)
  }

  const count = await prisma.staff.count()
  console.log(`\nDone! ${count} staff members in database.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
