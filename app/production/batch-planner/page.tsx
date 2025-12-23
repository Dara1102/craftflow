'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface TierDetail {
  tierId: number
  orderId: number
  customerName: string
  tierIndex: number
  sizeName: string
  servings: number
  dueDate: string
  dueTime: string | null
  isDelivery: boolean
  // Additional order details
  occasion: string | null
  theme: string | null
  colors: string | null
  imageUrl: string | null
  finishType: string | null
  batterName: string | null
  frostingName: string | null
  // Surface area calculations
  diameterInches: number
  surfaceAreaSqIn: number
  buttercreamOz: number
  complexity: number // 1=light, 2=medium, 3=heavy
}

// Stock production items (cupcakes, cookies, etc.)
interface StockItem {
  stockTaskId: number
  inventoryItemId: number
  itemName: string
  quantity: number
  recipeQuantityOz: number
  scheduledDate: string
  status: string
}

interface RecipeBatch {
  id: string
  taskType: string
  recipe: string
  recipeType: 'batter' | 'filling' | 'frosting' | 'finish'
  scheduledDate: string | null
  tiers: TierDetail[]
  stockItems: StockItem[]
  totalTiers: number
  totalServings: number
  totalSurfaceAreaSqIn: number
  totalButtercreamOz: number
  totalStockQuantityOz: number
  earliestDueDate: string
  assignedTo: string | null
  status: 'unscheduled' | 'scheduled' | 'in_progress' | 'completed'
}

interface ScheduleSuggestion {
  batchId: string
  currentDate: string | null
  suggestedDate: string
  reason: string
}

interface Staff {
  id: number
  name: string
  role: string
}

// Real production batch from database
interface SavedBatch {
  id: number
  name: string
  batchType: 'BAKE' | 'PREP' | 'FROST' | 'STACK' | 'DECORATE'
  recipeName: string | null
  scheduledDate: string | null
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
  assignedTo: string | null
  notes: string | null
  totalTiers: number
  totalServings: number
  totalSurfaceArea: number
  totalButtercream: number
  ProductionBatchTier: {
    id: number
    CakeTier: {
      id: number
      tierIndex: number
      frostingComplexity: number
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
  }[]
  StockProductionTask?: {
    id: number
    taskName: string
    targetQuantity: number
    InventoryItem: {
      id: number
      name: string
      productType: string
    }
  }[]
}

const COMPLEXITY_LABELS: Record<number, string> = {
  1: 'Light',
  2: 'Medium',
  3: 'Heavy'
}

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', light: 'bg-orange-50' },
  PREP: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', light: 'bg-amber-50' },
}

const RECIPE_TYPE_LABELS: Record<string, string> = {
  batter: 'Cake Batter',
  filling: 'Filling',
  frosting: 'Frosting',
  finish: 'Finish',
}

// Helper to get week dates
function getWeekDates(offset: number): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (offset * 7))

  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

export default function BatchPlannerPage() {
  const [batches, setBatches] = useState<RecipeBatch[]>([])
  const [savedBatches, setSavedBatches] = useState<SavedBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [weekOffset, setWeekOffset] = useState(0)
  const [draggedBatch, setDraggedBatch] = useState<RecipeBatch | null>(null)
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [viewMode, setViewMode] = useState<'suggested' | 'saved'>('suggested')
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [creatingBatch, setCreatingBatch] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [applyingSchedule, setApplyingSchedule] = useState(false)
  const [tierSelectionBatch, setTierSelectionBatch] = useState<RecipeBatch | null>(null)
  const [selectedTierIds, setSelectedTierIds] = useState<Set<number>>(new Set())
  const [editingSavedBatch, setEditingSavedBatch] = useState<SavedBatch | null>(null)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  // Fetch batches
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const startDate = weekDates[0]
        const endDate = weekDates[6]

        const [batchesRes, savedBatchesRes, staffRes] = await Promise.all([
          fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/production/batches/manage?weekStart=${startDate}&weekEnd=${endDate}`),
          fetch('/api/staff')
        ])

        if (batchesRes.ok) {
          const data = await batchesRes.json()
          setBatches(data.batches || [])
        }

        if (savedBatchesRes.ok) {
          const savedData = await savedBatchesRes.json()
          setSavedBatches(savedData.batches || [])
        }

        if (staffRes.ok) {
          const staffData = await staffRes.json()
          setStaff(staffData.staff || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [weekDates])

  // Open tier selection modal for creating batch
  const openTierSelectionModal = (suggestedBatch: RecipeBatch) => {
    setTierSelectionBatch(suggestedBatch)
    // Pre-select all tiers by default
    setSelectedTierIds(new Set(suggestedBatch.tiers.map(t => t.tierId)))
  }

  // Create a new batch from suggested batch with selected tiers
  const handleCreateBatch = async (tierIds: number[]) => {
    // Allow creating batch if we have tiers OR stock items
    const hasStockItems = tierSelectionBatch?.stockItems && tierSelectionBatch.stockItems.length > 0
    if (!tierSelectionBatch || (tierIds.length === 0 && !hasStockItems)) return

    setCreatingBatch(true)
    try {
      const res = await fetch('/api/production/batches/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${tierSelectionBatch.recipe} - Week of ${weekDates[0]}`,
          batchType: tierSelectionBatch.taskType,
          recipeName: tierSelectionBatch.recipe,
          scheduledDate: tierSelectionBatch.scheduledDate,
          tierIds: tierIds.length > 0 ? tierIds : undefined,
          // Include stock item IDs so we can link them
          stockTaskIds: tierSelectionBatch.stockItems?.map(s => s.stockTaskId)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSavedBatches(prev => [...prev, data.batch])
        setViewMode('saved')
        setTierSelectionBatch(null)
        setSelectedTierIds(new Set())

        // Refetch suggested batches to remove stock items that are now linked
        const startDate = weekDates[0]
        const endDate = weekDates[6]
        const batchesRes = await fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`)
        if (batchesRes.ok) {
          const batchData = await batchesRes.json()
          setBatches(batchData.batches || [])
        }
      }
    } catch (error) {
      console.error('Failed to create batch:', error)
    } finally {
      setCreatingBatch(false)
    }
  }

  // Remove tiers from a saved batch
  const handleRemoveTiersFromBatch = async (batchId: number, tierIds: number[]) => {
    try {
      const res = await fetch(`/api/production/batches/manage/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierIds })
      })

      if (res.ok) {
        const data = await res.json()
        // If batch now has 0 tiers, remove it from the list
        if (data.batch.totalTiers === 0) {
          setSavedBatches(prev => prev.filter(b => b.id !== batchId))
        } else {
          setSavedBatches(prev => prev.map(b => b.id === batchId ? data.batch : b))
        }
        setEditingSavedBatch(null)
      }
    } catch (error) {
      console.error('Failed to remove tiers from batch:', error)
    }
  }

  // Delete a saved batch
  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm('Are you sure you want to delete this batch?')) return

    try {
      const res = await fetch(`/api/production/batches/manage/${batchId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setSavedBatches(prev => prev.filter(b => b.id !== batchId))
      }
    } catch (error) {
      console.error('Failed to delete batch:', error)
    }
  }

  // Update a saved batch (schedule, status)
  const handleUpdateSavedBatch = async (batchId: number, updates: Partial<SavedBatch>) => {
    try {
      const res = await fetch('/api/production/batches/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: batchId, ...updates })
      })

      if (res.ok) {
        const data = await res.json()
        const updatedBatch = data.batch

        // Update the local state
        setSavedBatches(prev => {
          const newBatches = prev.map(b => b.id === batchId ? updatedBatch : b)

          // Check if there are any remaining DRAFT batches
          const draftBatches = newBatches.filter(b => b.status === 'DRAFT')
          if (draftBatches.length === 0 && viewMode === 'saved') {
            // Auto-redirect to suggested view when no more drafts
            setTimeout(() => setViewMode('suggested'), 100)
          }

          return newBatches
        })

        // Refetch suggested batches to update date stats
        const startDate = weekDates[0]
        const endDate = weekDates[6]
        const batchesRes = await fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`)
        if (batchesRes.ok) {
          const batchData = await batchesRes.json()
          setBatches(batchData.batches || [])
        }
      }
    } catch (error) {
      console.error('Failed to update batch:', error)
    }
  }

  // Auto-schedule handler
  const handleAutoSchedule = async () => {
    try {
      const res = await fetch('/api/production/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: weekDates[0],
          endDate: weekDates[6]
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Failed to get auto-schedule suggestions:', error)
    }
  }

  // Apply all suggestions
  const handleApplyAllSuggestions = async () => {
    setApplyingSchedule(true)
    try {
      // Update each batch with suggested date
      const updates = suggestions.map(s => ({
        batchId: s.batchId,
        scheduledDate: s.suggestedDate
      }))

      // For now, update locally (would need a batch update API endpoint)
      setBatches(prev => prev.map(batch => {
        const suggestion = suggestions.find(s => s.batchId === batch.id)
        if (suggestion) {
          return { ...batch, scheduledDate: suggestion.suggestedDate, status: 'scheduled' as const }
        }
        return batch
      }))

      setShowSuggestions(false)
      setSuggestions([])
    } catch (error) {
      console.error('Failed to apply schedule:', error)
    } finally {
      setApplyingSchedule(false)
    }
  }

  // Drag handlers
  const handleDragStart = (batch: RecipeBatch) => {
    setDraggedBatch(batch)
  }

  const handleDragEnd = () => {
    setDraggedBatch(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetDate: string) => {
    if (!draggedBatch) return

    // Update batch schedule locally
    setBatches(prev => prev.map(b =>
      b.id === draggedBatch.id
        ? { ...b, scheduledDate: targetDate, status: 'scheduled' as const }
        : b
    ))

    setDraggedBatch(null)
  }

  // Filter batches
  const filteredBatches = useMemo(() => {
    if (filterType === 'all') return batches
    return batches.filter(b => b.taskType === filterType)
  }, [batches, filterType])

  // Group by status for display
  const unscheduledBatches = filteredBatches.filter(b => b.status === 'unscheduled' || !b.scheduledDate)
  const scheduledByDate = useMemo(() => {
    const grouped: Record<string, RecipeBatch[]> = {}
    for (const date of weekDates) {
      grouped[date] = filteredBatches.filter(b => {
        if (!b.scheduledDate) return false
        // Normalize to YYYY-MM-DD for comparison
        return b.scheduledDate.split('T')[0] === date
      })
    }
    return grouped
  }, [filteredBatches, weekDates])

  // Batches scheduled outside current week view
  const otherWeekBatches = filteredBatches.filter(b => {
    if (!b.scheduledDate) return false
    const dateOnly = b.scheduledDate.split('T')[0]
    return !weekDates.includes(dateOnly)
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
  }

  const getWeekLabel = () => {
    const start = new Date(weekDates[0] + 'T12:00:00')
    const end = new Date(weekDates[6] + 'T12:00:00')
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  const getDateStats = (date: string) => {
    // Count suggested batches scheduled for this date
    const suggestedDayBatches = filteredBatches.filter(b => {
      if (!b.scheduledDate) return false
      return b.scheduledDate.split('T')[0] === date
    })
    // Count saved batches scheduled for this date
    const savedDayBatches = savedBatches.filter(b => {
      if (!b.scheduledDate) return false
      return b.scheduledDate.split('T')[0] === date
    })
    const totalSuggestedTiers = suggestedDayBatches.reduce((sum, b) => sum + b.totalTiers, 0)
    const totalSavedTiers = savedDayBatches.reduce((sum, b) => sum + b.totalTiers, 0)
    return {
      count: suggestedDayBatches.length + savedDayBatches.length,
      tiers: totalSuggestedTiers + totalSavedTiers,
      saved: savedDayBatches.length
    }
  }

  // Get unique order IDs from tiers
  const getOrderIds = (tiers: TierDetail[]) => {
    return [...new Set(tiers.map(t => t.orderId))]
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white shadow-md">
        {/* Title Bar */}
        <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Batch Planner</h1>
            <p className="text-sm text-gray-500">Recipe-centric batch scheduling</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('suggested')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'suggested'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Suggested ({batches.length})
              </button>
              <button
                onClick={() => setViewMode('saved')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'saved'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Drafts ({savedBatches.filter(b => b.status === 'DRAFT').length})
              </button>
            </div>
            <button
              onClick={handleAutoSchedule}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium text-sm"
            >
              ✨ Auto-Schedule
            </button>
            <Link
              href="/production/batch-builder"
              className="text-sm text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg"
            >
              Try New Builder →
            </Link>
            <Link
              href="/production"
              className="text-pink-600 hover:text-pink-800 text-sm"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            ← Prev Week
          </button>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">{getWeekLabel()}</span>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-pink-600 hover:text-pink-800"
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Next Week →
          </button>
        </div>

        {/* Date Strip - Drop Targets */}
        <div className="px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex gap-2">
            {weekDates.map(date => {
              const stats = getDateStats(date)
              const isToday = date === new Date().toISOString().split('T')[0]
              const isPast = date < new Date().toISOString().split('T')[0]
              return (
                <div
                  key={date}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(date)}
                  className={`flex-1 p-2 rounded-lg border-2 transition-all text-center ${
                    isToday
                      ? 'border-pink-500 bg-pink-50'
                      : isPast
                      ? 'border-gray-200 bg-gray-100 opacity-60'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  } ${draggedBatch ? 'hover:border-pink-400 hover:bg-pink-50 hover:scale-105' : ''}`}
                >
                  <div className={`font-semibold text-sm ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {formatShortDate(date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.count} batch{stats.count !== 1 ? 'es' : ''} • {stats.tiers} tier{stats.tiers !== 1 ? 's' : ''}
                    {stats.saved > 0 && <span className="text-green-600 ml-1">({stats.saved} saved)</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All ({batches.length})
            </button>
            {Object.keys(TASK_TYPE_COLORS).map(type => {
              const colors = TASK_TYPE_COLORS[type]
              const count = batches.filter(b => b.taskType === type).length
              if (count === 0) return null
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterType === type
                      ? `${colors.bg} ${colors.text} ring-2 ring-offset-1`
                      : `${colors.bg} ${colors.text} opacity-70 hover:opacity-100`
                  }`}
                >
                  {type} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Auto-Schedule Suggestions Modal */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 bg-pink-50 border-b border-pink-200">
              <h2 className="text-lg font-bold text-gray-900">Auto-Schedule Suggestions</h2>
              <p className="text-sm text-gray-600">Review and apply the suggested schedule</p>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {suggestions.map(suggestion => {
                  const batch = batches.find(b => b.id === suggestion.batchId)
                  if (!batch) return null
                  const colors = TASK_TYPE_COLORS[batch.taskType] || TASK_TYPE_COLORS.BAKE
                  return (
                    <div key={suggestion.batchId} className={`${colors.light} rounded-lg p-3 border ${colors.border}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`font-bold ${colors.text}`}>{batch.taskType}</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="font-medium">{batch.recipe}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-700">
                            → {formatDate(suggestion.suggestedDate)}
                          </div>
                          <div className="text-xs text-gray-500">{suggestion.reason}</div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {batch.totalTiers} tiers • {batch.totalServings} servings
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSuggestions(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAllSuggestions}
                disabled={applyingSchedule}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {applyingSchedule ? 'Applying...' : 'Apply All Suggestions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 max-w-full mx-auto">
        {/* View Mode: Suggested Batches */}
        {viewMode === 'suggested' && (
          <div className="flex gap-6">
            {/* Left Sidebar - Unscheduled Batches (Sticky) */}
            <div className="w-80 flex-shrink-0">
              <div className="sticky top-[220px]">
                {/* Explanation */}
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Drag batches to dates above, or click &quot;Edit Batch&quot; to create.
                  </p>
                </div>

                {/* Unscheduled Batches */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-yellow-100 border-b border-yellow-200">
                    <h2 className="font-bold text-yellow-800 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                      Unscheduled ({unscheduledBatches.length})
                    </h2>
                  </div>
                  <div className="p-3 max-h-[calc(100vh-350px)] overflow-y-auto space-y-3">
                    {unscheduledBatches.length === 0 ? (
                      <p className="text-sm text-yellow-700 text-center py-4">All batches scheduled!</p>
                    ) : (
                      unscheduledBatches.map(batch => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedBatch?.id === batch.id}
                          onSelect={openTierSelectionModal}
                          getOrderIds={getOrderIds}
                          onEdit={openTierSelectionModal}
                          isSaving={creatingBatch}
                          compact
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Batches in Other Weeks */}
                {otherWeekBatches.length > 0 && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-blue-100 border-b border-blue-200">
                      <h2 className="font-semibold text-blue-800 text-sm">
                        Other Weeks ({otherWeekBatches.length})
                      </h2>
                    </div>
                    <div className="p-3 max-h-40 overflow-y-auto space-y-2">
                      {otherWeekBatches.map(batch => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedBatch?.id === batch.id}
                          onSelect={openTierSelectionModal}
                          getOrderIds={getOrderIds}
                          showScheduledDate
                          onEdit={openTierSelectionModal}
                          isSaving={creatingBatch}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content - Scheduled Batches */}
            <div className="flex-1 min-w-0">
              {/* Scheduled Section Header */}
              <div className="mb-4 bg-green-600 text-white rounded-lg px-6 py-4 shadow-lg">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  Scheduled This Week
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  {Object.values(scheduledByDate).flat().length} batches scheduled across {weekDates.filter(d => (scheduledByDate[d] || []).length > 0).length} days
                </p>
              </div>

              {/* Scheduled by Day */}
              <div className="space-y-4">
                {weekDates.map(date => {
                  const dayBatches = scheduledByDate[date] || []
                  // Also include saved batches scheduled for this date
                  const savedDayBatches = savedBatches.filter(b => b.scheduledDate?.split('T')[0] === date)
                  const totalBatches = dayBatches.length + savedDayBatches.length

                  if (totalBatches === 0) return null

                  const isToday = date === new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={date}
                      className={`bg-white shadow rounded-lg overflow-hidden ${isToday ? 'ring-2 ring-pink-400' : ''}`}
                    >
                      <div className={`px-4 py-3 border-b ${isToday ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                          <h2 className={`font-bold text-lg ${isToday ? 'text-pink-700' : 'text-gray-900'}`}>
                            {formatDate(date)}
                            {isToday && <span className="ml-2 text-xs font-medium bg-pink-600 text-white px-2 py-0.5 rounded">TODAY</span>}
                          </h2>
                          <span className="text-sm text-gray-500">
                            {totalBatches} batch{totalBatches !== 1 ? 'es' : ''} • {dayBatches.reduce((s, b) => s + b.totalTiers, 0) + savedDayBatches.reduce((s, b) => s + b.totalTiers, 0)} tiers
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Suggested batches for this day */}
                          {dayBatches.map(batch => (
                            <BatchCard
                              key={batch.id}
                              batch={batch}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              isDragging={draggedBatch?.id === batch.id}
                              onSelect={openTierSelectionModal}
                              getOrderIds={getOrderIds}
                              onEdit={openTierSelectionModal}
                              isSaving={creatingBatch}
                            />
                          ))}
                          {/* Saved batches for this day */}
                          {savedDayBatches.map(batch => (
                            <SavedBatchCard
                              key={`saved-${batch.id}`}
                              batch={batch}
                              onDelete={handleDeleteBatch}
                              onUpdate={handleUpdateSavedBatch}
                              onEditTiers={setEditingSavedBatch}
                              weekDates={weekDates}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {Object.values(scheduledByDate).flat().length === 0 && savedBatches.filter(b => weekDates.includes(b.scheduledDate?.split('T')[0] || '')).length === 0 && (
                <div className="bg-white shadow rounded-lg p-12 text-center">
                  <p className="text-gray-500 mb-2">No batches scheduled for this week yet</p>
                  <p className="text-sm text-gray-400">Drag batches from the sidebar to schedule them</p>
                </div>
              )}
            </div>
          </div>
        )}

        {batches.length === 0 && viewMode === 'suggested' && (
          <div className="bg-white shadow rounded-lg p-12 text-center mt-6">
            <p className="text-gray-500">No batches found for this week</p>
            <Link
              href="/production/prep"
              className="text-pink-600 hover:text-pink-800 mt-2 inline-block"
            >
              Go to Prep Review to generate tasks
            </Link>
          </div>
        )}

        {/* View Mode: Saved Batches */}
        {viewMode === 'saved' && (
          <>
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-1">Saved Production Batches</h3>
              <p className="text-sm text-green-700">
                These are your confirmed batches for this week. You can add/remove tiers and schedule them.
              </p>
            </div>

            {savedBatches.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <p className="text-gray-500 mb-4">No saved batches yet</p>
                <p className="text-sm text-gray-400 mb-4">
                  Switch to &quot;Suggested&quot; view and click &quot;Save Batch&quot; to create production batches
                </p>
                <button
                  onClick={() => setViewMode('suggested')}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  View Suggested Batches
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group saved batches by status */}
                {['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map(status => {
                  const statusBatches = savedBatches.filter(b => b.status === status)
                  if (statusBatches.length === 0) return null

                  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                    DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
                    SCHEDULED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                    IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                    COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                  }
                  const colors = statusColors[status]

                  return (
                    <div key={status} className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                      <h3 className={`font-semibold ${colors.text} mb-3`}>
                        {status.replace('_', ' ')} ({statusBatches.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {statusBatches.map(batch => (
                          <SavedBatchCard
                            key={batch.id}
                            batch={batch}
                            onDelete={handleDeleteBatch}
                            onUpdate={handleUpdateSavedBatch}
                            onEditTiers={setEditingSavedBatch}
                            weekDates={weekDates}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Task Type Definitions */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Batch Types</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                <span className="font-semibold text-orange-800">BAKE</span>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Make cake batter & bake layers.</strong> Batched by batter flavor (Vanilla, Chocolate).
                Includes both custom order tiers AND pre-made products (cupcakes, etc.).
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="font-semibold text-amber-800">PREP</span>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Make buttercream & fillings.</strong> Batched by recipe (Vanilla Buttercream, etc.).
                Includes filling, frosting, AND pre-made products needing this recipe.
              </p>
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div className="mt-4 bg-white shadow rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">How Recipe Batching Works</h4>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Each card represents one <strong>recipe batch</strong> (e.g., "Vanilla Buttercream") across multiple orders</li>
            <li>• <strong>Click a card</strong> or the <strong>Edit Batch</strong> button to select which orders/tiers to include</li>
            <li>• In the edit modal, check/uncheck orders to add or remove them from the batch</li>
            <li>• <strong>Drag</strong> any batch card to a date in the header to schedule it</li>
            <li>• Click <strong>Auto-Schedule</strong> to get optimal scheduling suggestions based on due dates</li>
            <li>• <strong>Hover</strong> over a card to see order details, colors, and design image</li>
          </ul>
        </div>
      </div>

      {/* Tier Selection Modal - for creating/editing batches */}
      {tierSelectionBatch && (
        <TierSelectionModal
          batch={tierSelectionBatch}
          selectedTierIds={selectedTierIds}
          onToggleTier={(tierId) => {
            setSelectedTierIds(prev => {
              const next = new Set(prev)
              if (next.has(tierId)) {
                next.delete(tierId)
              } else {
                next.add(tierId)
              }
              return next
            })
          }}
          onSelectAll={() => setSelectedTierIds(new Set(tierSelectionBatch.tiers.map(t => t.tierId)))}
          onSelectNone={() => setSelectedTierIds(new Set())}
          onClose={() => {
            setTierSelectionBatch(null)
            setSelectedTierIds(new Set())
          }}
          onSave={() => handleCreateBatch(Array.from(selectedTierIds))}
          isSaving={creatingBatch}
        />
      )}

      {/* Edit Saved Batch Modal - for removing tiers from existing batches */}
      {editingSavedBatch && (
        <EditSavedBatchModal
          batch={editingSavedBatch}
          onClose={() => setEditingSavedBatch(null)}
          onRemoveTiers={(tierIds) => handleRemoveTiersFromBatch(editingSavedBatch.id, tierIds)}
        />
      )}
    </div>
  )
}

// Batch Card Component
function BatchCard({
  batch,
  onDragStart,
  onDragEnd,
  isDragging,
  onSelect,
  getOrderIds,
  showScheduledDate = false,
  onEdit,
  isSaving = false,
}: {
  batch: RecipeBatch
  onDragStart: (batch: RecipeBatch) => void
  onDragEnd: () => void
  isDragging: boolean
  onSelect: (batch: RecipeBatch) => void
  getOrderIds: (tiers: TierDetail[]) => number[]
  showScheduledDate?: boolean
  onEdit?: (batch: RecipeBatch) => void
  isSaving?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const colors = TASK_TYPE_COLORS[batch.taskType] || TASK_TYPE_COLORS.BAKE
  const orderIds = getOrderIds(batch.tiers)
  // earliestDueDate comes from the API - find actual earliest from tiers if available
  const tierDueDates = batch.tiers.map(t => new Date(t.dueDate).getTime())
  const earliestTierDate = tierDueDates.length > 0 ? new Date(Math.min(...tierDueDates)) : null
  const dueDate = earliestTierDate || new Date(batch.earliestDueDate.split('T')[0] + 'T12:00:00')
  const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Get unique occasions/themes from tiers
  const occasions = [...new Set(batch.tiers.map(t => t.occasion).filter(Boolean))]
  const themes = [...new Set(batch.tiers.map(t => t.theme).filter(Boolean))]
  const allColors = [...new Set(batch.tiers.map(t => t.colors).filter(Boolean))]

  // Get first image if any
  const firstImage = batch.tiers.find(t => t.imageUrl)?.imageUrl

  return (
    <div
      draggable
      onDragStart={() => onDragStart(batch)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(batch)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`${colors.bg} rounded-lg p-3 border ${colors.border} cursor-grab active:cursor-grabbing hover:shadow-lg transition-all relative ${
        isDragging ? 'opacity-50 ring-2 ring-pink-400 scale-95' : ''
      } ${batch.status === 'completed' ? 'opacity-60' : ''}`}
    >
      {/* Tooltip on hover */}
      {showTooltip && batch.tiers.length > 0 && (
        <div className="absolute z-30 left-full ml-2 top-0 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none">
          <div className="font-semibold mb-2">{batch.taskType}: {batch.recipe}</div>
          {firstImage && (
            <div className="mb-2 rounded overflow-hidden bg-gray-800">
              <img src={firstImage} alt="Design" className="w-full h-20 object-cover" />
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {batch.tiers.slice(0, 5).map((tier, idx) => (
              <div key={`${tier.orderId}-${tier.tierIndex}-${idx}`} className="border-t border-gray-700 pt-1.5 first:border-0 first:pt-0">
                <div className="flex justify-between">
                  <span className="font-medium">#{tier.orderId} {tier.customerName}</span>
                  <span className="text-gray-400">{tier.sizeName}</span>
                </div>
                {(batch.taskType === 'PREP' || batch.taskType === 'FROST') && (
                  <div className="text-gray-400 text-[10px]">
                    {tier.diameterInches}&quot; dia • {tier.surfaceAreaSqIn} sq in • {tier.buttercreamOz} oz
                  </div>
                )}
                {tier.occasion && <div className="text-gray-300">{tier.occasion}</div>}
                {tier.theme && <div className="text-gray-400 italic">{tier.theme}</div>}
                {tier.colors && (
                  <div className="flex gap-1 mt-1">
                    {tier.colors.split(',').slice(0, 4).map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {batch.tiers.length > 5 && (
              <div className="text-gray-400 text-center">+{batch.tiers.length - 5} more...</div>
            )}
          </div>
        </div>
      )}

      {/* Mini image thumbnail if available */}
      {firstImage && (
        <div className="absolute top-2 right-2 w-8 h-8 rounded overflow-hidden border border-white/50 shadow-sm">
          <img src={firstImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header: Task Type + Recipe */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-semibold ${colors.text} uppercase`}>
            {batch.taskType}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {RECIPE_TYPE_LABELS[batch.recipeType] || batch.recipeType}
        </div>
      </div>

      {/* Recipe Name */}
      <div className={`font-bold ${colors.text} text-lg leading-tight mb-1`}>
        {batch.recipe}
      </div>

      {/* Occasion/Theme hint */}
      {occasions.length > 0 && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          {occasions.slice(0, 2).join(', ')}{occasions.length > 2 ? '...' : ''}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm mb-2">
        <span className="font-semibold">
          {batch.totalTiers} tier{batch.totalTiers !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-600">
          {batch.totalServings} srv
        </span>
      </div>

      {/* Yield info for PREP */}
      {batch.taskType === 'PREP' && (batch.totalButtercreamOz > 0 || batch.totalStockQuantityOz > 0) && (
        <div className="text-xs bg-white/50 rounded px-2 py-1 mb-2">
          <span className="font-medium text-gray-700">Total Yield: </span>
          <span className="text-gray-600">
            {Math.round((batch.totalButtercreamOz + (batch.totalStockQuantityOz || 0)) * 10) / 10} oz
            ({Math.round((batch.totalButtercreamOz + (batch.totalStockQuantityOz || 0)) / 16 * 10) / 10} lb)
          </span>
        </div>
      )}

      {/* Orders */}
      <div className="text-xs text-gray-600 mb-2">
        {orderIds.length > 0 && (
          <span>Orders: {orderIds.slice(0, 3).map(id => `#${id}`).join(', ')}{orderIds.length > 3 ? '...' : ''}</span>
        )}
      </div>

      {/* Stock items */}
      {batch.stockItems && batch.stockItems.length > 0 && (
        <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2">
          <span className="font-medium">Stock: </span>
          {batch.stockItems.slice(0, 2).map((item, i) => (
            <span key={item.stockTaskId}>
              {i > 0 && ', '}
              {item.itemName} x{item.quantity}
            </span>
          ))}
          {batch.stockItems.length > 2 && <span>...</span>}
        </div>
      )}

      {/* Color chips if available */}
      {allColors.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {allColors.slice(0, 2).flatMap(c => c?.split(',').slice(0, 2) || []).slice(0, 4).map((color, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-white/60 rounded text-[10px] text-gray-700">
              {color.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Due Date & Scheduled Date */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
        <div>
          <span className="text-xs text-red-600 font-medium">
            Due: {dueDateStr}
          </span>
          {showScheduledDate && batch.scheduledDate && (
            <div className="text-xs text-blue-600 font-medium mt-0.5">
              Sched: {new Date(batch.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
        {batch.assignedTo && (
          <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
            {batch.assignedTo}
          </span>
        )}
      </div>

      {/* Edit Batch button */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(batch)
          }}
          disabled={isSaving}
          className="mt-2 w-full px-2 py-1.5 bg-pink-600 text-white text-xs rounded hover:bg-pink-700 disabled:opacity-50 font-medium"
        >
          {isSaving ? 'Saving...' : 'Edit Batch'}
        </button>
      )}

      {/* Status indicator */}
      {batch.status === 'in_progress' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          In Progress
        </div>
      )}
      {batch.status === 'completed' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <span>✓</span> Completed
        </div>
      )}
    </div>
  )
}

// Batch Detail Modal
function BatchDetailModal({
  batch,
  staff,
  onClose,
  onUpdate,
  getOrderIds,
}: {
  batch: RecipeBatch
  staff: Staff[]
  onClose: () => void
  onUpdate: (batch: RecipeBatch) => void
  getOrderIds: (tiers: TierDetail[]) => number[]
}) {
  const [selectedStaff, setSelectedStaff] = useState(batch.assignedTo || '')
  const colors = TASK_TYPE_COLORS[batch.taskType] || TASK_TYPE_COLORS.BAKE

  const handleAssign = () => {
    onUpdate({ ...batch, assignedTo: selectedStaff || null })
  }

  // Group tiers by order
  const tiersByOrder: Record<number, TierDetail[]> = {}
  for (const tier of batch.tiers) {
    if (!tiersByOrder[tier.orderId]) {
      tiersByOrder[tier.orderId] = []
    }
    tiersByOrder[tier.orderId].push(tier)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 ${colors.light} border-b ${colors.border}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                {batch.taskType}
              </span>
              <h2 className={`text-xl font-bold ${colors.text}`}>{batch.recipe}</h2>
              <p className="text-sm text-gray-600">{RECIPE_TYPE_LABELS[batch.recipeType]}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{batch.totalTiers}</div>
              <div className="text-xs text-gray-500">Tiers</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{batch.totalServings}</div>
              <div className="text-xs text-gray-500">Servings</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{Object.keys(tiersByOrder).length}</div>
              <div className="text-xs text-gray-500">Orders</div>
            </div>
          </div>

          {/* Yield Summary for PREP/FROST */}
          {(batch.taskType === 'PREP' || batch.taskType === 'FROST') && batch.totalButtercreamOz > 0 && (
            <div className={`mb-6 p-3 rounded-lg ${colors.light} border ${colors.border}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">Estimated Yield Needed</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className={`text-xl font-bold ${colors.text}`}>{batch.totalButtercreamOz}</div>
                  <div className="text-xs text-gray-500">Ounces</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${colors.text}`}>
                    {Math.round(batch.totalButtercreamOz / 16 * 10) / 10}
                  </div>
                  <div className="text-xs text-gray-500">Pounds</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${colors.text}`}>{batch.totalSurfaceAreaSqIn}</div>
                  <div className="text-xs text-gray-500">Sq Inches</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Based on medium complexity (2x). Actual may vary by design.
              </div>
            </div>
          )}

          {/* Assignment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <div className="flex gap-2">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">Unassigned</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
              >
                Assign
              </button>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Included Orders</h3>
            <div className="space-y-3">
              {Object.entries(tiersByOrder).map(([orderId, tiers]) => {
                const firstTier = tiers[0]
                const dueDate = new Date(firstTier.dueDate)
                const dueDateStr = dueDate.toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric'
                })

                return (
                  <div key={orderId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link
                          href={`/orders/${orderId}`}
                          className="font-semibold text-pink-600 hover:text-pink-800"
                        >
                          Order #{orderId}
                        </Link>
                        <span className="ml-2 text-sm text-gray-600">{firstTier.customerName}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-medium text-red-600">Due {dueDateStr}</div>
                        <div className="text-gray-500">
                          {firstTier.isDelivery ? '🚚 Delivery' : '🏪 Pickup'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {tiers.map(t => (
                        <div key={t.tierId} className="flex justify-between items-center">
                          <span>
                            Tier {t.tierIndex + 1}: {t.sizeName} ({t.servings} srv)
                          </span>
                          {(batch.taskType === 'PREP' || batch.taskType === 'FROST') && (
                            <span className="text-xs text-gray-400">
                              {t.diameterInches}&quot; • {t.buttercreamOz} oz
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <div className="text-sm text-gray-500">
            {batch.scheduledDate
              ? `Scheduled: ${new Date(batch.scheduledDate + 'T12:00:00').toLocaleDateString()}`
              : 'Not scheduled'
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Saved Batch Card Component (for real database batches)
function SavedBatchCard({
  batch,
  onDelete,
  onUpdate,
  onEditTiers,
  weekDates,
}: {
  batch: SavedBatch
  onDelete: (id: number) => void
  onUpdate: (id: number, updates: Partial<SavedBatch>) => void
  onEditTiers: (batch: SavedBatch) => void
  weekDates: string[]
}) {
  const [showScheduler, setShowScheduler] = useState(false)
  const colors = TASK_TYPE_COLORS[batch.batchType] || TASK_TYPE_COLORS.BAKE

  // Normalize scheduledDate to YYYY-MM-DD format for display and comparison
  const getDateOnly = (dateStr: string | null): string | null => {
    if (!dateStr) return null
    // Handle both "2025-12-22" and "2025-12-22T00:00:00.000Z" formats
    return dateStr.split('T')[0]
  }
  const scheduledDateOnly = getDateOnly(batch.scheduledDate)

  // Count unique orders
  const orderIds = [...new Set(batch.ProductionBatchTier.map(bt => bt.CakeTier.CakeOrder.id))]

  // Get first image if any
  const firstImage = batch.ProductionBatchTier.find(bt => bt.CakeTier.CakeOrder.imageUrl)?.CakeTier.CakeOrder.imageUrl

  // Get earliest due date
  const dueDates = batch.ProductionBatchTier.map(bt => new Date(bt.CakeTier.CakeOrder.eventDate))
  const earliestDue = dueDates.length > 0 ? new Date(Math.min(...dueDates.map(d => d.getTime()))) : null

  return (
    <div
      onClick={() => onEditTiers(batch)}
      className={`${colors.bg} rounded-lg p-3 border ${colors.border} hover:shadow-lg transition-all relative cursor-pointer`}
    >
      {/* Mini image thumbnail if available */}
      {firstImage && (
        <div className="absolute top-2 right-2 w-8 h-8 rounded overflow-hidden border border-white/50 shadow-sm">
          <img src={firstImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-semibold ${colors.text} uppercase`}>
          {batch.batchType}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(batch.id); }}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="Delete batch"
        >
          ×
        </button>
      </div>

      {/* Batch Name */}
      <div className={`font-bold ${colors.text} text-lg leading-tight mb-1`}>
        {batch.recipeName || batch.name}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm mb-2">
        <span className="font-semibold">
          {batch.totalTiers} tier{batch.totalTiers !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-600">
          {batch.totalServings} srv
        </span>
      </div>

      {/* Yield info for PREP */}
      {batch.batchType === 'PREP' && batch.totalButtercream > 0 && (
        <div className="text-xs bg-white/50 rounded px-2 py-1 mb-2">
          <span className="font-medium text-gray-700">Yield: </span>
          <span className="text-gray-600">
            {batch.totalButtercream} oz ({Math.round(Number(batch.totalButtercream) / 16 * 10) / 10} lb)
          </span>
        </div>
      )}

      {/* Orders */}
      {orderIds.length > 0 && (
        <div className="text-xs text-gray-600 mb-2">
          Orders: {orderIds.slice(0, 4).map(id => `#${id}`).join(', ')}{orderIds.length > 4 ? '...' : ''}
        </div>
      )}

      {/* Stock items */}
      {batch.StockProductionTask && batch.StockProductionTask.length > 0 && (
        <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2">
          <span className="font-medium">Stock: </span>
          {batch.StockProductionTask.slice(0, 2).map((task, i) => (
            <span key={task.id}>
              {i > 0 && ', '}
              {task.InventoryItem.name} x{task.targetQuantity}
            </span>
          ))}
          {batch.StockProductionTask.length > 2 && <span>...</span>}
        </div>
      )}

      {/* Schedule controls */}
      {showScheduler ? (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <select
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            value={scheduledDateOnly || ''}
            onChange={(e) => {
              onUpdate(batch.id, {
                scheduledDate: e.target.value || null,
                status: e.target.value ? 'SCHEDULED' : 'DRAFT'
              } as Partial<SavedBatch>)
              setShowScheduler(false)
            }}
          >
            <option value="">Unscheduled</option>
            {weekDates.map(date => (
              <option key={date} value={date}>
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowScheduler(false)}
            className="w-full px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
          <div>
            {earliestDue && (
              <span className="text-xs text-red-600 font-medium">
                Due: {earliestDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {scheduledDateOnly && (
              <div className="text-xs text-blue-600 font-medium">
                Sched: {new Date(scheduledDateOnly + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowScheduler(true); }}
            className="text-xs text-pink-600 hover:text-pink-800 font-medium"
          >
            {scheduledDateOnly ? 'Reschedule' : 'Schedule'}
          </button>
        </div>
      )}

      {/* Status indicator */}
      {batch.status === 'IN_PROGRESS' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          In Progress
        </div>
      )}
      {batch.status === 'COMPLETED' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
          <span>✓</span> Completed
        </div>
      )}
    </div>
  )
}

// Tier Selection Modal - for choosing which orders/tiers to include when saving
function TierSelectionModal({
  batch,
  selectedTierIds,
  onToggleTier,
  onSelectAll,
  onSelectNone,
  onClose,
  onSave,
  isSaving,
}: {
  batch: RecipeBatch
  selectedTierIds: Set<number>
  onToggleTier: (tierId: number) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onClose: () => void
  onSave: () => void
  isSaving: boolean
}) {
  const colors = TASK_TYPE_COLORS[batch.taskType] || TASK_TYPE_COLORS.BAKE

  // Group tiers by order
  const tiersByOrder: Record<number, TierDetail[]> = {}
  for (const tier of batch.tiers) {
    if (!tiersByOrder[tier.orderId]) {
      tiersByOrder[tier.orderId] = []
    }
    tiersByOrder[tier.orderId].push(tier)
  }

  // Sort orders by due date
  const sortedOrders = Object.entries(tiersByOrder).sort((a, b) => {
    const dateA = new Date(a[1][0].dueDate).getTime()
    const dateB = new Date(b[1][0].dueDate).getTime()
    return dateA - dateB
  })

  // Calculate totals for selected tiers
  const selectedTiers = batch.tiers.filter(t => selectedTierIds.has(t.tierId))
  const totalServings = selectedTiers.reduce((sum, t) => sum + t.servings, 0)
  const totalButtercream = selectedTiers.reduce((sum, t) => sum + t.buttercreamOz, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 ${colors.light} border-b ${colors.border} flex-shrink-0`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                {batch.taskType}
              </span>
              <h2 className={`text-xl font-bold ${colors.text}`}>{batch.recipe}</h2>
              <p className="text-sm text-gray-600">Select orders/tiers to include in this batch</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Selection controls */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Select All
            </button>
            <button
              onClick={onSelectNone}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Select None
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{selectedTierIds.size}</span> of {batch.tiers.length} tiers selected
          </div>
        </div>

        {/* Content - Orders with checkboxes */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4">
            {sortedOrders.map(([orderId, tiers]) => {
              const firstTier = tiers[0]
              const dueDate = new Date(firstTier.dueDate)
              const dueDateStr = dueDate.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })
              const allSelected = tiers.every(t => selectedTierIds.has(t.tierId))
              const someSelected = tiers.some(t => selectedTierIds.has(t.tierId))

              return (
                <div key={orderId} className={`rounded-lg border p-4 ${
                  allSelected ? 'bg-pink-50 border-pink-200' :
                  someSelected ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  {/* Order header with master checkbox */}
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        // Toggle all tiers for this order
                        tiers.forEach(t => {
                          if (allSelected) {
                            if (selectedTierIds.has(t.tierId)) onToggleTier(t.tierId)
                          } else {
                            if (!selectedTierIds.has(t.tierId)) onToggleTier(t.tierId)
                          }
                        })
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-900">Order #{orderId}</span>
                          <span className="ml-2 text-gray-600">{firstTier.customerName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600 text-sm">Due {dueDateStr}</div>
                          <div className="text-xs text-gray-500">
                            {firstTier.isDelivery ? 'Delivery' : 'Pickup'}
                          </div>
                        </div>
                      </div>
                      {(firstTier.occasion || firstTier.theme) && (
                        <div className="text-sm text-gray-500 mt-1">
                          {firstTier.occasion}{firstTier.occasion && firstTier.theme ? ' • ' : ''}{firstTier.theme}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual tiers */}
                  <div className="ml-8 space-y-2">
                    {tiers.map(tier => (
                      <label
                        key={tier.tierId}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                          selectedTierIds.has(tier.tierId) ? 'bg-white/80' : 'bg-white/40'
                        } hover:bg-white`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTierIds.has(tier.tierId)}
                          onChange={() => onToggleTier(tier.tierId)}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-sm text-gray-700">
                            Tier {tier.tierIndex + 1}: {tier.sizeName} ({tier.servings} srv)
                          </span>
                          {batch.taskType === 'PREP' && (
                            <span className="text-xs text-gray-500">
                              {tier.diameterInches}&quot; • {tier.buttercreamOz} oz
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Stock items (not selectable - from StockProductionTask) */}
            {batch.stockItems && batch.stockItems.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="text-sm font-medium text-green-700 mb-2">
                  Pre-Made Products (from Stock Tasks)
                </div>
                {batch.stockItems.map(item => (
                  <div key={item.stockTaskId} className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-green-800">{item.itemName}</span>
                        <span className="ml-2 text-green-600">x{item.quantity}</span>
                      </div>
                      <div className="text-sm text-green-600">
                        {item.recipeQuantityOz} oz needed
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: {item.scheduledDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with totals and save button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{selectedTierIds.size} tiers</span>
              {batch.stockItems && batch.stockItems.length > 0 && (
                <>
                  <span className="mx-2">+</span>
                  <span className="text-green-600 font-semibold">{batch.stockItems.length} stock items</span>
                </>
              )}
              <span className="mx-2">•</span>
              <span>{totalServings} servings</span>
              {batch.taskType === 'PREP' && (
                <>
                  <span className="mx-2">•</span>
                  <span>{Math.round(totalButtercream + (batch.totalStockQuantityOz || 0))} oz total</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={(selectedTierIds.size === 0 && (!batch.stockItems || batch.stockItems.length === 0)) || isSaving}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : `Save Batch (${selectedTierIds.size} tiers${batch.stockItems?.length ? ` + ${batch.stockItems.length} stock` : ''})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Saved Batch Modal - for removing tiers from existing batches
function EditSavedBatchModal({
  batch,
  onClose,
  onRemoveTiers,
}: {
  batch: SavedBatch
  onClose: () => void
  onRemoveTiers: (tierIds: number[]) => void
}) {
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set())
  const colors = TASK_TYPE_COLORS[batch.batchType] || TASK_TYPE_COLORS.BAKE

  // Group tiers by order
  const tiersByOrder: Record<number, typeof batch.ProductionBatchTier> = {}
  for (const bt of batch.ProductionBatchTier) {
    const orderId = bt.CakeTier.CakeOrder.id
    if (!tiersByOrder[orderId]) {
      tiersByOrder[orderId] = []
    }
    tiersByOrder[orderId].push(bt)
  }

  // Sort orders by due date
  const sortedOrders = Object.entries(tiersByOrder).sort((a, b) => {
    const dateA = new Date(a[1][0].CakeTier.CakeOrder.eventDate).getTime()
    const dateB = new Date(b[1][0].CakeTier.CakeOrder.eventDate).getTime()
    return dateA - dateB
  })

  const toggleTier = (tierId: number) => {
    setSelectedForRemoval(prev => {
      const next = new Set(prev)
      if (next.has(tierId)) {
        next.delete(tierId)
      } else {
        next.add(tierId)
      }
      return next
    })
  }

  const handleRemove = () => {
    if (selectedForRemoval.size === 0) return
    if (selectedForRemoval.size === batch.ProductionBatchTier.length) {
      if (!confirm('This will remove all tiers and delete the batch. Continue?')) return
    }
    onRemoveTiers(Array.from(selectedForRemoval))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 ${colors.light} border-b ${colors.border} flex-shrink-0`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                Edit Batch
              </span>
              <h2 className={`text-xl font-bold ${colors.text}`}>{batch.recipeName || batch.name}</h2>
              <p className="text-sm text-gray-600">Select tiers to remove from this batch</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4">
            {sortedOrders.map(([orderId, tiers]) => {
              const firstTier = tiers[0]
              const order = firstTier.CakeTier.CakeOrder
              const dueDate = new Date(order.eventDate)
              const dueDateStr = dueDate.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })
              const allSelected = tiers.every(t => selectedForRemoval.has(t.CakeTier.id))

              return (
                <div key={orderId} className={`rounded-lg border p-4 ${
                  allSelected ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Order header */}
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        tiers.forEach(t => {
                          if (allSelected) {
                            if (selectedForRemoval.has(t.CakeTier.id)) toggleTier(t.CakeTier.id)
                          } else {
                            if (!selectedForRemoval.has(t.CakeTier.id)) toggleTier(t.CakeTier.id)
                          }
                        })
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-900">Order #{orderId}</span>
                          <span className="ml-2 text-gray-600">
                            {order.Customer?.name || order.customerName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600 text-sm">Due {dueDateStr}</div>
                        </div>
                      </div>
                      {(order.occasion || order.theme) && (
                        <div className="text-sm text-gray-500 mt-1">
                          {order.occasion}{order.occasion && order.theme ? ' • ' : ''}{order.theme}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual tiers */}
                  <div className="ml-8 space-y-2">
                    {tiers.map(bt => (
                      <label
                        key={bt.CakeTier.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                          selectedForRemoval.has(bt.CakeTier.id) ? 'bg-red-100' : 'bg-white/40'
                        } hover:bg-white`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForRemoval.has(bt.CakeTier.id)}
                          onChange={() => toggleTier(bt.CakeTier.id)}
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-sm text-gray-700">
                            Tier {bt.CakeTier.tierIndex + 1}: {bt.CakeTier.TierSize?.name || 'Unknown'} ({bt.CakeTier.TierSize?.servings || 0} srv)
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Stock items (read-only display) */}
            {batch.StockProductionTask && batch.StockProductionTask.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="text-sm font-medium text-green-700 mb-2">
                  Pre-Made Products (Stock Tasks)
                </div>
                {batch.StockProductionTask.map(task => (
                  <div key={task.id} className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-green-800">{task.InventoryItem.name}</span>
                        <span className="ml-2 text-green-600">x{task.targetQuantity}</span>
                      </div>
                      <span className="text-xs text-green-500 bg-green-100 px-2 py-0.5 rounded">
                        {task.InventoryItem.productType}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">
                  Stock items cannot be removed from this view.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedForRemoval.size > 0 ? (
                <span className="text-red-600 font-medium">
                  {selectedForRemoval.size} tier{selectedForRemoval.size !== 1 ? 's' : ''} selected for removal
                </span>
              ) : (
                <span>Select tiers to remove</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={selectedForRemoval.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                Remove Selected ({selectedForRemoval.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
