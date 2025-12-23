import LaborRolesList from './labor-roles-list'
import { prisma } from '@/lib/db'

export default async function LaborRolesAdmin() {
  const roles = await prisma.laborRole.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ],
    include: {
      _count: {
        select: { DecorationTechnique: true }
      }
    }
  })

  // Convert Decimal to number for client component
  const plainRoles = roles.map(role => ({
    ...role,
    hourlyRate: Number(role.hourlyRate),
    techniqueCount: role._count.DecorationTechnique,
  }))

  return (
    <div className="max-w-full overflow-hidden py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Labor Roles</h1>
        <p className="text-gray-600 mb-6">
          Define labor roles with different hourly rates. Assign roles to decoration techniques to accurately cost skilled vs. basic work.
        </p>
        <LaborRolesList initialRoles={plainRoles} />
      </div>
    </div>
  )
}
