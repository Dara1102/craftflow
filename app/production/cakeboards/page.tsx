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
  boardSize: string | null
  drumSize: string | null
  cakeboardTypeId: number | null
  cakeboardTypeName: string | null
  cakeboardShape: string | null
  cakeboardSizeInches: number | null
  cakeboardNotes: string | null
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

export default function CakeboardAssignmentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CakeboardAssignmentPageInner />
    </Suspense>
  )
}

function CakeboardAssignmentPageInner() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<StackingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [showAssigned, setShowAssigned] = useState(true)

  // Bulk assignment state
  const [selectedTiers, setSelectedTiers] = useState<Set<number>>(new Set())
  const [bulkTypeId, setBulkTypeId] = useState<string>('')
  const [bulkShape, setBulkShape] = useState<string>('round')

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
      } else {
        // Default to next 14 days
        const today = new Date()
        const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
        params.set('startDate', today.toISOString().split('T')[0])
        params.set('endDate', twoWeeks.toISOString().split('T')[0])
      }

      const res = await fetch(`/api/production/stacking?${params}`)
      if (!res.ok) throw new Error('Failed to load data')

      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
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
    setSaving(tierId)
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
      setSaving(null)
    }
  }

  const toggleTierSelection = (tierId: number) => {
    const newSelected = new Set(selectedTiers)
    if (newSelected.has(tierId)) {
      newSelected.delete(tierId)
    } else {
      newSelected.add(tierId)
    }
    setSelectedTiers(newSelected)
  }

  const selectAllUnassigned = () => {
    if (!data) return
    const unassigned = new Set<number>()
    for (const dateGroup of data.cakesByDate) {
      for (const cake of dateGroup.cakes) {
        for (const tier of cake.tiers) {
          if (!tier.cakeboardTypeId) {
            unassigned.add(tier.tierId)
          }
        }
      }
    }
    setSelectedTiers(unassigned)
  }

  const applyBulkAssignment = async () => {
    if (!bulkTypeId || selectedTiers.size === 0) return

    const typeId = parseInt(bulkTypeId)
    const tierIds = Array.from(selectedTiers)

    for (const tierId of tierIds) {
      await updateCakeboard(tierId, {
        cakeboardTypeId: typeId,
        cakeboardShape: bulkShape
      })
    }

    setSelectedTiers(new Set())
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

  const cakeboardTypes = data.cakeboardTypes || []

  // Count stats
  let totalTiers = 0
  let assignedTiers = 0
  for (const dateGroup of data.cakesByDate) {
    for (const cake of dateGroup.cakes) {
      for (const tier of cake.tiers) {
        totalTiers++
        if (tier.cakeboardTypeId) assignedTiers++
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Cakeboard Assignment</h1>
            <p className="mt-1 text-sm text-gray-500">
              {assignedTiers} of {totalTiers} tiers assigned cakeboards
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/cakeboards"
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border rounded-md"
            >
              Manage Types
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow sm:rounded-lg mb-6 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Assignment Progress</span>
            <span className="text-sm text-gray-500">{Math.round((assignedTiers / totalTiers) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all"
              style={{ width: `${(assignedTiers / totalTiers) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Bulk Assignment Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Bulk Assignment</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={selectAllUnassigned}
              className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200"
            >
              Select All Unassigned ({totalTiers - assignedTiers})
            </button>
            <select
              value={bulkTypeId}
              onChange={(e) => setBulkTypeId(e.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">Select Type</option>
              {cakeboardTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={bulkShape}
              onChange={(e) => setBulkShape(e.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="round">Round</option>
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
            </select>
            <button
              onClick={applyBulkAssignment}
              disabled={selectedTiers.size === 0 || !bulkTypeId}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply to {selectedTiers.size} Selected
            </button>
            {selectedTiers.size > 0 && (
              <button
                onClick={() => setSelectedTiers(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAssigned}
              onChange={(e) => setShowAssigned(e.target.checked)}
              className="rounded text-pink-600 focus:ring-pink-500"
            />
            <span>Show assigned tiers</span>
          </label>
        </div>

        {/* Tiers List */}
        {data.cakesByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No cakes found for the selected date range.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                    <input
                      type="checkbox"
                      checked={selectedTiers.size > 0 && selectedTiers.size === (totalTiers - assignedTiers)}
                      onChange={() => {
                        if (selectedTiers.size > 0) {
                          setSelectedTiers(new Set())
                        } else {
                          selectAllUnassigned()
                        }
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shape</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Board Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.cakesByDate.map(dateGroup => (
                  dateGroup.cakes.map(cake => (
                    cake.tiers.map((tier, tierIdx) => {
                      // Filter
                      if (!showAssigned && tier.cakeboardTypeId) return null

                      const isBottomTier = tierIdx === cake.tiers.length - 1
                      const isSelected = selectedTiers.has(tier.tierId)
                      const isSaving = saving === tier.tierId

                      return (
                        <tr
                          key={tier.tierId}
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${isSaving ? 'opacity-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTierSelection(tier.tierId)}
                              disabled={isSaving}
                              className="rounded text-pink-600 focus:ring-pink-500"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="text-gray-900">{dateGroup.dayName.slice(0, 3)}</span>
                            <span className="text-gray-500 ml-1">
                              {new Date(dateGroup.date + 'T12:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Link
                              href={`/orders/${cake.orderId}`}
                              className="text-pink-600 hover:text-pink-800 font-medium"
                            >
                              {cake.customerName}
                            </Link>
                            <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              cake.isDelivery ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {cake.isDelivery ? 'D' : 'P'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            Tier {tier.tierIndex + 1} {isBottomTier && <span className="text-xs text-gray-500">(bottom)</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {tier.size}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={tier.cakeboardTypeId || ''}
                              onChange={(e) => {
                                const typeId = e.target.value ? parseInt(e.target.value) : null
                                updateCakeboard(tier.tierId, { cakeboardTypeId: typeId })
                              }}
                              disabled={isSaving}
                              className="text-sm border rounded px-2 py-1 w-full"
                            >
                              <option value="">Select type</option>
                              {cakeboardTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={tier.cakeboardShape || 'round'}
                              onChange={(e) => {
                                updateCakeboard(tier.tierId, { cakeboardShape: e.target.value })
                              }}
                              disabled={isSaving}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="round">Round</option>
                              <option value="square">Square</option>
                              <option value="rectangle">Rectangle</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tier.cakeboardSizeInches || ''}
                                onChange={(e) => {
                                  const size = e.target.value ? parseInt(e.target.value) : null
                                  updateCakeboard(tier.tierId, { cakeboardSizeInches: size })
                                }}
                                disabled={isSaving}
                                placeholder={isBottomTier ? tier.drumSize?.replace('"', '') || '' : tier.boardSize?.replace('"', '') || ''}
                                className="text-sm border rounded px-2 py-1 w-16"
                              />
                              <span className="text-sm text-gray-500">&quot;</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {tier.cakeboardTypeId ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Assigned
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ))
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
