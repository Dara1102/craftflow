'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ProductItem {
  orderId: number
  orderItemId: number
  customerName: string
  eventDate: string
  eventTime: string | null
  isDelivery: boolean
  productTypeName: string
  menuItemName: string | null
  quantity: number
  batterRecipe: string | null
  fillingRecipe: string | null
  frostingRecipe: string | null
  packaging: string | null
  packagingQty: number | null
  notes: string | null
  style: string | null
  decorations: string | null
}

interface DateGroup {
  date: string
  dayName: string
  items: ProductItem[]
}

interface ProductReportResult {
  orderIds: number[]
  orderCount: number
  productType: string
  generatedAt: string
  itemsByDate: DateGroup[]
  totals: {
    totalQuantity: number
    totalItems: number
  }
}

interface ProductReportProps {
  productType: string
  title: string
  icon?: string
  accentColor?: string
}

function ProductReportFallback() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductReport(props: ProductReportProps) {
  return (
    <Suspense fallback={<ProductReportFallback />}>
      <ProductReportInner {...props} />
    </Suspense>
  )
}

function ProductReportInner({ productType, title, icon, accentColor = 'pink' }: ProductReportProps) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ProductReportResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadReport()
  }, [searchParams, productType])

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

      params.set('productType', productType)

      const res = await fetch(`/api/production/products?${params}`)
      if (!res.ok) throw new Error(`Failed to load ${productType} report`)

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${productType} report`)
    } finally {
      setLoading(false)
    }
  }

  const toggleChecked = (itemId: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
  }

  const handlePrint = () => {
    window.print()
  }

  const colorClasses = {
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', header: 'bg-pink-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', header: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', header: 'bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', header: 'bg-amber-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', header: 'bg-green-100' },
  }

  const colors = colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.pink

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
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
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">
              {icon && <span className="mr-2">{icon}</span>}
              {title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.orderCount} order{data.orderCount !== 1 ? 's' : ''} | {data.totals.totalQuantity} total | Generated {new Date(data.generatedAt).toLocaleString()}
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
        <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-6 print:mb-4`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${colors.text}`}>{data.totals.totalItems}</div>
              <div className="text-sm text-gray-600">Line Items</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${colors.text}`}>{data.totals.totalQuantity}</div>
              <div className="text-sm text-gray-600">Total Qty</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${colors.text}`}>{data.itemsByDate.length}</div>
              <div className="text-sm text-gray-600">Production Days</div>
            </div>
          </div>
        </div>

        {/* Items by Date */}
        {data.itemsByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No {productType.toLowerCase()} orders found for the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {data.itemsByDate.map(dateGroup => (
              <div key={dateGroup.date} className="print:break-inside-avoid">
                {/* Date Header */}
                <div className={`${colors.header} px-4 py-2 rounded-t-lg border ${colors.border} border-b-0`}>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {dateGroup.dayName}, {new Date(dateGroup.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {dateGroup.items.length} item{dateGroup.items.length !== 1 ? 's' : ''} |{' '}
                    {dateGroup.items.reduce((sum, i) => sum + i.quantity, 0)} total qty
                  </p>
                </div>

                {/* Items Table */}
                <div className="bg-white shadow sm:rounded-b-lg overflow-hidden border border-gray-200 print:shadow-none">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8 print:hidden">✓</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flavor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frosting</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Packaging</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Done</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateGroup.items.map(item => {
                        const isChecked = checkedItems.has(item.orderItemId)

                        return (
                          <tr
                            key={item.orderItemId}
                            className={`hover:bg-gray-50 ${isChecked ? 'bg-green-50' : ''}`}
                          >
                            <td className="px-3 py-2 print:hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChecked(item.orderItemId)}
                                className={`h-4 w-4 ${colors.text} focus:ring-pink-500 border-gray-300 rounded`}
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                item.isDelivery
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.isDelivery ? 'D' : 'P'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <Link
                                href={`/orders/${item.orderId}`}
                                className="text-pink-600 hover:text-pink-800 font-medium print:text-gray-900 print:no-underline"
                              >
                                {item.customerName}
                              </Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {item.eventTime || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-center text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.menuItemName || item.productTypeName}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.batterRecipe || '-'}
                              {item.fillingRecipe && <span className="text-gray-500"> / {item.fillingRecipe}</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {item.frostingRecipe || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {item.packaging ? (
                                <span>
                                  {item.packaging}
                                  {item.packagingQty && item.packagingQty > 1 && ` (×${item.packagingQty})`}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 max-w-xs">
                              {item.style || item.decorations ? (
                                <div>
                                  {item.style && <div className="font-medium">{item.style}</div>}
                                  {item.decorations && <div className="text-gray-500 text-xs">{item.decorations}</div>}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={item.notes || ''}>
                              {item.notes || '-'}
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
              Total: {data.itemsByDate.length} day{data.itemsByDate.length !== 1 ? 's' : ''} |{' '}
              {data.totals.totalItems} items |{' '}
              {data.totals.totalQuantity} qty
            </span>
            <span className="print:hidden">
              {checkedItems.size} of {data.totals.totalItems} completed
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
            table { font-size: 11px; }
            th, td { padding: 4px 6px !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
