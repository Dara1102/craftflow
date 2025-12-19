'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface ProductType {
  id: number
  name: string
  category: string
  baseUnit: string
  description: string | null
  _count: { menuItems: number }
}

interface MenuItem {
  id: number
  name: string
  description: string | null
  menuPrice: number
  yieldsPerRecipe: number | null
  laborMinutes: number | null
  decorationLevel: string | null
  isActive: boolean
  productType: {
    id: number
    name: string
  }
  batterRecipe: { name: string } | null
  frostingRecipe: { name: string } | null
}

export default function MenuManagementPage() {
  const [selectedProductType, setSelectedProductType] = useState<number | null>(null)
  const [showNewItemForm, setShowNewItemForm] = useState(false)

  const { data: productTypes } = useSWR<ProductType[]>('/api/product-types', fetcher)
  const { data: menuItems, mutate: mutateMenuItems } = useSWR<MenuItem[]>(
    selectedProductType
      ? `/api/menu-items?productTypeId=${selectedProductType}`
      : '/api/menu-items',
    fetcher
  )

  const groupedItems = menuItems?.reduce((acc, item) => {
    const typeName = item.productType.name
    if (!acc[typeName]) acc[typeName] = []
    acc[typeName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>) || {}

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product menu items, pricing, and recipes
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/menu/packaging"
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Packaging & Supplies
          </Link>
          <Link
            href="/admin/menu/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 text-sm font-medium"
          >
            + Add Menu Item
          </Link>
        </div>
      </div>

      {/* Product Type Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedProductType(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedProductType === null
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {productTypes?.map(pt => (
            <button
              key={pt.id}
              onClick={() => setSelectedProductType(pt.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedProductType === pt.id
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pt.name} ({pt._count.menuItems})
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      {selectedProductType === null ? (
        // Show grouped by product type
        Object.entries(groupedItems).map(([typeName, items]) => (
          <div key={typeName} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              {typeName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <MenuItemCard key={item.id} item={item} onUpdate={mutateMenuItems} />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Show flat list for selected type
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems?.map(item => (
            <MenuItemCard key={item.id} item={item} onUpdate={mutateMenuItems} />
          ))}
        </div>
      )}

      {menuItems?.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No menu items found</p>
          <Link
            href="/admin/menu/new"
            className="text-pink-600 hover:text-pink-700 text-sm mt-2 inline-block"
          >
            Add your first menu item
          </Link>
        </div>
      )}

      {/* Product Types Summary */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productTypes?.map(pt => (
            <div key={pt.id} className="bg-white border rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{pt.name}</h3>
              <p className="text-sm text-gray-500">{pt.description || pt.category}</p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  Base unit: {pt.baseUnit}
                </span>
                <span className="text-sm font-medium text-pink-600">
                  {pt._count.menuItems} items
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MenuItemCard({ item, onUpdate }: { item: MenuItem; onUpdate: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"?`)) return
    setIsDeleting(true)
    try {
      await fetch(`/api/menu-items/${item.id}`, { method: 'DELETE' })
      onUpdate()
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.productType.name}</p>
        </div>
        <span className="text-lg font-bold text-pink-600">
          ${Number(item.menuPrice).toFixed(2)}
        </span>
      </div>

      {item.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.batterRecipe && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            {item.batterRecipe.name}
          </span>
        )}
        {item.frostingRecipe && (
          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
            {item.frostingRecipe.name}
          </span>
        )}
        {item.decorationLevel && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            {item.decorationLevel}
          </span>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 flex gap-4">
        {item.yieldsPerRecipe && (
          <span>Yields: {item.yieldsPerRecipe}/batch</span>
        )}
        {item.laborMinutes && (
          <span>Labor: {item.laborMinutes} min</span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/admin/menu/${item.id}`}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
