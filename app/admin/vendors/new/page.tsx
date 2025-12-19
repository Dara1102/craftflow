'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewVendorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    website: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    isActive: true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Vendor name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create vendor')
      }

      const vendor = await res.json()
      router.push(`/admin/vendors/${vendor.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link href="/admin/vendors" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Back to Vendors
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Vendor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a supplier where you purchase ingredients and supplies.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
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
                placeholder="Costco, Restaurant Depot, etc."
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
                placeholder="https://www.example.com"
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
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                  placeholder="john@vendor.com"
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
                placeholder="Membership required, delivery options, special instructions..."
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

          <div className="px-4 py-4 sm:px-6 bg-gray-50 rounded-b-lg flex justify-end gap-3">
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
              {saving ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
