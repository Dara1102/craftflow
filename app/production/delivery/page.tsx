'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Delivery {
  orderId: number
  customerName: string
  customerPhone: string | null
  eventDate: string
  eventTime: string | null
  deliveryMethod: string
  deliveryFee: number | null
  venue: {
    name: string
    address: string | null
  } | null
  customAddress: string | null
  items: string[]
  notes: string | null
}

interface DateGroup {
  date: string
  dayName: string
  deliveries: Delivery[]
}

interface DeliveryResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  deliveriesByDate: DateGroup[]
  totals: {
    totalDeliveries: number
    totalPickups: number
  }
}

export default function DeliveryReportPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<DeliveryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadReport()
  }, [searchParams])

  const loadReport = async () => {
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
      } else {
        setError('No orders selected')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/production/delivery?${params}`)
      if (!res.ok) throw new Error('Failed to load delivery report')

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery report')
    } finally {
      setLoading(false)
    }
  }

  const toggleChecked = (orderId: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(orderId)) {
      newChecked.delete(orderId)
    } else {
      newChecked.add(orderId)
    }
    setCheckedItems(newChecked)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
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

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block print:hidden">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Delivery Schedule</h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.orderCount} order{data.orderCount !== 1 ? 's' : ''} | Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition print:hidden"
          >
            Print
          </button>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 print:mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.totals.totalDeliveries}</div>
              <div className="text-sm text-gray-600">Deliveries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.totals.totalPickups}</div>
              <div className="text-sm text-gray-600">Pickups</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.deliveriesByDate.length}</div>
              <div className="text-sm text-gray-600">Days</div>
            </div>
          </div>
        </div>

        {/* Deliveries by Date */}
        {data.deliveriesByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No deliveries found for the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {data.deliveriesByDate.map(dateGroup => (
              <div key={dateGroup.date} className="print:break-inside-avoid">
                {/* Date Header */}
                <div className="bg-blue-100 px-4 py-2 rounded-t-lg border border-blue-200 border-b-0">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {dateGroup.dayName}, {new Date(dateGroup.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {dateGroup.deliveries.length} order{dateGroup.deliveries.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Deliveries Table */}
                <div className="bg-white shadow sm:rounded-b-lg overflow-hidden border border-gray-200 print:shadow-none">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8 print:hidden">✓</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Done</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateGroup.deliveries.map(delivery => {
                        const isChecked = checkedItems.has(delivery.orderId)
                        const isDelivery = delivery.deliveryMethod === 'delivery'
                        const address = delivery.venue?.address || delivery.customAddress

                        return (
                          <tr
                            key={delivery.orderId}
                            className={`hover:bg-gray-50 ${isChecked ? 'bg-green-50' : ''}`}
                          >
                            <td className="px-3 py-2 print:hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChecked(delivery.orderId)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {delivery.eventTime || 'TBD'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isDelivery
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isDelivery ? 'Delivery' : 'Pickup'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <Link
                                href={`/orders/${delivery.orderId}`}
                                className="text-pink-600 hover:text-pink-800 font-medium print:text-gray-900 print:no-underline"
                              >
                                {delivery.customerName}
                              </Link>
                              {delivery.customerPhone && (
                                <p className="text-xs text-gray-500">{delivery.customerPhone}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {isDelivery ? (
                                <div>
                                  {delivery.venue && (
                                    <p className="font-medium text-gray-900">{delivery.venue.name}</p>
                                  )}
                                  {address && (
                                    <p className="text-gray-600 text-xs max-w-xs">{address}</p>
                                  )}
                                  {delivery.deliveryFee && (
                                    <p className="text-xs text-gray-500">${delivery.deliveryFee.toFixed(2)} fee</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">Bakery</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              <ul className="list-disc list-inside">
                                {delivery.items.map((item, i) => (
                                  <li key={i} className="text-xs">{item}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 max-w-xs">
                              {delivery.notes ? (
                                <span className="text-xs" title={delivery.notes}>
                                  {delivery.notes.length > 50 ? delivery.notes.slice(0, 50) + '...' : delivery.notes}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className={`w-5 h-5 mx-auto border-2 rounded ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {isChecked && (
                                  <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4 print:bg-white print:border print:mt-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Total: {data.orderCount} orders ({data.totals.totalDeliveries} deliveries, {data.totals.totalPickups} pickups)
            </span>
            <span className="print:hidden">
              {checkedItems.size} of {data.orderCount} completed
            </span>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            table { font-size: 10px; }
            th, td { padding: 3px 5px !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
