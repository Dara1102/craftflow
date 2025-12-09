import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function RecipesAdmin() {
  const recipes = await prisma.recipe.findMany({
    include: {
      recipeIngredients: {
        include: {
          ingredient: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Recipes</h1>
          <Link
            href="/admin/recipes/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Recipe
          </Link>
        </div>

        <div className="space-y-6">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {recipe.name}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {recipe.type}
                    </span>
                    {recipe.yieldDescription}
                  </p>
                </div>
                <Link
                  href={`/admin/recipes/${recipe.id}`}
                  className="text-pink-600 hover:text-pink-900 text-sm font-medium"
                >
                  Edit
                </Link>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-4 sm:px-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Ingredients:</h4>
                  {recipe.recipeIngredients.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No ingredients added</p>
                  ) : (
                    <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {recipe.recipeIngredients.map((ri) => (
                        <li key={ri.id} className="text-sm text-gray-600">
                          {Number(ri.quantity)} {ri.ingredient.unit} {ri.ingredient.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}