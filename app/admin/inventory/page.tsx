'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Recipe {
  id: number
  name: string
  type: string
}

interface RecipeLink {
  id?: number
  recipeId: number
  recipeType: string
  quantityPerUnit: number
  notes?: string
  Recipe?: Recipe
}

interface InventoryItem {
  id: number
  sku: string
  name: string
  productType: string
  flavor: string | null
  description: string | null
  unit: string
  currentStock: number
  minStock: number
  maxStock: number | null
  shelfLifeDays: number | null
  storageLocation: string | null
  isActive: boolean
  InventoryItemRecipe: RecipeLink[]
  calculatedStock?: number
  isLowStock?: boolean
}

const PRODUCT_TYPES = [
  { value: 'CAKE_TIER', label: 'Cake Tier' },
  { value: 'CUPCAKE', label: 'Cupcake' },
  { value: 'COOKIE', label: 'Cookie' },
  { value: 'CAKE_POP', label: 'Cake Pop' },
  { value: 'FROSTING', label: 'Frosting' },
  { value: 'FILLING', label: 'Filling' },
  { value: 'FONDANT', label: 'Fondant' },
  { value: 'OTHER', label: 'Other' },
]

const RECIPE_TYPES = ['BATTER', 'FROSTING', 'FILLING']

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    productType: 'CUPCAKE',
    flavor: '',
    description: '',
    unit: 'each',
    minStock: 0,
    maxStock: 10,
    shelfLifeDays: 7,
    storageLocation: '',
  })
  const [recipeLinks, setRecipeLinks] = useState<RecipeLink[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterType, showInactive])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('productType', filterType)
      if (showInactive) params.set('includeInactive', 'true')

      const [itemsRes, recipesRes] = await Promise.all([
        fetch(`/api/inventory?${params}`),
        fetch('/api/recipes')
      ])

      if (!itemsRes.ok) throw new Error('Failed to load inventory')

      const itemsData = await itemsRes.json()
      setItems(itemsData)

      if (recipesRes.ok) {
        const recipesData = await recipesRes.json()
        setRecipes(recipesData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openNewModal = () => {
    setEditingItem(null)
    setFormData({
      sku: '',
      name: '',
      productType: 'CUPCAKE',
      flavor: '',
      description: '',
      unit: 'each',
      minStock: 0,
      maxStock: 10,
      shelfLifeDays: 7,
      storageLocation: '',
    })
    setRecipeLinks([])
    setShowModal(true)
  }

  const openEditModal = async (item: InventoryItem) => {
    // Fetch full item details including recipe links
    try {
      const res = await fetch(`/api/inventory/${item.id}`)
      if (res.ok) {
        const fullItem = await res.json()
        setEditingItem(fullItem)
        setFormData({
          sku: fullItem.sku,
          name: fullItem.name,
          productType: fullItem.productType,
          flavor: fullItem.flavor || '',
          description: fullItem.description || '',
          unit: fullItem.unit,
          minStock: fullItem.minStock,
          maxStock: fullItem.maxStock || 10,
          shelfLifeDays: fullItem.shelfLifeDays || 7,
          storageLocation: fullItem.storageLocation || '',
        })
        setRecipeLinks(fullItem.InventoryItemRecipe || [])
        setShowModal(true)
      }
    } catch (err) {
      setError('Failed to load item details')
    }
  }

  const handleSave = async () => {
    if (!formData.sku || !formData.name) {
      setError('SKU and Name are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        recipeLinks: recipeLinks.map(link => ({
          recipeId: link.recipeId,
          recipeType: link.recipeType,
          quantityPerUnit: link.quantityPerUnit,
          notes: link.notes
        }))
      }

      let res
      if (editingItem) {
        res = await fetch(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        // If created, add recipe links
        if (res.ok && recipeLinks.length > 0) {
          const newItem = await res.json()
          await fetch(`/api/inventory/${newItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeLinks: payload.recipeLinks })
          })
        }
      }

      if (!res.ok) throw new Error('Failed to save')

      setShowModal(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!confirm('Deactivate this product?')) return

    try {
      const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const addRecipeLink = () => {
    setRecipeLinks([...recipeLinks, {
      recipeId: recipes[0]?.id || 0,
      recipeType: 'BATTER',
      quantityPerUnit: 1
    }])
  }

  const updateRecipeLink = (index: number, field: string, value: string | number) => {
    const newLinks = [...recipeLinks]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setRecipeLinks(newLinks)
  }

  const removeRecipeLink = (index: number) => {
    setRecipeLinks(recipeLinks.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
              &larr; Back to Settings
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage pre-made products (cupcakes, cookies, etc.) and link them to recipes for batch planning.
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            + New Product
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {PRODUCT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
        </div>

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No products found. Click &quot;+ New Product&quot; to add one.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className={!item.isActive ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                      {item.flavor && <div className="text-xs text-gray-400">{item.flavor}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.productType === 'CUPCAKE' ? 'bg-pink-100 text-pink-800' :
                        item.productType === 'COOKIE' ? 'bg-amber-100 text-amber-800' :
                        item.productType === 'CAKE_POP' ? 'bg-purple-100 text-purple-800' :
                        item.productType === 'FROSTING' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {PRODUCT_TYPES.find(t => t.value === item.productType)?.label || item.productType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.InventoryItemRecipe && item.InventoryItemRecipe.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.InventoryItemRecipe.map((link, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-green-100 text-green-800"
                              title={`${link.quantityPerUnit}oz per unit`}
                            >
                              {link.Recipe?.name || `Recipe #${link.recipeId}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No recipes linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className={item.isLowStock ? 'text-red-600 font-medium' : 'text-gray-900'}>
                          {item.calculatedStock ?? item.currentStock}
                        </span>
                        <span className="text-gray-400"> / {item.maxStock || '-'}</span>
                      </div>
                      <div className="text-xs text-gray-500">Min: {item.minStock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isLowStock && (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Low Stock</span>
                      )}
                      {!item.isActive && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Inactive</span>
                      )}
                      {!item.isLowStock && item.isActive && (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-pink-600 hover:text-pink-900 mr-3"
                      >
                        Edit
                      </button>
                      {item.isActive && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">How Recipe Links Work</h4>
          <p className="text-sm text-blue-700">
            Linking recipes to products tells the batch planner how much of each recipe is needed to make the product.
            For example, a &quot;Vanilla Cupcakes w/ Chocolate Buttercream&quot; product might need:
          </p>
          <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
            <li>6oz of Vanilla Batter (BATTER type)</li>
            <li>6oz of Chocolate Buttercream (FROSTING type)</li>
          </ul>
          <p className="text-sm text-blue-700 mt-2">
            When stock tasks are scheduled, they&apos;ll appear in the batch planner alongside custom cake orders.
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit Product' : 'New Product'}
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU *</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="CUP-VAN-BC-DZ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Type *</label>
                    <select
                      value={formData.productType}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      {PRODUCT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Vanilla Cupcakes w/ Chocolate Buttercream"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Flavor</label>
                    <input
                      type="text"
                      value={formData.flavor}
                      onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Vanilla/Chocolate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="each">Each</option>
                      <option value="dozen">Dozen</option>
                      <option value="batch">Batch</option>
                      <option value="lb">Pound</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shelf Life (days)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.shelfLifeDays}
                      onChange={(e) => setFormData({ ...formData, shelfLifeDays: parseInt(e.target.value) || 7 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Walk-in Cooler"
                  />
                </div>

                {/* Recipe Links */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Recipe Links</label>
                    <button
                      type="button"
                      onClick={addRecipeLink}
                      className="text-sm text-pink-600 hover:text-pink-800"
                    >
                      + Add Recipe
                    </button>
                  </div>

                  {recipeLinks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No recipes linked. Add recipes to enable batch planning.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recipeLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <select
                              value={link.recipeId}
                              onChange={(e) => updateRecipeLink(index, 'recipeId', parseInt(e.target.value))}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            >
                              <option value="">Select recipe...</option>
                              {recipes.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.type})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-28">
                            <select
                              value={link.recipeType}
                              onChange={(e) => updateRecipeLink(index, 'recipeType', e.target.value)}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            >
                              {RECIPE_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={link.quantityPerUnit}
                              onChange={(e) => updateRecipeLink(index, 'quantityPerUnit', parseFloat(e.target.value) || 0)}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="oz"
                            />
                          </div>
                          <span className="text-sm text-gray-500">oz/unit</span>
                          <button
                            type="button"
                            onClick={() => removeRecipeLink(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
