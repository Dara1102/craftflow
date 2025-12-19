'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Decoration {
  id: number
  techniqueName: string
  category: string | null
  customText: string | null
  quantity: number
  notes: string | null
}

interface Topper {
  type: string | null
  text: string | null
  customText: string | null
}

interface OrderGraphics {
  orderId: number
  customerName: string
  eventDate: string
  eventTime: string | null
  decorations: Decoration[]
  topper: Topper | null
  cakeStyle: string | null
  cakeTheme: string | null
  colors: string[]
  notes: string | null
}

interface GraphicsResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  orderGraphics: OrderGraphics[]
  totals: {
    totalDecorations: number
    totalToppers: number
  }
}

export default function GraphicsReportPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<GraphicsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

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

      const res = await fetch(`/api/production/graphics?${params}`)
      if (!res.ok) throw new Error('Failed to load graphics report')

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graphics report')
    } finally {
      setLoading(false)
    }
  }

  const toggleChecked = (key: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(key)) {
      newChecked.delete(key)
    } else {
      newChecked.add(key)
    }
    setCheckedItems(newChecked)
  }

  const handlePrint = () => {
    window.print()
  }

  const formatTopperType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'age': 'Age Topper',
      'happy_birthday': 'Happy Birthday',
      'custom': 'Custom Topper',
      'provided': 'Customer Provided',
      'none': 'No Topper'
    }
    return typeMap[type] || type
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
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Graphics & Decorators Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.orderCount} order{data.orderCount !== 1 ? 's' : ''} | {data.totals.totalDecorations} decorations | {data.totals.totalToppers} toppers | Generated {new Date(data.generatedAt).toLocaleString()}
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 print:mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.orderCount}</div>
              <div className="text-sm text-gray-600">Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.totals.totalDecorations}</div>
              <div className="text-sm text-gray-600">Decorations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.totals.totalToppers}</div>
              <div className="text-sm text-gray-600">Toppers</div>
            </div>
          </div>
        </div>

        {/* Orders */}
        {data.orderGraphics.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No graphics or decorations found for the selected orders.</p>
          </div>
        ) : (
          <div className="space-y-4 print:space-y-3">
            {data.orderGraphics.map(order => (
              <div key={order.orderId} className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:break-inside-avoid">
                {/* Order Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <Link
                      href={`/orders/${order.orderId}`}
                      className="text-lg font-medium text-pink-600 hover:text-pink-800 print:text-gray-900 print:no-underline"
                    >
                      {order.customerName}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {new Date(order.eventDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {order.eventTime && ` at ${order.eventTime}`}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {order.cakeStyle && <span className="block">{order.cakeStyle}</span>}
                    {order.cakeTheme && <span className="block text-gray-500">{order.cakeTheme}</span>}
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 py-3">
                  {/* Colors */}
                  {order.colors.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Colors: </span>
                      <span className="text-sm text-gray-600">{order.colors.join(', ')}</span>
                    </div>
                  )}

                  {/* Decorations */}
                  {order.decorations.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Decorations:</h4>
                      <div className="space-y-2">
                        {order.decorations.map(deco => {
                          const key = `deco-${deco.id}`
                          const isChecked = checkedItems.has(key)

                          return (
                            <div
                              key={deco.id}
                              className={`flex items-start gap-3 p-2 rounded ${isChecked ? 'bg-green-50' : 'bg-gray-50'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChecked(key)}
                                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded print:hidden"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{deco.techniqueName}</span>
                                  {deco.category && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                      {deco.category}
                                    </span>
                                  )}
                                  {deco.quantity > 1 && (
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                      ×{deco.quantity}
                                    </span>
                                  )}
                                </div>
                                {deco.customText && (
                                  <p className="text-sm text-blue-600 mt-1 font-medium">
                                    &ldquo;{deco.customText}&rdquo;
                                  </p>
                                )}
                                {deco.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{deco.notes}</p>
                                )}
                              </div>
                              <div className={`w-5 h-5 border-2 rounded flex-shrink-0 ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {isChecked && (
                                  <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Topper */}
                  {order.topper && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Topper:</h4>
                      {(() => {
                        const key = `topper-${order.orderId}`
                        const isChecked = checkedItems.has(key)

                        return (
                          <div className={`flex items-start gap-3 p-2 rounded ${isChecked ? 'bg-green-50' : 'bg-amber-50'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleChecked(key)}
                              className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded print:hidden"
                            />
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {formatTopperType(order.topper.type || '')}
                              </span>
                              {order.topper.text && (
                                <p className="text-sm text-blue-600 mt-1 font-medium">
                                  &ldquo;{order.topper.text}&rdquo;
                                </p>
                              )}
                              {order.topper.customText && (
                                <p className="text-sm text-gray-500 mt-1">{order.topper.customText}</p>
                              )}
                            </div>
                            <div className={`w-5 h-5 border-2 rounded flex-shrink-0 ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                              {isChecked && (
                                <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Order Notes */}
                  {order.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                      <span className="font-medium text-yellow-800">Notes: </span>
                      <span className="text-yellow-700">{order.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
