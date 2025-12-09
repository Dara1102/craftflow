import Link from 'next/link'
import { prisma } from '@/lib/db'
import TierForm from '../tier-form'

export default async function NewTierSize() {
  const recipes = await prisma.recipe.findMany({ orderBy: { name: 'asc' } })

  const batterRecipes = recipes
    .filter(r => r.type === 'BATTER')
    .map(r => ({ id: r.id, name: r.name, type: r.type }))

  const frostingRecipes = recipes
    .filter(r => r.type === 'FROSTING')
    .map(r => ({ id: r.id, name: r.name, type: r.type }))

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/admin/tiers" className="hover:text-pink-600">Tier Sizes</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">New Tier Size</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Tier Size</h1>
        <TierForm tierSize={null} batterRecipes={batterRecipes} frostingRecipes={frostingRecipes} />
      </div>
    </div>
  )
}
