'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MenuItem {
  id: number
  name: string
  menuPrice: number
}

interface ProductType {
  id: number
  name: string
}

interface VolumeBreakpoint {
  id: number
  menuItemId: number | null
  productTypeId: number | null
  minQuantity: number
  maxQuantity: number | null
  discountPercent: number
  pricePerUnit: number | null
  isActive: boolean
  MenuItem: { id: number; name: string } | null
  ProductType: { id: number; name: string } | null
}

export default function VolumeBreakpointsPage() {
  const [breakpoints, setBreakpoints] = useState<VolumeBreakpoint[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    targetType: 'menuItem' as 'menuItem' | 'productType',
    targetId: '',
    minQuantity: '',
    maxQuantity: '',
    discountPercent: '',
    pricePerUnit: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [bpRes, miRes, ptRes] = await Promise.all([
        fetch('/api/volume-breakpoints'),
        fetch('/api/menu-items'),
        fetch('/api/product-types')
      ])

      if (bpRes.ok) {
        const data = await bpRes.json()
        setBreakpoints(data)
      }

      if (miRes.ok) {
        const data = await miRes.json()
        setMenuItems(data)
      }

      if (ptRes.ok) {
        const data = await ptRes.json()
        setProductTypes(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      menuItemId: formData.targetType === 'menuItem' ? parseInt(formData.targetId) : null,
      productTypeId: formData.targetType === 'productType' ? parseInt(formData.targetId) : null,
      minQuantity: parseInt(formData.minQuantity),
      maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : null,
      discountPercent: parseFloat(formData.discountPercent) || 0,
      pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null
    }

    try {
      const url = editingId
        ? `/api/volume-breakpoints/${editingId}`
        : '/api/volume-breakpoints'

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        fetchData()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save breakpoint:', error)
    }
  }

  const handleEdit = (bp: VolumeBreakpoint) => {
    setEditingId(bp.id)
    setFormData({
      targetType: bp.menuItemId ? 'menuItem' : 'productType',
      targetId: (bp.menuItemId || bp.productTypeId || '').toString(),
      minQuantity: bp.minQuantity.toString(),
      maxQuantity: bp.maxQuantity?.toString() || '',
      discountPercent: bp.discountPercent.toString(),
      pricePerUnit: bp.pricePerUnit?.toString() || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this breakpoint?')) return

    try {
      const res = await fetch(`/api/volume-breakpoints/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      targetType: 'menuItem',
      targetId: '',
      minQuantity: '',
      maxQuantity: '',
      discountPercent: '',
      pricePerUnit: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Group breakpoints by target
  const groupedBreakpoints = breakpoints.reduce((acc, bp) => {
    const key = bp.MenuItem?.name || bp.ProductType?.name || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(bp)
    return acc
  }, {} as Record<string, VolumeBreakpoint[]>)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volume Breakpoints</h1>
          <p className="text-gray-600">Configure bulk order discounts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
          >
            {showForm ? 'Cancel' : '+ Add Breakpoint'}
          </button>
          <Link
            href="/admin"
            className="text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Example Table */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Example: Cookie Volume Pricing</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-700">
              <th className="text-left py-1">Quantity Range</th>
              <th className="text-left py-1">Discount</th>
              <th className="text-left py-1">Per Cookie</th>
              <th className="text-left py-1">100 Cookies Total</th>
            </tr>
          </thead>
          <tbody className="text-blue-800">
            <tr>
              <td className="py-1">1-99</td>
              <td>0%</td>
              <td>$3.50</td>
              <td>-</td>
            </tr>
            <tr>
              <td className="py-1">100-199</td>
              <td>5%</td>
              <td>$3.33</td>
              <td>$333</td>
            </tr>
            <tr>
              <td className="py-1">200-299</td>
              <td>10%</td>
              <td>$3.15</td>
              <td>-</td>
            </tr>
            <tr>
              <td className="py-1">300+</td>
              <td>15%</td>
              <td>$2.98</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Breakpoint' : 'New Breakpoint'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apply To</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="menuItem"
                    checked={formData.targetType === 'menuItem'}
                    onChange={() => setFormData({ ...formData, targetType: 'menuItem', targetId: '' })}
                    className="mr-2"
                  />
                  Menu Item
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="productType"
                    checked={formData.targetType === 'productType'}
                    onChange={() => setFormData({ ...formData, targetType: 'productType', targetId: '' })}
                    className="mr-2"
                  />
                  Product Category
                </label>
              </div>
              <select
                value={formData.targetId}
                onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Select...</option>
                {formData.targetType === 'menuItem'
                  ? menuItems.map(mi => (
                      <option key={mi.id} value={mi.id}>{mi.name} (${mi.menuPrice})</option>
                    ))
                  : productTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))
                }
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Qty</label>
                <input
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., 100"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Qty (optional)</label>
                <input
                  type="number"
                  value={formData.maxQuantity}
                  onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Leave blank for unlimited"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
              <input
                type="number"
                step="0.01"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 10 for 10%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OR Fixed Price Per Unit</label>
              <input
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 2.50"
              />
              <p className="text-xs text-gray-500 mt-1">Use this instead of % discount for fixed pricing</p>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
              >
                {editingId ? 'Update' : 'Create'} Breakpoint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Breakpoints List */}
      <div className="space-y-6">
        {Object.entries(groupedBreakpoints).map(([name, bps]) => (
          <div key={name} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{name}</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty Range</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fixed Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bps.sort((a, b) => a.minQuantity - b.minQuantity).map(bp => (
                  <tr key={bp.id} className={!bp.isActive ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-sm">
                      {bp.minQuantity} - {bp.maxQuantity || '∞'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {bp.discountPercent > 0 ? `${bp.discountPercent}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {bp.pricePerUnit ? `$${bp.pricePerUnit}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        bp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(bp)}
                          className="text-sm text-pink-600 hover:text-pink-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(bp.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {breakpoints.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            No volume breakpoints configured yet.
            <br />
            Click &quot;Add Breakpoint&quot; to create quantity-based discounts.
          </div>
        )}
      </div>
    </div>
  )
}
