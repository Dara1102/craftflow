'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: number
  eventDate: string
  size: string | null
  notes: string | null
  status: string
  estimatedHours: string
  createdAt: string
}

interface Customer {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  birthday: string | null
  notes: string | null
  orders: Order[]
  createdAt: string
  updatedAt: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    notes: ''
  })

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch(`/api/customers/${params.id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Customer not found')
          } else {
            setError('Failed to load customer')
          }
          return
        }
        const data = await res.json()
        setCustomer(data)
        setFormData({
          name: data.name || '',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          birthday: data.birthday ? data.birthday.split('T')[0] : '',
          notes: data.notes || ''
        })
      } catch {
        setError('Failed to load customer')
      } finally {
        setLoading(false)
      }
    }
    fetchCustomer()
  }, [params.id])

  async function handleSave() {
    if (!formData.name.trim()) {
      alert('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      const updated = await res.json()
      setCustomer({ ...customer!, ...updated })
      setIsEditing(false)
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete customer')
        return
      }

      router.push('/admin/customers')
    } catch {
      alert('Failed to delete customer')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-medium text-red-800">{error || 'Customer not found'}</h2>
            <Link href="/admin/customers" className="mt-4 inline-block text-pink-600 hover:text-pink-800">
              Back to Customers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/customers" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Back to Customers
          </Link>
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="h-16 w-16 bg-pink-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-pink-600 font-semibold text-xl">
                  {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-sm text-gray-500">
                  Customer since {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        name: customer.name || '',
                        company: customer.company || '',
                        email: customer.email || '',
                        phone: customer.phone || '',
                        address: customer.address || '',
                        birthday: customer.birthday ? customer.birthday.split('T')[0] : '',
                        notes: customer.notes || ''
                      })
                    }}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Customer</h3>
              <p className="text-sm text-gray-500 mb-4">
                {customer.orders.length > 0
                  ? `This customer has ${customer.orders.length} order(s). You must delete or reassign their orders before deleting the customer.`
                  : 'Are you sure you want to delete this customer? This action cannot be undone.'
                }
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={deleting}
                >
                  Cancel
                </button>
                {customer.orders.length === 0 && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                      <input
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Any special preferences, allergies, etc."
                      />
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-4">
                    {customer.company && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Company</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.company}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="text-pink-600 hover:text-pink-800">
                            {customer.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="text-pink-600 hover:text-pink-800">
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {customer.address || <span className="text-gray-400">Not provided</span>}
                      </dd>
                    </div>
                    {customer.birthday && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Birthday</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(customer.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </dd>
                      </div>
                    )}
                    {customer.notes && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <dt className="text-xs text-pink-600 font-medium">Total Orders</dt>
                    <dd className="text-2xl font-bold text-pink-700">{customer.orders.length}</dd>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <dt className="text-xs text-green-600 font-medium">Completed</dt>
                    <dd className="text-2xl font-bold text-green-700">
                      {customer.orders.filter(o => o.status === 'COMPLETED').length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Order History</h3>
                  <Link
                    href={`/orders/new?customerId=${customer.id}`}
                    className="text-sm bg-pink-600 text-white px-3 py-1.5 rounded-md hover:bg-pink-700 transition"
                  >
                    New Order
                  </Link>
                </div>

                {customer.orders.length === 0 ? (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">No orders yet for this customer.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Hours
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customer.orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{order.id}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(order.eventDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.size || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                {order.status === 'DRAFT' ? 'Quote' : order.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {parseFloat(order.estimatedHours).toFixed(1)}h
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <Link
                                href={`/orders/${order.id}`}
                                className="text-pink-600 hover:text-pink-900 font-medium"
                              >
                                View
                              </Link>
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
      </div>
    </div>
  )
}
