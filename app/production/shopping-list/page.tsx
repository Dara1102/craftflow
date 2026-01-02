'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ShoppingListItem {
  ingredientId: number
  ingredientName: string
  ingredientUnit: string
  totalQuantityNeeded: number
  vendorId: number | null
  vendorName: string | null
  vendorSku: string | null
  packSize: number | null
  packUnit: string | null
  pricePerPack: number | null
  packsNeeded: number | null
  estimatedCost: number | null
  reorderUrl: string | null
}

interface VendorShoppingGroup {
  vendorId: number | null
  vendorName: string
  items: ShoppingListItem[]
  totalEstimatedCost: number
}

interface ShoppingListResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  vendorGroups: VendorShoppingGroup[]
  grandTotal: number
  unlinkedIngredients: ShoppingListItem[]
}

function LoadingFallback() {
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

export default function ShoppingListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ShoppingListPageInner />
    </Suspense>
  )
}

function ShoppingListPageInner() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ShoppingListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVendors, setExpandedVendors] = useState<Set<number | null>>(new Set())

  useEffect(() => {
    loadShoppingList()
  }, [searchParams])

  const loadShoppingList = async () => {
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

      const res = await fetch(`/api/production/shopping-list?${params}`)
      if (!res.ok) throw new Error('Failed to load shopping list')

      const result = await res.json()
      setData(result)

      // Expand all vendors by default
      const allVendorIds = new Set<number | null>(result.vendorGroups.map((g: VendorShoppingGroup) => g.vendorId))
      setExpandedVendors(allVendorIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }

  const toggleVendor = (vendorId: number | null) => {
    const newExpanded = new Set(expandedVendors)
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId)
    } else {
      newExpanded.add(vendorId)
    }
    setExpandedVendors(newExpanded)
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
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Vendor Shopping List</h1>
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

        {/* Summary Card */}
        <div className="bg-white shadow sm:rounded-lg mb-6 print:shadow-none print:border print:mb-4">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Vendors</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{data.vendorGroups.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Ingredients</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {data.vendorGroups.reduce((sum, g) => sum + g.items.length, 0) + data.unlinkedIngredients.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Unlinked Items</dt>
                <dd className="mt-1 text-2xl font-semibold text-orange-600">{data.unlinkedIngredients.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estimated Total</dt>
                <dd className="mt-1 text-2xl font-semibold text-green-600">${data.grandTotal.toFixed(2)}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Groups */}
        <div className="space-y-4 print:space-y-2">
          {data.vendorGroups.map(group => (
            <div key={group.vendorId} className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none print:border print:break-inside-avoid">
              <button
                onClick={() => toggleVendor(group.vendorId)}
                className="w-full px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50 print:cursor-default"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center print:h-8 print:w-8">
                    <span className="text-emerald-600 font-medium text-sm">
                      {group.vendorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-lg font-medium text-gray-900 print:text-base">{group.vendorName}</h3>
                    <p className="text-sm text-gray-500">
                      {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-green-600 mr-4 print:text-base">
                    ${group.totalEstimatedCost.toFixed(2)}
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform print:hidden ${
                      expandedVendors.has(group.vendorId) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {(expandedVendors.has(group.vendorId) || true) && (
                <div className={`border-t border-gray-200 ${expandedVendors.has(group.vendorId) ? '' : 'hidden print:block'}`}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Needed</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pack Size</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Packs</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price/Pack</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase print:hidden">Link</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.items.map(item => (
                        <tr key={item.ingredientId} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.ingredientName}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {item.vendorSku || '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.totalQuantityNeeded.toFixed(2)} {item.ingredientUnit}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.packSize} {item.packUnit}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {item.packsNeeded}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            ${item.pricePerPack?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                            ${item.estimatedCost?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center print:hidden">
                            {item.reorderUrl && (
                              <a
                                href={item.reorderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Order
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Unlinked Ingredients */}
        {data.unlinkedIngredients.length > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg overflow-hidden print:break-inside-avoid">
            <div className="px-4 py-4 sm:px-6">
              <h3 className="text-lg font-medium text-orange-800">
                Ingredients Without Vendor Links ({data.unlinkedIngredients.length})
              </h3>
              <p className="text-sm text-orange-600 mt-1">
                These ingredients don&apos;t have vendor information. Link them in{' '}
                <Link href="/admin/ingredients" className="underline print:no-underline">
                  Admin → Ingredients
                </Link>
              </p>
            </div>
            <table className="min-w-full divide-y divide-orange-200">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Ingredient</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-orange-700 uppercase">Quantity Needed</th>
                </tr>
              </thead>
              <tbody className="bg-orange-50 divide-y divide-orange-200">
                {data.unlinkedIngredients.map(item => (
                  <tr key={item.ingredientId}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ingredientName}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.totalQuantityNeeded.toFixed(2)} {item.ingredientUnit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
