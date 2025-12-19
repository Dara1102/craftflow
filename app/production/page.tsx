'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
  id: number
  customer: { name: string } | null
  customerName: string | null
  eventDate: string
  status: string
}

const reportTypes = [
  {
    id: 'stacking',
    name: 'Cake Stacking',
    description: 'Tiers organized by flavor, size, and production date',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    color: 'pink',
    href: '/production/stacking'
  },
  {
    id: 'cupcakes',
    name: 'Cupcakes',
    description: 'All cupcake orders with flavors and quantities',
    icon: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z',
    color: 'purple',
    href: '/production/cupcakes'
  },
  {
    id: 'cookies',
    name: 'Cookies',
    description: 'Cookie orders with decorations and packaging',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'yellow',
    href: '/production/cookies'
  },
  {
    id: 'cake-pops',
    name: 'Cake Pops',
    description: 'Cake pop orders with flavors and counts',
    icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    color: 'orange',
    href: '/production/cake-pops'
  },
  {
    id: 'macarons',
    name: 'Macarons',
    description: 'Macaron orders with flavors and quantities',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    color: 'green',
    href: '/production/macarons'
  },
  {
    id: 'graphics',
    name: 'Graphics & Toppers',
    description: 'Decorations, toppers, and graphics to prepare',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'indigo',
    href: '/production/graphics'
  },
  {
    id: 'delivery',
    name: 'Delivery Schedule',
    description: 'Delivery times, addresses, and contacts',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'blue',
    href: '/production/delivery'
  },
  {
    id: 'shopping-list',
    name: 'Vendor Shopping List',
    description: 'Ingredients grouped by vendor with costs',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    color: 'emerald',
    href: '/production/shopping-list'
  },
  {
    id: 'gantt',
    name: 'Production Gantt',
    description: 'Timeline view of all production tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    color: 'cyan',
    href: '/production/gantt'
  },
  {
    id: 'checklist',
    name: 'Task Checklist',
    description: 'Interactive task checkoff and signoff',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'teal',
    href: '/production/checklist'
  }
]

const colorClasses: { [key: string]: { bg: string, text: string, border: string, hover: string } } = {
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', hover: 'hover:bg-pink-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hover: 'hover:bg-yellow-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hover: 'hover:bg-green-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:bg-emerald-100' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:bg-cyan-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', hover: 'hover:bg-teal-100' },
}

export default function ProductionReportsHub() {
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString().split('T')[0]
  })

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'dateRange' | 'manual'>('dateRange')

  // Load orders for date range
  useEffect(() => {
    if (selectionMode === 'dateRange') {
      loadOrdersForDateRange()
    }
  }, [startDate, endDate, selectionMode])

  const loadOrdersForDateRange = async () => {
    setLoadingOrders(true)
    try {
      // In a real app, this would be an API call with date filters
      const res = await fetch(`/api/orders?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
        setSelectedOrders(data.map((o: Order) => o.id))
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadAllOrders = async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const selectAllOrders = () => {
    setSelectedOrders(orders.map(o => o.id))
  }

  const deselectAllOrders = () => {
    setSelectedOrders([])
  }

  // Build query string for reports
  const getReportQueryString = () => {
    if (selectionMode === 'dateRange') {
      return `?startDate=${startDate}&endDate=${endDate}`
    }
    return `?orderIds=${selectedOrders.join(',')}`
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Production Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate reports for back-of-house production staff
          </p>
        </div>

        {/* Date Range / Order Selection */}
        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Orders</h3>

            {/* Selection Mode Toggle */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setSelectionMode('dateRange')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  selectionMode === 'dateRange'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Date Range
              </button>
              <button
                onClick={() => {
                  setSelectionMode('manual')
                  loadAllOrders()
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  selectionMode === 'manual'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manual Selection
              </button>
            </div>

            {selectionMode === 'dateRange' ? (
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {loadingOrders ? (
                    'Loading orders...'
                  ) : (
                    `${orders.length} order${orders.length !== 1 ? 's' : ''} in range`
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={selectAllOrders}
                    className="text-sm text-pink-600 hover:text-pink-800"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllOrders}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Deselect All
                  </button>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm text-gray-500">
                    {selectedOrders.length} of {orders.length} selected
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {loadingOrders ? (
                    <div className="p-4 text-center text-gray-500">Loading orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No orders found</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {orders.map(order => (
                        <label
                          key={order.id}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm">
                            <span className="font-medium">#{order.id}</span>
                            <span className="text-gray-500"> - </span>
                            <span>{order.customer?.name || order.customerName || 'Unknown'}</span>
                            <span className="text-gray-400"> ({new Date(order.eventDate).toLocaleDateString()})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map(report => {
            const colors = colorClasses[report.color]
            const queryString = getReportQueryString()
            const isDisabled = selectionMode === 'manual' && selectedOrders.length === 0

            return (
              <Link
                key={report.id}
                href={isDisabled ? '#' : `${report.href}${queryString}`}
                className={`block border rounded-lg p-6 transition ${colors.border} ${colors.bg} ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : colors.hover
                }`}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${colors.bg}`}>
                    <svg
                      className={`h-6 w-6 ${colors.text}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className={`text-lg font-medium ${colors.text}`}>{report.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back to Orders
            </Link>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Manage Vendors
            </Link>
            <Link
              href="/admin/ingredients"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Manage Ingredients
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
