'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface TierInfo {
  tierId: number
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
  // Cakeboard fields
  cakeboardTypeId: number | null
  cakeboardTypeName: string | null
  cakeboardShape: string | null
  cakeboardSizeInches: number | null
  cakeboardNotes: string | null
}

interface PrepSignoff {
  status: string
  signedAt: string | null
  signedByName: string | null
  lockedAt: string | null
}

interface StaffAssignment {
  staffId: number
  staffName: string
  assignedAt: string
}

interface CakeInfo {
  orderId: number
  customerName: string
  eventDate: string
  eventTime: string | null
  isDelivery: boolean
  tierCount: number
  tiers: TierInfo[]
  cakeStyle: string | null
  cakeColors: string | null
  servings: number | null
  notes: string | null
  prepSignoff: PrepSignoff | null
  assignment: StaffAssignment | null
}

interface DateGroup {
  date: string
  dayName: string
  dayColor: string
  cakes: CakeInfo[]
}

interface CakeboardType {
  id: number
  name: string
  availableShapes: string | null
  availableSizes: string | null
}

interface StackingResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  cakesByDate: DateGroup[]
  cakeboardTypes: CakeboardType[]
}

function LoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StackingReportPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StackingReportPageInner />
    </Suspense>
  )
}

function StackingReportPageInner() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<StackingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [editingTierId, setEditingTierId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

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

  const updateCakeboard = async (
    tierId: number,
    updates: {
      cakeboardTypeId?: number | null
      cakeboardShape?: string | null
      cakeboardSizeInches?: number | null
      cakeboardNotes?: string | null
    }
  ) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/production/tiers/${tierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) throw new Error('Failed to update cakeboard')

      const result = await res.json()

      // Update local state
      if (data) {
        const newData = { ...data }
        for (const dateGroup of newData.cakesByDate) {
          for (const cake of dateGroup.cakes) {
            for (const tier of cake.tiers) {
              if (tier.tierId === tierId) {
                tier.cakeboardTypeId = result.tier.cakeboardTypeId
                tier.cakeboardTypeName = result.tier.cakeboardTypeName
                tier.cakeboardShape = result.tier.cakeboardShape
                tier.cakeboardSizeInches = result.tier.cakeboardSizeInches
                tier.cakeboardNotes = result.tier.cakeboardNotes
              }
            }
          }
        }
        setData(newData)
      }
    } catch (err) {
      console.error('Failed to update cakeboard:', err)
    } finally {
      setSaving(false)
    }
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

  const cakeboardTypes = data.cakeboardTypes || []

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
          <div className="flex gap-2 print:hidden">
            <Link
              href="/production/cakeboards"
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition"
            >
              Cakeboard Assignment
            </Link>
            <button
              onClick={handlePrint}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition"
            >
              Print
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white shadow sm:rounded-lg mb-6 print:shadow-none print:border print:mb-4">
          <div className="px-4 py-3 sm:px-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">✓</span>
                <span>= Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">...</span>
                <span>= In Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">-</span>
                <span>= Pending</span>
              </div>
              <span className="border-l border-gray-300 pl-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-1">D</span>= Delivery
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mx-1 ml-3">P</span>= Pickup
              </span>
              <span className="border-l border-gray-300 pl-4">van=vanilla, choc=chocolate, rv=red velvet, cc=carrot cake</span>
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
                <div className="bg-white shadow sm:rounded-b-lg overflow-x-auto border border-gray-200 print:shadow-none">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8 print:hidden">✓</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Status</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flavor</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frosting</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cakeboard</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colors</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Done</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateGroup.cakes.map(cake => (
                        cake.tiers.map((tier, tierIdx) => {
                          const key = `${cake.orderId}-${tier.tierIndex}`
                          const isChecked = checkedItems.has(key)
                          const isFirstTier = tierIdx === 0
                          const isEditing = editingTierId === tier.tierId

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-gray-50 ${isChecked ? 'bg-green-50' : ''} ${!isFirstTier ? 'border-t-0' : ''}`}
                            >
                              <td className="px-2 py-2 print:hidden">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChecked(key)}
                                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                />
                              </td>
                              {/* Approval Status */}
                              <td className="px-2 py-2 text-center">
                                {isFirstTier && (
                                  cake.prepSignoff?.status === 'SIGNED_OFF' ? (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                      title={`Approved by ${cake.prepSignoff.signedByName || 'Manager'} on ${cake.prepSignoff.signedAt ? new Date(cake.prepSignoff.signedAt).toLocaleDateString() : ''}`}
                                    >
                                      ✓
                                    </span>
                                  ) : cake.prepSignoff?.status === 'IN_REVIEW' ? (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                                      title="In review"
                                    >
                                      ...
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500"
                                      title="Not yet reviewed"
                                    >
                                      -
                                    </span>
                                  )
                                )}
                              </td>
                              {/* Delivery/Pickup Indicator */}
                              <td className="px-2 py-2 whitespace-nowrap">
                                {isFirstTier && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    cake.isDelivery
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {cake.isDelivery ? 'D' : 'P'}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900" title={tier.flavor}>
                                  {tier.flavorAbbrev}
                                </span>
                                {tier.filling && (
                                  <span className="text-xs text-gray-500 ml-1">/{tier.filling.slice(0, 4)}</span>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                                {tier.frosting.slice(0, 10)}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                                {tier.size}
                              </td>
                              {/* Cakeboard Column - Inline Edit */}
                              <td className="px-2 py-2 text-sm">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      className="text-xs border rounded px-1 py-0.5 w-20"
                                      value={tier.cakeboardTypeId || ''}
                                      onChange={(e) => {
                                        const typeId = e.target.value ? parseInt(e.target.value) : null
                                        updateCakeboard(tier.tierId, { cakeboardTypeId: typeId })
                                      }}
                                      disabled={saving}
                                    >
                                      <option value="">Type</option>
                                      {cakeboardTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                    <select
                                      className="text-xs border rounded px-1 py-0.5 w-16"
                                      value={tier.cakeboardShape || 'round'}
                                      onChange={(e) => {
                                        updateCakeboard(tier.tierId, { cakeboardShape: e.target.value })
                                      }}
                                      disabled={saving}
                                    >
                                      <option value="round">Round</option>
                                      <option value="square">Square</option>
                                      <option value="rectangle">Rect</option>
                                    </select>
                                    <input
                                      type="number"
                                      className="text-xs border rounded px-1 py-0.5 w-12"
                                      value={tier.cakeboardSizeInches || ''}
                                      placeholder="Size"
                                      onChange={(e) => {
                                        const size = e.target.value ? parseInt(e.target.value) : null
                                        updateCakeboard(tier.tierId, { cakeboardSizeInches: size })
                                      }}
                                      disabled={saving}
                                    />
                                    <span className="text-xs text-gray-400">&quot;</span>
                                    <button
                                      onClick={() => setEditingTierId(null)}
                                      className="text-xs text-gray-500 hover:text-gray-700 ml-1"
                                    >
                                      ✓
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingTierId(tier.tierId)}
                                    className="text-left hover:bg-gray-100 px-1 rounded w-full print:hover:bg-transparent"
                                    title="Click to edit cakeboard"
                                  >
                                    {tier.cakeboardTypeName ? (
                                      <span className="text-gray-900">
                                        {tier.cakeboardTypeName} {tier.cakeboardShape} {tier.cakeboardSizeInches}&quot;
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">
                                        {tierIdx === cake.tiers.length - 1 ? `Drum ${tier.drumSize}` : tier.boardSize || 'Set board'}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </td>
                              {/* Colors */}
                              <td className="px-2 py-2 text-sm">
                                {isFirstTier ? (
                                  <div className="max-w-[100px] truncate">
                                    {cake.cakeColors ? (
                                      <span className="text-pink-600 font-medium">{cake.cakeColors}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">↳</span>
                                )}
                              </td>
                              {/* Style (Theme) */}
                              <td className="px-2 py-2 text-sm">
                                {isFirstTier ? (
                                  <div className="max-w-[100px] truncate">
                                    {cake.cakeStyle ? (
                                      <span className="text-gray-900">{cake.cakeStyle}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">↳</span>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm">
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
                              {/* Assigned Staff */}
                              <td className="px-2 py-2 whitespace-nowrap text-sm">
                                {isFirstTier && (
                                  cake.assignment ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {cake.assignment.staffName}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                                {isFirstTier && cake.eventTime ? cake.eventTime : ''}
                              </td>
                              <td className="px-2 py-2 text-center">
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
            table { font-size: 10px; }
            th, td { padding: 3px 4px !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
