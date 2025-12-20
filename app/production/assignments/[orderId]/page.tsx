'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'

interface OrderDetails {
  id: number
  customerName: string | null
  eventDate: string
  occasion: string | null
  theme: string | null
  colors: string | null
  accentColors: string | null
  notes: string | null
  imageUrl: string | null
  status: string
  topperType: string | null
  topperText: string | null
  isDelivery: boolean
  deliveryAddress: string | null
  deliveryTime: string | null
  pickupTime: string | null
  isBulkOrder: boolean
  bulkQuantity: number | null
  productionDays: number | null
  Customer: {
    name: string
    email: string | null
    phone: string | null
  } | null
  CakeTier: Array<{
    tierIndex: number
    flavor: string | null
    filling: string | null
    finishType: string | null
    TierSize: { name: string }
    Recipe_CakeTier_batterRecipeIdToRecipe: { name: string } | null
    Recipe_CakeTier_fillingRecipeIdToRecipe: { name: string } | null
    Recipe_CakeTier_frostingRecipeIdToRecipe: { name: string } | null
  }>
  OrderItem: Array<{
    quantity: number
    notes: string | null
    ProductType: { name: string }
    MenuItem: { name: string } | null
  }>
  OrderDecoration: Array<{
    quantity: number
    notes: string | null
    DecorationTechnique: { name: string; description: string | null }
  }>
  OrderAssignment: {
    Staff: { name: string }
    assignedAt: string
  } | null
  ProductionTask: Array<{
    id: number
    taskType: string
    taskName: string
    status: string
    scheduledDate: string
    assignedTo: string | null
  }>
}

export default function OrderAssignmentDetailPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handlePrint = () => {
    window.print()
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-200 text-gray-700'
      case 'IN_PROGRESS': return 'bg-yellow-200 text-yellow-800'
      case 'COMPLETED': return 'bg-green-200 text-green-800'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Order not found</p>
          <Link href="/production/assignments" className="text-pink-600 hover:text-pink-800 mt-2 inline-block">
            ← Back to Assignments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
          <p className="text-gray-600">
            {order.Customer?.name || order.customerName || 'Customer'} • {formatDate(order.eventDate)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
          >
            🖨️ Print
          </button>
          <Link
            href="/production/assignments"
            className="text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
        {/* Image Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border">
          <div className="aspect-square bg-gray-100 relative">
            {order.imageUrl ? (
              <Image
                src={order.imageUrl}
                alt={`Order #${order.id}`}
                fill
                className="object-contain"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2">No image uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-4">
          {/* Status & Assignment */}
          <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border">
            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              {order.OrderAssignment && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Assigned to</div>
                  <div className="font-semibold text-pink-600">{order.OrderAssignment.Staff.name}</div>
                </div>
              )}
            </div>

            {order.isBulkOrder && (
              <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                <span className="text-orange-800 font-medium">BULK ORDER</span>
                {order.bulkQuantity && <span className="ml-2">• {order.bulkQuantity} items</span>}
                {order.productionDays && <span className="ml-2">• {order.productionDays} days production</span>}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Name:</span> {order.Customer?.name || order.customerName}</p>
              {order.Customer?.phone && (
                <p><span className="text-gray-500">Phone:</span> {order.Customer.phone}</p>
              )}
              {order.Customer?.email && (
                <p><span className="text-gray-500">Email:</span> {order.Customer.email}</p>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Date:</span> {formatDate(order.eventDate)}</p>
              {order.occasion && (
                <p><span className="text-gray-500">Occasion:</span> {order.occasion}</p>
              )}
              {order.theme && (
                <p><span className="text-gray-500">Theme:</span> {order.theme}</p>
              )}
              {order.colors && (
                <p><span className="text-gray-500">Colors:</span> {order.colors}</p>
              )}
              {order.accentColors && (
                <p><span className="text-gray-500">Accent Colors:</span> {order.accentColors}</p>
              )}
              {order.isDelivery ? (
                <>
                  <p className="font-medium text-blue-600">🚚 Delivery</p>
                  {order.deliveryAddress && (
                    <p><span className="text-gray-500">Address:</span> {order.deliveryAddress}</p>
                  )}
                  {order.deliveryTime && (
                    <p><span className="text-gray-500">Time:</span> {formatTime(order.deliveryTime)}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-medium text-green-600">🏪 Pickup</p>
                  {order.pickupTime && (
                    <p><span className="text-gray-500">Time:</span> {formatTime(order.pickupTime)}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Topper */}
          {order.topperType && (
            <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-3">Topper</h3>
              <p className="text-sm"><span className="text-gray-500">Type:</span> {order.topperType}</p>
              {order.topperText && (
                <p className="text-lg font-medium mt-2 text-pink-600">&quot;{order.topperText}&quot;</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cake Tiers */}
      {order.CakeTier.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mt-6 print:shadow-none print:border print:mt-4">
          <h3 className="font-semibold text-gray-900 mb-4">Cake Tiers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Tier</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Size</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Flavor/Batter</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Filling</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Frosting</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Finish</th>
                </tr>
              </thead>
              <tbody>
                {order.CakeTier.sort((a, b) => a.tierIndex - b.tierIndex).map(tier => (
                  <tr key={tier.tierIndex} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-medium">{tier.tierIndex + 1}</td>
                    <td className="py-2 px-2">{tier.TierSize.name}</td>
                    <td className="py-2 px-2">
                      {tier.flavor || tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name || '-'}
                    </td>
                    <td className="py-2 px-2">
                      {tier.filling || tier.Recipe_CakeTier_fillingRecipeIdToRecipe?.name || '-'}
                    </td>
                    <td className="py-2 px-2">
                      {tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name || '-'}
                    </td>
                    <td className="py-2 px-2">{tier.finishType || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Items */}
      {order.OrderItem.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mt-6 print:shadow-none print:border print:mt-4">
          <h3 className="font-semibold text-gray-900 mb-4">Other Items</h3>
          <div className="space-y-2">
            {order.OrderItem.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium">{item.quantity}x</span>{' '}
                  {item.MenuItem?.name || item.ProductType.name}
                </div>
                {item.notes && (
                  <span className="text-sm text-gray-500">{item.notes}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decorations */}
      {order.OrderDecoration.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mt-6 print:shadow-none print:border print:mt-4">
          <h3 className="font-semibold text-gray-900 mb-4">Decorations</h3>
          <div className="space-y-2">
            {order.OrderDecoration.map((dec, i) => (
              <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{dec.DecorationTechnique.name}</span>
                  <span className="text-sm text-gray-500">Qty: {dec.quantity}</span>
                </div>
                {dec.DecorationTechnique.description && (
                  <p className="text-sm text-gray-500 mt-1">{dec.DecorationTechnique.description}</p>
                )}
                {dec.notes && (
                  <p className="text-sm text-pink-600 mt-1">Note: {dec.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6 print:mt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Special Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Production Tasks */}
      {order.ProductionTask.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mt-6 print:shadow-none print:border print:mt-4">
          <h3 className="font-semibold text-gray-900 mb-4">Production Tasks</h3>
          <div className="space-y-2">
            {order.ProductionTask.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className="font-medium">{task.taskType}</span>
                <span className="text-gray-600">{task.taskName}</span>
                <span className="text-sm text-gray-400 ml-auto">
                  {new Date(task.scheduledDate).toLocaleDateString()}
                </span>
                {task.assignedTo && (
                  <span className="text-sm text-pink-600">{task.assignedTo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:gap-4 { gap: 1rem !important; }
        }
      `}</style>
    </div>
  )
}
