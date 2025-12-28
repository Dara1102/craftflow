'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

// Suggested batch from /api/production/batches
interface SuggestedBatch {
  id: string
  taskType: string
  recipe: string
  recipeType: string
  scheduledDate: string | null
  totalTiers: number
  totalServings: number
  totalButtercreamOz: number
  totalStockQuantityOz: number
  tiers: {
    orderId: number
    customerName: string
    tierId: number
    sizeName: string
    servings: number
    dueDate: string
    dueTime: string | null
    occasion: string | null
    theme: string | null
    colors: string | null
    imageUrl: string | null
    isDelivery: boolean
    tierIndex: number
  }[]
  stockItems: {
    stockTaskId: number
    itemName: string
    quantity: number
    productType: string
  }[]
}

// Unified batch type for display
interface UnifiedBatch {
  id: string
  batchType: string
  recipeName: string
  scheduledDate: string | null
  assignedTo: string | null
  totalTiers: number
  totalServings: number
  totalButtercreamOz: number
  totalStockQuantityOz: number
  tiers: {
    orderId: number
    customerName: string
    tierId: number
    sizeName: string
    servings: number
    dueDate: string
    dueTime: string | null
    occasion: string | null
    theme: string | null
    colors: string | null
    imageUrl: string | null
    isDelivery: boolean
    tierIndex: number
  }[]
  stockItems: {
    id: number
    name: string
    quantity: number
    productType: string
  }[]
}

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  PREP: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  FROST: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  STACK: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  DECORATE: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
}

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekDates(weekStart: string): string[] {
  const monday = new Date(weekStart + 'T12:00:00')
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(getLocalDateString(date))
  }
  return dates
}

export default function PrintWeeklyPage() {
  const [batches, setBatches] = useState<UnifiedBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'day' | 'week'>('week')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [weekStart, setWeekStart] = useState<string>('')
  const [useGrams, setUseGrams] = useState(false)

  // Get week start from URL or default to current week's Monday
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const weekParam = params.get('weekStart')
    const dateParam = params.get('date')

    if (dateParam) {
      // Single day mode
      setMode('day')
      setSelectedDate(dateParam)
      // Derive week start from the date
      const date = new Date(dateParam + 'T12:00:00')
      const dayOfWeek = date.getDay()
      const monday = new Date(date)
      monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      setWeekStart(getLocalDateString(monday))
    } else if (weekParam) {
      setMode('week')
      setWeekStart(weekParam)
      setSelectedDate(weekParam) // Default selected date to Monday
    } else {
      // Default to current week's Monday
      const today = new Date()
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      setWeekStart(getLocalDateString(monday))
      setSelectedDate(getLocalDateString(today))
    }
  }, [])

  const weekDates = useMemo(() => weekStart ? getWeekDates(weekStart) : [], [weekStart])

  // Fetch batches for the week - merge SAVED batches and SCHEDULED stock-only batches
  useEffect(() => {
    if (!weekStart || weekDates.length === 0) return

    const fetchBatches = async () => {
      setLoading(true)
      try {
        // Fetch from both APIs in parallel
        const [savedRes, suggestedRes] = await Promise.all([
          fetch(`/api/production/batches/manage?weekStart=${weekDates[0]}&weekEnd=${weekDates[6]}`),
          fetch(`/api/production/batches?startDate=${weekDates[0]}&endDate=${weekDates[6]}`)
        ])

        const unifiedBatches: UnifiedBatch[] = []
        const addedBatchKeys = new Set<string>()

        // 1. Process saved batches (have actual scheduled dates in ProductionBatch)
        if (savedRes.ok) {
          const data = await savedRes.json()
          const savedBatches = data.batches || []

          for (const batch of savedBatches) {
            if (!batch.scheduledDate) continue

            const batchDate = batch.scheduledDate.split('T')[0]
            if (!weekDates.includes(batchDate)) continue

            const key = `${batch.batchType}-${batch.recipeName}-${batchDate}`
            addedBatchKeys.add(key)

            unifiedBatches.push({
              id: String(batch.id),
              batchType: batch.batchType,
              recipeName: batch.recipeName || 'Unknown',
              scheduledDate: batch.scheduledDate,
              assignedTo: batch.assignedTo,
              totalTiers: batch.totalTiers,
              totalServings: batch.totalServings,
              totalButtercreamOz: Number(batch.totalButtercream) || 0,
              totalStockQuantityOz: (batch.StockProductionTask || []).reduce((sum: number, t: { targetQuantity: number }) => sum + (t.targetQuantity * 6), 0),
              tiers: (batch.ProductionBatchTier || []).map((pbt: {
                CakeTier: {
                  id: number
                  tierIndex: number
                  TierSize: { name: string; servings: number } | null
                  CakeOrder: {
                    id: number
                    customerName: string | null
                    eventDate: string
                    occasion: string | null
                    theme: string | null
                    colors: string | null
                    imageUrl: string | null
                    isDelivery: boolean
                    Customer: { name: string } | null
                  }
                }
              }) => ({
                orderId: pbt.CakeTier.CakeOrder.id,
                customerName: pbt.CakeTier.CakeOrder.Customer?.name || pbt.CakeTier.CakeOrder.customerName || 'Unknown',
                tierId: pbt.CakeTier.id,
                sizeName: pbt.CakeTier.TierSize?.name || 'Unknown',
                servings: pbt.CakeTier.TierSize?.servings || 0,
                dueDate: pbt.CakeTier.CakeOrder.eventDate,
                dueTime: null,
                occasion: pbt.CakeTier.CakeOrder.occasion,
                theme: pbt.CakeTier.CakeOrder.theme,
                colors: pbt.CakeTier.CakeOrder.colors,
                imageUrl: pbt.CakeTier.CakeOrder.imageUrl,
                isDelivery: pbt.CakeTier.CakeOrder.isDelivery,
                tierIndex: pbt.CakeTier.tierIndex
              })),
              stockItems: (batch.StockProductionTask || []).map((task: {
                id: number
                targetQuantity: number
                InventoryItem: { id: number; name: string; productType: string }
              }) => ({
                id: task.id,
                name: task.InventoryItem.name,
                quantity: task.targetQuantity,
                productType: task.InventoryItem.productType
              }))
            })
          }
        }

        // 2. Process suggested batches for STOCK-ONLY items with scheduled dates (not yet saved to ProductionBatch)
        if (suggestedRes.ok) {
          const data = await suggestedRes.json()
          const suggestedBatches = data.batches || []

          for (const batch of suggestedBatches) {
            // Only include stock-only batches (no tiers, only stock items) with a scheduled date
            if (batch.tiers.length > 0) continue // Skip batches with cake tiers (handled by saved batches)
            if (!batch.scheduledDate) continue
            if (batch.stockItems.length === 0) continue

            const batchDate = batch.scheduledDate.split('T')[0]
            if (!weekDates.includes(batchDate)) continue

            const key = `${batch.taskType}-${batch.recipe}-${batchDate}`
            if (addedBatchKeys.has(key)) continue // Already added from saved batches
            addedBatchKeys.add(key)

            unifiedBatches.push({
              id: batch.id,
              batchType: batch.taskType,
              recipeName: batch.recipe,
              scheduledDate: batch.scheduledDate,
              assignedTo: batch.assignedTo,
              totalTiers: 0,
              totalServings: 0,
              totalButtercreamOz: 0,
              totalStockQuantityOz: batch.totalStockQuantityOz || 0,
              tiers: [],
              stockItems: batch.stockItems.map((item: { stockTaskId: number; itemName: string; quantity: number; productType?: string }) => ({
                id: item.stockTaskId,
                name: item.itemName,
                quantity: item.quantity,
                productType: item.productType || 'STOCK'
              }))
            })
          }
        }

        setBatches(unifiedBatches)
      } catch (error) {
        console.error('Failed to fetch batches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBatches()
  }, [weekStart, weekDates])

  // Filter and group batches by date
  const batchesByDate = useMemo(() => {
    const grouped: Record<string, UnifiedBatch[]> = {}

    // Determine which dates to show based on mode
    const datesToShow = mode === 'day' && selectedDate ? [selectedDate] : weekDates

    for (const date of datesToShow) {
      grouped[date] = []
    }
    for (const batch of batches) {
      if (batch.scheduledDate) {
        const dateOnly = batch.scheduledDate.split('T')[0]
        if (grouped[dateOnly]) {
          grouped[dateOnly].push(batch)
        }
      }
    }
    // Sort each day's batches by type
    for (const date of Object.keys(grouped)) {
      grouped[date].sort((a, b) => {
        const typeOrder = ['BAKE', 'PREP', 'FROST', 'STACK', 'DECORATE']
        return typeOrder.indexOf(a.batchType) - typeOrder.indexOf(b.batchType)
      })
    }
    return grouped
  }, [batches, weekDates, mode, selectedDate])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading batches...</div>
      </div>
    )
  }

  const weekEndDate = weekDates[6] || weekDates[0]
  const dateLabel = mode === 'day' && selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : `${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(weekEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - hidden when printing */}
      <div className="print:hidden bg-gray-100 border-b p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/production/batch-planner" className="text-pink-600 hover:text-pink-800">
              &larr; Back to Batch Planner
            </Link>
            <h1 className="text-lg font-bold">Weekly Production Schedule</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'day' | 'week')}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="day">Single Day</option>
                <option value="week">Entire Week</option>
              </select>
            </div>

            {/* Date Selector (when in day mode) */}
            {mode === 'day' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Date:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {weekDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Units Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Units:</span>
              <div className="inline-flex rounded border overflow-hidden">
                <button
                  onClick={() => setUseGrams(false)}
                  className={`px-3 py-1 text-sm ${!useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  oz
                </button>
                <button
                  onClick={() => setUseGrams(true)}
                  className={`px-3 py-1 text-sm ${useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  g
                </button>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">Production Schedule</h1>
          <p className="text-gray-600">{mode === 'day' ? dateLabel : `Week of ${dateLabel}`}</p>
        </div>

        {/* Days */}
        {Object.keys(batchesByDate).sort().map((date, dayIndex) => {
          const dayBatches = batchesByDate[date] || []
          const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })

          // Skip days with no batches
          if (dayBatches.length === 0) return null

          return (
            <div key={date} className={`mb-8 ${dayIndex > 0 ? 'print:break-before-page' : ''}`}>
              {/* Day Header */}
              <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg">
                <h2 className="text-lg font-bold uppercase">{dayName}</h2>
              </div>

              {/* Batches for this day */}
              <div className="border border-t-0 border-gray-300 rounded-b-lg">
                {dayBatches.map((batch, batchIndex) => {
                  const colors = TASK_TYPE_COLORS[batch.batchType] || TASK_TYPE_COLORS.BAKE

                  // Group tiers by order
                  const orderGroups: Record<number, typeof batch.tiers> = {}
                  for (const tier of batch.tiers) {
                    const orderId = tier.orderId
                    if (!orderGroups[orderId]) {
                      orderGroups[orderId] = []
                    }
                    orderGroups[orderId].push(tier)
                  }

                  return (
                    <div
                      key={batch.id}
                      className={`${batchIndex > 0 ? 'border-t border-gray-200' : ''} print:break-inside-avoid`}
                    >
                      {/* Batch Header */}
                      <div className={`${colors.bg} ${colors.border} border-b px-4 py-3`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className={`text-xs font-bold ${colors.text} uppercase mr-2`}>
                              [{batch.batchType}]
                            </span>
                            <span className={`font-bold text-lg ${colors.text}`}>
                              {batch.recipeName}
                            </span>
                          </div>
                          <div className={`${colors.text} font-bold`}>
                            {(() => {
                              // Calculate total oz: servings*2 for BAKE, buttercream for PREP, plus stock for both
                              const baseOz = batch.batchType === 'BAKE'
                                ? batch.totalServings * 2
                                : batch.totalButtercreamOz
                              const totalOz = baseOz + batch.totalStockQuantityOz
                              const totalGrams = totalOz * 28.3495

                              return useGrams
                                ? <>{Math.round(totalGrams)} g ({(totalGrams / 1000).toFixed(2)} kg)</>
                                : <>{Math.round(totalOz)} oz ({(totalOz / 16).toFixed(1)} lbs)</>
                            })()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {batch.totalTiers > 0 && <>{batch.totalTiers} tier{batch.totalTiers !== 1 ? 's' : ''} &bull; {batch.totalServings} servings</>}
                          {batch.totalTiers > 0 && batch.stockItems.length > 0 && <span> + </span>}
                          {batch.stockItems.length > 0 && <span>{batch.stockItems.length} stock item{batch.stockItems.length !== 1 ? 's' : ''}</span>}
                          {batch.assignedTo && <span> &bull; Assigned to: {batch.assignedTo}</span>}
                        </div>
                      </div>

                      {/* Orders in this batch */}
                      <div className="divide-y divide-gray-100">
                        {Object.entries(orderGroups).map(([orderId, tiers]) => {
                          const firstTier = tiers[0]
                          const customerName = firstTier.customerName || 'Unknown'
                          const dueDateStr = firstTier.dueDate
                            ? new Date(firstTier.dueDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'TBD'

                          return (
                            <div key={orderId} className="p-4 flex gap-4 print:break-inside-avoid">
                              {/* Order Image */}
                              <div className="flex-shrink-0">
                                {firstTier.imageUrl ? (
                                  <img
                                    src={firstTier.imageUrl}
                                    alt={`Order ${orderId}`}
                                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <span className="text-3xl text-gray-300">🎂</span>
                                  </div>
                                )}
                              </div>

                              {/* Order Details */}
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-bold text-lg">Order #{orderId}</span>
                                    <span className="text-gray-600 ml-2">{customerName}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-medium ${firstTier.isDelivery ? 'text-blue-600' : 'text-green-600'}`}>
                                      {firstTier.isDelivery ? 'Delivery' : 'Pickup'}
                                    </div>
                                    <div className="text-sm text-red-600 font-medium">
                                      Due: {dueDateStr}
                                    </div>
                                  </div>
                                </div>

                                {/* Occasion & Theme */}
                                {(firstTier.occasion || firstTier.theme) && (
                                  <div className="text-sm text-gray-700 mb-2">
                                    {firstTier.occasion && <span className="font-medium">{firstTier.occasion}</span>}
                                    {firstTier.occasion && firstTier.theme && <span> &bull; </span>}
                                    {firstTier.theme && <span className="italic">{firstTier.theme}</span>}
                                  </div>
                                )}

                                {/* Colors */}
                                {firstTier.colors && (
                                  <div className="flex gap-1 mb-2 flex-wrap">
                                    {firstTier.colors.split(',').map((color, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                        {color.trim()}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Tiers in this order */}
                                <div className="mt-2 space-y-1">
                                  {tiers.map((tier) => (
                                    <div key={tier.tierId} className="text-sm text-gray-600 flex items-center gap-2">
                                      <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                                        {tier.tierIndex + 1}
                                      </span>
                                      <span>{tier.sizeName || 'Unknown size'}</span>
                                      <span className="text-gray-400">&bull;</span>
                                      <span>{tier.servings || 0} servings</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {/* Stock Items */}
                        {batch.stockItems && batch.stockItems.length > 0 && (
                          <div className="p-4 bg-green-50">
                            <div className="font-medium text-green-800 mb-2">Stock Production</div>
                            <div className="grid grid-cols-2 gap-2">
                              {batch.stockItems.map((item) => (
                                <div key={item.id} className="text-sm text-green-700">
                                  {item.name} &times; {item.quantity}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* No batches message */}
        {Object.values(batchesByDate).every(d => d.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No batches scheduled for this {mode === 'day' ? 'day' : 'week'}.
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
