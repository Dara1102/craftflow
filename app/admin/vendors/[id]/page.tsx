'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'

interface IngredientVendor {
  id: number
  vendorId: number
  vendorName: string
  vendorSku: string | null
  vendorProductName: string | null
  packSize: number
  packUnit: string
  pricePerPack: number
  costPerIngredientUnit: number | null
  reorderUrl: string | null
  isPreferred: boolean
  lastPurchaseDate: string | null
  notes: string | null
  ingredient: {
    id: number
    name: string
    unit: string
    costPerUnit: number
  }
}

interface Vendor {
  id: number
  name: string
  website: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  notes: string | null
  isActive: boolean
  ingredientVendors: IngredientVendor[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function EditVendorPage() {
  const router = useRouter()
  const params = useParams()
  const vendorId = params.id as string

  const { data: vendor, error, mutate } = useSWR<Vendor>(`/api/vendors/${vendorId}`, fetcher)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    isActive: true
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        website: vendor.website || '',
        contactName: vendor.contactName || '',
        contactPhone: vendor.contactPhone || '',
        contactEmail: vendor.contactEmail || '',
        notes: vendor.notes || '',
        isActive: vendor.isActive
      })
    }
  }, [vendor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError('Vendor name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update vendor')
      }

      mutate()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update vendor')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete vendor')
      }

      router.push('/admin/vendors')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete vendor')
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Failed to load vendor
          </div>
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link href="/admin/vendors" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Back to Vendors
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Vendor: {vendor.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update vendor information and view linked ingredients.
          </p>
        </div>

        {/* Vendor Details Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Vendor Details</h2>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active (include in shopping lists)
              </label>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 bg-gray-50 rounded-b-lg flex justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || vendor.ingredientVendors.length > 0}
              className="px-4 py-2 text-red-600 hover:text-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={vendor.ingredientVendors.length > 0 ? 'Remove all ingredient links first' : 'Delete vendor'}
            >
              {deleting ? 'Deleting...' : 'Delete Vendor'}
            </button>
            <div className="flex gap-3">
              <Link
                href="/admin/vendors"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {/* Linked Ingredients */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Linked Ingredients ({vendor.ingredientVendors.length})
              </h2>
            </div>

            {vendor.ingredientVendors.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <p className="mt-4 text-sm text-gray-500">
                  No ingredients linked to this vendor yet.
                </p>
                <p className="text-sm text-gray-400">
                  Link ingredients from the{' '}
                  <Link href="/admin/ingredients" className="text-pink-600 hover:text-pink-800">
                    Ingredients page
                  </Link>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pack Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Price/Pack
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cost/Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Preferred
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendor.ingredientVendors.map((iv) => (
                      <tr key={iv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {iv.ingredient.name}
                          </div>
                          {iv.vendorProductName && (
                            <div className="text-xs text-gray-500">
                              {iv.vendorProductName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {iv.vendorSku || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {iv.packSize} {iv.packUnit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          ${iv.pricePerPack.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {iv.costPerIngredientUnit
                            ? `$${iv.costPerIngredientUnit.toFixed(4)}/${iv.ingredient.unit}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {iv.isPreferred && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Preferred
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
