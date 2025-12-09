import IngredientsList from './ingredients-list'
import { prisma } from '@/lib/db'

export default async function IngredientsAdmin() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  // Convert Decimal to number for client component
  const plainIngredients = ingredients.map(ing => ({
    ...ing,
    costPerUnit: Number(ing.costPerUnit)
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Ingredients</h1>
        <IngredientsList initialIngredients={plainIngredients} />
      </div>
    </div>
  )
}