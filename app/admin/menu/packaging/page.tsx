'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Packaging {
  id: number
  name: string
  type: string
  description: string | null
  capacity: number | null
  sizeFit: string | null
  costPerUnit: number
  vendor: string | null
  sku: string | null
  reorderUrl: string | null
  isActive: boolean
  sortOrder: number
}

const PACKAGING_TYPES = [
  { value: 'BOX', label: 'Box', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTAINER', label: 'Container', color: 'bg-green-100 text-green-700' },
  { value: 'LINER', label: 'Liner', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'BOARD', label: 'Board', color: 'bg-purple-100 text-purple-700' },
  { value: 'WRAP', label: 'Wrap', color: 'bg-pink-100 text-pink-700' },
  { value: 'BAG', label: 'Bag', color: 'bg-orange-100 text-orange-700' },
  { value: 'INSERT', label: 'Insert', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-100 text-gray-700' }
]

export default function PackagingManagementPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: packaging, mutate } = useSWR<Packaging[]>(
    selectedType ? `/api/packaging?type=${selectedType}` : '/api/packaging',
    fetcher
  )

  const groupedPackaging = packaging?.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {} as Record<string, Packaging[]>) || {}

  const getTypeInfo = (type: string) => PACKAGING_TYPES.find(t => t.value === type) || PACKAGING_TYPES[7]

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/menu" className="text-sm text-gray-500 hover:text-pink-600">
            &larr; Back to Menu
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Packaging & Supplies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage boxes, containers, liners, boards, and other packaging
          </p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setEditingId(null) }}
          className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 text-sm font-medium"
        >
          + Add Packaging
        </button>
      </div>

      {/* Type Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedType === null
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Types
          </button>
          {PACKAGING_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedType === type.value
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* New/Edit Form */}
      {(showNewForm || editingId) && (
        <PackagingForm
          packaging={editingId ? packaging?.find(p => p.id === editingId) : undefined}
          onClose={() => { setShowNewForm(false); setEditingId(null) }}
          onSaved={() => { mutate(); setShowNewForm(false); setEditingId(null) }}
        />
      )}

      {/* Packaging List */}
      {selectedType === null ? (
        // Show grouped by type
        Object.entries(groupedPackaging).map(([type, items]) => {
          const typeInfo = getTypeInfo(type)
          return (
            <div key={type} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="text-gray-400 text-sm font-normal">({items.length} items)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                  <PackagingCard
                    key={item.id}
                    packaging={item}
                    typeInfo={typeInfo}
                    onEdit={() => setEditingId(item.id)}
                    onDelete={() => handleDelete(item, mutate)}
                  />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        // Show flat list for selected type
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packaging?.map(item => (
            <PackagingCard
              key={item.id}
              packaging={item}
              typeInfo={getTypeInfo(item.type)}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => handleDelete(item, mutate)}
            />
          ))}
        </div>
      )}

      {packaging?.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No packaging items found</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="text-pink-600 hover:text-pink-700 text-sm mt-2"
          >
            Add your first packaging item
          </button>
        </div>
      )}
    </div>
  )
}

async function handleDelete(packaging: Packaging, mutate: () => void) {
  if (!confirm(`Delete "${packaging.name}"?`)) return
  try {
    await fetch(`/api/packaging/${packaging.id}`, { method: 'DELETE' })
    mutate()
  } catch (error) {
    console.error('Error deleting packaging:', error)
  }
}

function PackagingCard({
  packaging,
  typeInfo,
  onEdit,
  onDelete
}: {
  packaging: Packaging
  typeInfo: { label: string; color: string }
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{packaging.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
        </div>
        <span className="text-lg font-bold text-pink-600">
          ${Number(packaging.costPerUnit).toFixed(2)}
        </span>
      </div>

      {packaging.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{packaging.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        {packaging.capacity && (
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            Holds: {packaging.capacity}
          </span>
        )}
        {packaging.sizeFit && (
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            Fits: {packaging.sizeFit}
          </span>
        )}
      </div>

      {(packaging.vendor || packaging.sku) && (
        <div className="mt-2 text-xs text-gray-400">
          {packaging.vendor && <span>{packaging.vendor}</span>}
          {packaging.vendor && packaging.sku && <span> • </span>}
          {packaging.sku && <span>SKU: {packaging.sku}</span>}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
        {packaging.reorderUrl && (
          <a
            href={packaging.reorderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:text-green-700"
          >
            Reorder
          </a>
        )}
        <button
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function PackagingForm({
  packaging,
  onClose,
  onSaved
}: {
  packaging?: Packaging
  onClose: () => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: packaging?.name || '',
    type: packaging?.type || 'BOX',
    description: packaging?.description || '',
    capacity: packaging?.capacity?.toString() || '',
    sizeFit: packaging?.sizeFit || '',
    costPerUnit: packaging?.costPerUnit ? Number(packaging.costPerUnit).toString() : '',
    vendor: packaging?.vendor || '',
    sku: packaging?.sku || '',
    reorderUrl: packaging?.reorderUrl || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const url = packaging ? `/api/packaging/${packaging.id}` : '/api/packaging'
      const method = packaging ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          sizeFit: formData.sizeFit || null,
          costPerUnit: parseFloat(formData.costPerUnit),
          vendor: formData.vendor || null,
          sku: formData.sku || null,
          reorderUrl: formData.reorderUrl || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save packaging')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {packaging ? 'Edit Packaging' : 'Add Packaging'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., 6-Count Cupcake Box"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            >
              {PACKAGING_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cost Per Unit <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPerUnit}
                onChange={e => setFormData({ ...formData, costPerUnit: e.target.value })}
                required
                className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
              />
            </div>
          </div>

          <div className="col-span-2 md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={e => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="How many items?"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Size Fit</label>
            <input
              type="text"
              value={formData.sizeFit}
              onChange={e => setFormData({ ...formData, sizeFit: e.target.value })}
              placeholder='e.g., 6" cake, standard cupcake'
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={e => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g., Amazon, Webstaurant"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Product SKU"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Reorder URL</label>
            <input
              type="url"
              value={formData.reorderUrl}
              onChange={e => setFormData({ ...formData, reorderUrl: e.target.value })}
              placeholder="https://..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50 text-sm font-medium"
          >
            {isSubmitting ? 'Saving...' : packaging ? 'Save Changes' : 'Add Packaging'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
