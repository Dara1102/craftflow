import Link from 'next/link'
import { prisma } from '@/lib/db'
import RecipeForm from '../recipe-form'

export default async function NewRecipe() {
  const [ingredients, tierSizes, laborRoles] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    prisma.tierSize.findMany({ orderBy: { diameterCm: 'asc' } }),
    prisma.laborRole.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  ])

  const plainIngredients = ingredients.map(ing => ({
    ...ing,
    costPerUnit: Number(ing.costPerUnit)
  }))

  const plainTierSizes = tierSizes.map(ts => ({
    id: ts.id,
    name: ts.name,
    servings: ts.servings,
    volumeMl: ts.volumeMl
  }))

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
          <Link href="/admin/recipes" className="hover:text-pink-600">Recipes</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">New Recipe</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Recipe</h1>
        <RecipeForm
          recipe={null}
          ingredients={plainIngredients}
          tierSizes={plainTierSizes}
          laborRoles={plainLaborRoles}
        />
      </div>
    </div>
  )
}
