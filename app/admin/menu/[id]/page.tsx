'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface ProductType {
  id: number
  name: string
  category: string
  baseUnit: string
}

interface Recipe {
  id: number
  name: string
  type: string
}

interface Packaging {
  id: number
  name: string
  type: string
  costPerUnit: number
}

interface LaborRole {
  id: number
  name: string
  hourlyRate: number
}

interface MenuItem {
  id: number
  productTypeId: number
  name: string
  description: string | null
  batterRecipeId: number | null
  fillingRecipeId: number | null
  frostingRecipeId: number | null
  yieldsPerRecipe: number | null
  menuPrice: number
  laborMinutes: number | null
  laborRoleId: number | null
  decorationLevel: string | null
  defaultPackagingId: number | null
  isActive: boolean
}

export default function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: menuItem, isLoading } = useSWR<MenuItem>(`/api/menu-items/${id}`, fetcher)
  const { data: productTypes } = useSWR<ProductType[]>('/api/product-types', fetcher)
  const { data: recipes } = useSWR<Recipe[]>('/api/recipes', fetcher)
  const { data: packaging } = useSWR<Packaging[]>('/api/packaging', fetcher)
  const { data: laborRoles } = useSWR<LaborRole[]>('/api/labor-roles', fetcher)

  const batterRecipes = recipes?.filter(r => r.type === 'BATTER') || []
  const fillingRecipes = recipes?.filter(r => r.type === 'FILLING') || []
  const frostingRecipes = recipes?.filter(r => r.type === 'FROSTING') || []

  const [formData, setFormData] = useState({
    productTypeId: '',
    name: '',
    description: '',
    batterRecipeId: '',
    fillingRecipeId: '',
    frostingRecipeId: '',
    yieldsPerRecipe: '',
    menuPrice: '',
    laborMinutes: '',
    laborRoleId: '',
    decorationLevel: 'decorated',
    defaultPackagingId: '',
    isActive: true
  })

  useEffect(() => {
    if (menuItem) {
      setFormData({
        productTypeId: menuItem.productTypeId.toString(),
        name: menuItem.name,
        description: menuItem.description || '',
        batterRecipeId: menuItem.batterRecipeId?.toString() || '',
        fillingRecipeId: menuItem.fillingRecipeId?.toString() || '',
        frostingRecipeId: menuItem.frostingRecipeId?.toString() || '',
        yieldsPerRecipe: menuItem.yieldsPerRecipe?.toString() || '',
        menuPrice: Number(menuItem.menuPrice).toString(),
        laborMinutes: menuItem.laborMinutes?.toString() || '',
        laborRoleId: menuItem.laborRoleId?.toString() || '',
        decorationLevel: menuItem.decorationLevel || 'decorated',
        defaultPackagingId: menuItem.defaultPackagingId?.toString() || '',
        isActive: menuItem.isActive
      })
    }
  }, [menuItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productTypeId: parseInt(formData.productTypeId),
          name: formData.name,
          description: formData.description || null,
          batterRecipeId: formData.batterRecipeId ? parseInt(formData.batterRecipeId) : null,
          fillingRecipeId: formData.fillingRecipeId ? parseInt(formData.fillingRecipeId) : null,
          frostingRecipeId: formData.frostingRecipeId ? parseInt(formData.frostingRecipeId) : null,
          yieldsPerRecipe: formData.yieldsPerRecipe ? parseInt(formData.yieldsPerRecipe) : null,
          menuPrice: parseFloat(formData.menuPrice),
          laborMinutes: formData.laborMinutes ? parseInt(formData.laborMinutes) : null,
          laborRoleId: formData.laborRoleId ? parseInt(formData.laborRoleId) : null,
          decorationLevel: formData.decorationLevel || null,
          defaultPackagingId: formData.defaultPackagingId ? parseInt(formData.defaultPackagingId) : null,
          isActive: formData.isActive
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update menu item')
      }

      router.push('/admin/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!menuItem) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Menu item not found
        </div>
        <Link href="/admin/menu" className="text-pink-600 hover:text-pink-700 mt-4 inline-block">
          &larr; Back to Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/menu" className="text-sm text-gray-500 hover:text-pink-600">
          &larr; Back to Menu
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Menu Item</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Product Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.productTypeId}
                onChange={e => setFormData({ ...formData, productTypeId: e.target.value })}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">Select product type...</option>
                {productTypes?.map(pt => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} ({pt.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Vanilla Cupcake, Chocolate Cake Pop"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Brief description for customers"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm font-medium text-gray-700">Active (visible on menu)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Recipes */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recipes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Link recipes for accurate ingredient costing
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batter Recipe</label>
              <select
                value={formData.batterRecipeId}
                onChange={e => setFormData({ ...formData, batterRecipeId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">None</option>
                {batterRecipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Filling Recipe</label>
              <select
                value={formData.fillingRecipeId}
                onChange={e => setFormData({ ...formData, fillingRecipeId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">None</option>
                {fillingRecipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Frosting Recipe</label>
              <select
                value={formData.frostingRecipeId}
                onChange={e => setFormData({ ...formData, frostingRecipeId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">None</option>
                {frostingRecipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Yields Per Recipe Batch
              </label>
              <input
                type="number"
                value={formData.yieldsPerRecipe}
                onChange={e => setFormData({ ...formData, yieldsPerRecipe: e.target.value })}
                placeholder="e.g., 24 cupcakes from one batch"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                How many items does one recipe batch make?
              </p>
            </div>
          </div>
        </div>

        {/* Pricing & Labor */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing & Labor</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Menu Price (per item) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.menuPrice}
                  onChange={e => setFormData({ ...formData, menuPrice: e.target.value })}
                  required
                  className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Labor Minutes (per item)
              </label>
              <input
                type="number"
                min="0"
                value={formData.laborMinutes}
                onChange={e => setFormData({ ...formData, laborMinutes: e.target.value })}
                placeholder="e.g., 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Labor Role</label>
              <select
                value={formData.laborRoleId}
                onChange={e => setFormData({ ...formData, laborRoleId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">Default (Baker)</option>
                {laborRoles?.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name} (${Number(role.hourlyRate).toFixed(2)}/hr)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Decoration Level</label>
              <select
                value={formData.decorationLevel}
                onChange={e => setFormData({ ...formData, decorationLevel: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="plain">Plain</option>
                <option value="decorated">Decorated</option>
                <option value="premium">Premium</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Default Packaging */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Default Packaging</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Default Packaging (optional)
            </label>
            <select
              value={formData.defaultPackagingId}
              onChange={e => setFormData({ ...formData, defaultPackagingId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">None</option>
              {packaging?.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} (${Number(pkg.costPerUnit).toFixed(2)})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Packaging cost will be added to orders automatically
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-pink-600 text-white py-3 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/menu"
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
