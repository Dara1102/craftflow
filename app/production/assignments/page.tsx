'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OrderWithAssignment {
  id: number
  customerName: string
  eventDate: string
  eventTime: string | null
  isDelivery: boolean
  status: string
  orderLead: {
    id: number
    name: string
    isManager: boolean
    assignedAt: string
  } | null
  prepStatus: string
  tierCount: number
  tiersWithCakeboard: number
  taskCount: number
  assignedTasks: number
}

interface Staff {
  id: number
  name: string
  isActive: boolean
}

export default function AssignmentsPage() {
  const [orders, setOrders] = useState<OrderWithAssignment[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assignRes, staffRes] = await Promise.all([
        fetch('/api/production/assignments'),
        fetch('/api/staff')
      ])

      if (assignRes.ok) {
        const data = await assignRes.json()
        setOrders(data.orders || [])
      }

      if (staffRes.ok) {
        const data = await staffRes.json()
        setStaff(data.filter((s: Staff) => s.isActive))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (showUnassignedOnly && o.orderLead !== null) {
      return false
    }
    if (filterStaff !== 'all' && (!o.orderLead || o.orderLead.id.toString() !== filterStaff)) {
      return false
    }
    if (filterDate) {
      const eventDate = o.eventDate.split('T')[0]
      if (eventDate !== filterDate) return false
    }
    return true
  })

  // Group by staff for card view
  const ordersByStaff = staff.reduce((acc, s) => {
    acc[s.id] = filteredOrders.filter(o => o.orderLead?.id === s.id)
    return acc
  }, {} as Record<number, OrderWithAssignment[]>)

  const unassignedOrders = filteredOrders.filter(o => !o.orderLead)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'IN_PRODUCTION': return 'bg-yellow-100 text-yellow-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'DELIVERED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePrint = () => {
    window.print()
  }

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Assignments</h1>
          <p className="text-gray-600 print:hidden">View and print order assignments by staff</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link
            href="/production"
            className="text-pink-600 hover:text-pink-800"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 print:hidden">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Staff Member</label>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">All Staff</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Event Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unassigned"
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="h-4 w-4 text-pink-600 rounded"
            />
            <label htmlFor="unassigned" className="text-sm text-gray-600">
              Unassigned only
            </label>
          </div>

          <div className="flex-1"></div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded text-sm ${
                viewMode === 'cards'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              By Staff
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="bg-pink-600 text-white px-4 py-1.5 rounded text-sm hover:bg-pink-700"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-pink-600 hover:text-pink-800 font-medium"
                    >
                      #{o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {o.customerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{formatDate(o.eventDate)}</div>
                    {o.eventTime && <div className="text-xs text-gray-400">{o.eventTime}</div>}
                    <div className="text-xs">{o.isDelivery ? '🚚 Delivery' : '🏪 Pickup'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.orderLead ? (
                      <span className="font-medium text-gray-900">{o.orderLead.name}</span>
                    ) : (
                      <span className="text-orange-600 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-3 text-gray-600">
                      {o.tierCount > 0 && (
                        <span title="Tiers">{o.tierCount} tier{o.tierCount > 1 ? 's' : ''}</span>
                      )}
                      {o.taskCount > 0 && (
                        <span title="Tasks completed">
                          {o.assignedTasks}/{o.taskCount} tasks
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 print:hidden">
                    <Link
                      href={`/production/assignments/${o.id}`}
                      className="text-sm text-pink-600 hover:text-pink-800"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No assignments found matching your filters
            </div>
          )}
        </div>
      )}

      {/* By Staff View */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {/* Unassigned orders first */}
          {unassignedOrders.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 print:break-inside-avoid">
              <h3 className="font-semibold text-orange-800 mb-3">
                ⚠️ Unassigned Orders ({unassignedOrders.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassignedOrders.map(o => (
                  <div
                    key={o.id}
                    className="bg-white rounded-lg p-3 border border-orange-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-medium text-pink-600 hover:text-pink-800"
                        >
                          #{o.id}
                        </Link>
                        <span className="text-gray-600 ml-2">{o.customerName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(o.eventDate)} {o.eventTime && `• ${o.eventTime}`}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/production/prep/${o.id}`}
                        className="text-xs text-pink-600 hover:text-pink-800"
                      >
                        Assign now →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff sections */}
          {staff.map(s => {
            const staffOrders = ordersByStaff[s.id] || []
            if (staffOrders.length === 0 && filterStaff !== 'all') return null
            if (staffOrders.length === 0) return null

            return (
              <div
                key={s.id}
                className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border print:break-inside-avoid"
              >
                <div className="bg-pink-50 px-4 py-3 border-b border-pink-100">
                  <h3 className="font-semibold text-gray-900">
                    {s.name}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {staffOrders.length} order{staffOrders.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffOrders.map(o => (
                      <div
                        key={o.id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-pink-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Link
                              href={`/orders/${o.id}`}
                              className="font-medium text-pink-600 hover:text-pink-800"
                            >
                              #{o.id}
                            </Link>
                            <span className="text-gray-600 ml-2">{o.customerName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(o.eventDate)} {o.eventTime && `• ${o.eventTime}`}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          {o.isDelivery ? '🚚 Delivery' : '🏪 Pickup'}
                          {o.tierCount > 0 && <span>• {o.tierCount} tier{o.tierCount > 1 ? 's' : ''}</span>}
                        </div>
                        <div className="mt-2 print:hidden">
                          <Link
                            href={`/production/assignments/${o.id}`}
                            className="text-xs text-pink-600 hover:text-pink-800"
                          >
                            View details →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 print:mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Orders:</span>{' '}
            <span className="font-medium">{orders.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Assigned:</span>{' '}
            <span className="font-medium text-green-600">{orders.filter(o => o.orderLead).length}</span>
          </div>
          <div>
            <span className="text-gray-500">Unassigned:</span>{' '}
            <span className="font-medium text-orange-600">{orders.filter(o => !o.orderLead).length}</span>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:mt-4 { margin-top: 1rem; }
          .print\\:mb-4 { margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  )
}
