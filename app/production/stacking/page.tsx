'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface TierInfo {
  tierIndex: number
  size: string
  shape: string
  flavor: string
  flavorAbbrev: string
  frosting: string
  filling: string | null
  boardSize: string | null
  drumSize: string | null
  color: string | null
  notes: string | null
}

interface CakeInfo {
  orderId: number
  customerName: string
  eventDate: string
  eventTime: string | null
  tierCount: number
  tiers: TierInfo[]
  cakeStyle: string | null
  cakeTheme: string | null
  servings: number | null
  notes: string | null
}

interface DateGroup {
  date: string
  dayName: string
  dayColor: string
  cakes: CakeInfo[]
}

interface StackingResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  cakesByDate: DateGroup[]
}

export default function StackingReportPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<StackingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadStackingReport()
  }, [searchParams])

  const loadStackingReport = async () => {
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

      const res = await fetch(`/api/production/stacking?${params}`)
      if (!res.ok) throw new Error('Failed to load stacking report')

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stacking report')
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

  const totalTiers = data.cakesByDate.reduce(
    (sum, group) => sum + group.cakes.reduce((s, c) => s + c.tierCount, 0),
    0
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block print:hidden">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Cake Stacking Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.orderCount} order{data.orderCount !== 1 ? 's' : ''} | {totalTiers} tier{totalTiers !== 1 ? 's' : ''} | Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition print:hidden"
          >
            Print
          </button>
        </div>

        {/* Legend */}
        <div className="bg-white shadow sm:rounded-lg mb-6 print:shadow-none print:border print:mb-4">
          <div className="px-4 py-3 sm:px-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Flavor Abbreviations</h3>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="bg-gray-100 px-2 py-1 rounded">van = vanilla</span>
              <span className="bg-gray-100 px-2 py-1 rounded">choc = chocolate</span>
              <span className="bg-gray-100 px-2 py-1 rounded">rv = red velvet</span>
              <span className="bg-gray-100 px-2 py-1 rounded">cc = carrot cake</span>
              <span className="bg-gray-100 px-2 py-1 rounded">lem = lemon</span>
              <span className="bg-gray-100 px-2 py-1 rounded">straw = strawberry</span>
              <span className="bg-gray-100 px-2 py-1 rounded">marb = marble</span>
              <span className="bg-gray-100 px-2 py-1 rounded">fun = funfetti</span>
            </div>
          </div>
        </div>

        {/* Cakes by Date */}
        {data.cakesByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No cakes found for the selected orders.</p>
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {data.cakesByDate.map(dateGroup => (
              <div key={dateGroup.date} className="print:break-inside-avoid">
                {/* Date Header */}
                <div className={`${dateGroup.dayColor} px-4 py-2 rounded-t-lg border border-b-0 border-gray-200 print:bg-gray-100`}>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {dateGroup.dayName}, {new Date(dateGroup.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {dateGroup.cakes.length} cake{dateGroup.cakes.length !== 1 ? 's' : ''} |{' '}
                    {dateGroup.cakes.reduce((sum, c) => sum + c.tierCount, 0)} tier{dateGroup.cakes.reduce((sum, c) => sum + c.tierCount, 0) !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Cakes Table */}
                <div className="bg-white shadow sm:rounded-b-lg overflow-hidden border border-gray-200 print:shadow-none">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8 print:hidden">✓</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flavor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frosting</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Board</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Drum</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color/Style</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Done</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateGroup.cakes.map(cake => (
                        cake.tiers.map((tier, tierIdx) => {
                          const key = `${cake.orderId}-${tier.tierIndex}`
                          const isChecked = checkedItems.has(key)
                          const isFirstTier = tierIdx === 0

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-gray-50 ${isChecked ? 'bg-green-50' : ''} ${!isFirstTier ? 'border-t-0' : ''}`}
                            >
                              <td className="px-3 py-2 print:hidden">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChecked(key)}
                                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900" title={tier.flavor}>
                                  {tier.flavorAbbrev}
                                </span>
                                {tier.filling && (
                                  <span className="text-xs text-gray-500 ml-1">/{tier.filling.slice(0, 4)}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {tier.frosting.slice(0, 10)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {tier.size}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {tier.boardSize || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {tier.drumSize || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {isFirstTier ? (
                                  <span>
                                    {tier.color && <span className="mr-1">{tier.color}</span>}
                                    {cake.cakeStyle && <span className="text-gray-500">{cake.cakeStyle}</span>}
                                    {!tier.color && !cake.cakeStyle && '-'}
                                  </span>
                                ) : (
                                  tier.color || '-'
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {isFirstTier ? (
                                  <Link
                                    href={`/orders/${cake.orderId}`}
                                    className="text-pink-600 hover:text-pink-800 font-medium print:text-gray-900 print:no-underline"
                                  >
                                    {cake.customerName}
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">↳</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {isFirstTier && cake.eventTime ? cake.eventTime : ''}
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
                        })
                      ))}
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
              Total: {data.cakesByDate.length} day{data.cakesByDate.length !== 1 ? 's' : ''} |{' '}
              {data.cakesByDate.reduce((sum, g) => sum + g.cakes.length, 0)} cakes |{' '}
              {totalTiers} tiers
            </span>
            <span className="print:hidden">
              {checkedItems.size} of {totalTiers} completed
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
