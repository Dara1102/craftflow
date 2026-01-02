'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface StaffMember {
  id: number
  name: string
  isManager: boolean
}

interface OrderLead {
  id: number
  name: string
  isManager: boolean
  assignedAt: string
}

interface OrderInfo {
  id: number
  customerName: string
  eventDate: string
  eventTime: string | null
  isDelivery: boolean
  status: string
  orderLead: OrderLead | null
  prepStatus: 'NOT_STARTED' | 'IN_REVIEW' | 'SIGNED_OFF'
  prepSignoff: {
    signedAt: string | null
    lockedAt: string | null
  } | null
  tierCount: number
  tiersWithCakeboard: number
  taskCount: number
  assignedTasks: number
}

interface AssignmentsResult {
  orders: OrderInfo[]
  stats: {
    total: number
    assigned: number
    unassigned: number
    signedOff: number
    inReview: number
    notStarted: number
  }
}

function LoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductionPrepPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProductionPrepPageInner />
    </Suspense>
  )
}

function ProductionPrepPageInner() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<AssignmentsResult | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'in_review' | 'signed_off'>('all')
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [bulkStaffId, setBulkStaffId] = useState<string>('')
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [searchParams])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const orderIds = searchParams.get('orderIds')

      if (orderIds) {
        params.set('orderIds', orderIds)
      } else if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      }

      const [assignmentsRes, staffRes] = await Promise.all([
        fetch(`/api/production/assignments?${params}`),
        fetch('/api/staff')
      ])

      if (!assignmentsRes.ok) throw new Error('Failed to load assignments')
      if (!staffRes.ok) throw new Error('Failed to load staff')

      const assignmentsData = await assignmentsRes.json()
      const staffData = await staffRes.json()

      setData(assignmentsData)
      setStaff(staffData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const assignOrder = async (orderId: number, staffId: number) => {
    setSaving(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId })
      })

      if (!res.ok) throw new Error('Failed to assign order')

      // Reload data
      loadData()
    } catch (err) {
      console.error('Failed to assign order:', err)
    } finally {
      setSaving(null)
    }
  }

  const bulkAssign = async () => {
    if (!bulkStaffId || selectedOrders.size === 0) return

    setSaving(-1) // Indicate bulk saving
    try {
      const res = await fetch('/api/production/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: Array.from(selectedOrders).map(orderId => ({
            orderId,
            staffId: parseInt(bulkStaffId)
          }))
        })
      })

      if (!res.ok) throw new Error('Failed to bulk assign')

      setSelectedOrders(new Set())
      setBulkStaffId('')
      loadData()
    } catch (err) {
      console.error('Failed to bulk assign:', err)
    } finally {
      setSaving(null)
    }
  }

  const toggleOrderSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const selectAllUnassigned = () => {
    if (!data) return
    const unassignedIds = data.orders
      .filter(o => !o.orderLead)
      .map(o => o.id)
    setSelectedOrders(new Set(unassignedIds))
  }

  const filteredOrders = data?.orders.filter(order => {
    switch (filter) {
      case 'unassigned':
        return !order.orderLead
      case 'in_review':
        return order.prepStatus === 'IN_REVIEW'
      case 'signed_off':
        return order.prepStatus === 'SIGNED_OFF'
      default:
        return true
    }
  }) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SIGNED_OFF':
        return 'bg-green-100 text-green-800'
      case 'IN_REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SIGNED_OFF':
        return 'Signed Off'
      case 'IN_REVIEW':
        return 'In Review'
      default:
        return 'Not Started'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link href="/production" className="mt-4 inline-block text-pink-600 hover:text-pink-800">
              ← Back to Production Reports
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const progressPercent = data.stats.total > 0
    ? Math.round((data.stats.signedOff / data.stats.total) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Production Prep</h1>
            <p className="mt-1 text-sm text-gray-500">
              Assign staff, confirm cakeboards, and sign off on orders
            </p>
          </div>
          <Link
            href="/admin/staff"
            className="text-sm text-pink-600 hover:text-pink-800"
          >
            Manage Staff →
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow sm:rounded-lg mb-6 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Sign-off Progress</span>
            <span className="text-sm text-gray-500">
              {data.stats.signedOff} of {data.stats.total} signed off ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white shadow sm:rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{data.stats.total}</div>
            <div className="text-sm text-gray-500">Total Orders</div>
          </div>
          <div className="bg-white shadow sm:rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{data.stats.assigned}</div>
            <div className="text-sm text-gray-500">Assigned</div>
          </div>
          <div className="bg-white shadow sm:rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{data.stats.unassigned}</div>
            <div className="text-sm text-gray-500">Unassigned</div>
          </div>
          <div className="bg-white shadow sm:rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{data.stats.inReview}</div>
            <div className="text-sm text-gray-500">In Review</div>
          </div>
          <div className="bg-white shadow sm:rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data.stats.signedOff}</div>
            <div className="text-sm text-gray-500">Signed Off</div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-blue-700">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStaffId}
                onChange={(e) => setBulkStaffId(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              >
                <option value="">Select staff...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isManager ? '(Manager)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={bulkAssign}
                disabled={!bulkStaffId || saving === -1}
                className="bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving === -1 ? 'Assigning...' : 'Assign Selected'}
              </button>
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={selectAllUnassigned}
            className="text-sm text-pink-600 hover:text-pink-800"
          >
            Select All Unassigned
          </button>
          <div className="flex-1"></div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'unassigned', label: 'Unassigned' },
              { key: 'in_review', label: 'In Review' },
              { key: 'signed_off', label: 'Signed Off' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-3 py-1 rounded-md text-sm ${
                  filter === tab.key
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No orders match the current filter.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
                        } else {
                          setSelectedOrders(new Set())
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Lead</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tiers</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cakeboards</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prep Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${saving === order.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          order.isDelivery ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.isDelivery ? 'D' : 'P'}
                        </span>
                        <div>
                          <div className="text-gray-900">
                            {new Date(order.eventDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          {order.eventTime && (
                            <div className="text-xs text-gray-500">{order.eventTime}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-medium text-pink-600 hover:text-pink-800"
                      >
                        {order.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={order.orderLead?.id || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            assignOrder(order.id, parseInt(e.target.value))
                          }
                        }}
                        disabled={saving === order.id}
                        className={`border rounded-md px-2 py-1 text-sm w-40 ${
                          !order.orderLead ? 'border-orange-300 bg-orange-50' : ''
                        }`}
                      >
                        <option value="">Unassigned</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.isManager ? '(M)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                      {order.tierCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <span className={order.tiersWithCakeboard === order.tierCount ? 'text-green-600' : 'text-orange-600'}>
                        {order.tiersWithCakeboard}/{order.tierCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <span className={order.assignedTasks === order.taskCount ? 'text-green-600' : 'text-gray-500'}>
                        {order.assignedTasks}/{order.taskCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.prepStatus)}`}>
                        {getStatusLabel(order.prepStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Link
                        href={`/production/prep/${order.id}`}
                        className="text-pink-600 hover:text-pink-800"
                      >
                        {order.prepStatus === 'NOT_STARTED' ? 'Start Review' :
                         order.prepStatus === 'IN_REVIEW' ? 'Continue' : 'View'}
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
  )
}
