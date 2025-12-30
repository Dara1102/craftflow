'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import BatchGanttChart from '@/app/components/BatchGanttChart'

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
  batchType: string
  currentDate: string | null
  suggestedDate: string
  leadTime: number
  reason: string
  dependencies: string[]
  missingDependencies?: { type: string; suggestedDate: string; leadTime: number }[]
}

interface BatchTypeConfig {
  code: string
  name: string
  leadTimeDays: number
  dependsOn: string[]
  isBatchable: boolean
  color: string | null
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
  // Multi-day scheduling fields
  scheduledStartDate?: string | null
  scheduledEndDate?: string | null
  leadTimeDays?: number | null
  durationDays?: number
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

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get today's date in local format
function getTodayString(): string {
  return getLocalDateString(new Date())
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
    dates.push(getLocalDateString(date))
  }
  return dates
}

// Helper to get extended dates for scheduling (3 weeks ahead from today)
function getSchedulingDates(): string[] {
  const today = new Date()
  const dates = []
  // Start from today and go 21 days ahead (3 weeks)
  for (let i = 0; i < 21; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(getLocalDateString(date))
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
  const [batchTypeConfigs, setBatchTypeConfigs] = useState<BatchTypeConfig[]>([])
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [creatingBatch, setCreatingBatch] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [useGrams, setUseGrams] = useState(true) // true = grams (default), false = ounces
  const [applyingSchedule, setApplyingSchedule] = useState(false)
  const [tierSelectionBatch, setTierSelectionBatch] = useState<RecipeBatch | null>(null)
  const [selectedTierIds, setSelectedTierIds] = useState<Set<number>>(new Set())
  const [editingSavedBatch, setEditingSavedBatch] = useState<SavedBatch | null>(null)
  const [previewDate, setPreviewDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'gantt'>('cards')
  const hasMergedDuplicatesRef = useRef(false)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const schedulingDates = useMemo(() => getSchedulingDates(), [])

  // Refresh batches data (called after tier removal to update unscheduled list)
  const refreshBatches = async () => {
    const startDate = weekDates[0]
    const endDate = weekDates[6]
    try {
      const batchesRes = await fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`)
      if (batchesRes.ok) {
        const data = await batchesRes.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error('Failed to refresh batches:', error)
    }
  }

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
    // Reset merge check when week changes
    hasMergedDuplicatesRef.current = false
  }, [weekDates])

  // Auto-merge duplicate batches (same recipe, type, and date) - runs once on initial load
  useEffect(() => {
    if (savedBatches.length < 2 || hasMergedDuplicatesRef.current) return

    const mergeDuplicates = async () => {
      // Mark as processed immediately to prevent re-runs
      hasMergedDuplicatesRef.current = true

      // Group batches by recipe+type+date
      const groups = new Map<string, SavedBatch[]>()
      for (const batch of savedBatches) {
        if (!batch.recipeName || !batch.scheduledDate) continue
        const dateStr = batch.scheduledDate.split('T')[0]
        const key = `${batch.recipeName}|${batch.batchType}|${dateStr}`
        const existing = groups.get(key) || []
        existing.push(batch)
        groups.set(key, existing)
      }

      // Find groups with duplicates
      for (const [, batches] of groups) {
        if (batches.length > 1) {
          // Keep the first batch, merge others into it
          const targetBatch = batches[0]
          for (let i = 1; i < batches.length; i++) {
            const sourceBatch = batches[i]
            console.log(`Auto-merging batch ${sourceBatch.id} into ${targetBatch.id}`)

            try {
              const mergeRes = await fetch('/api/production/batches/manage', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sourceBatchId: sourceBatch.id,
                  targetBatchId: targetBatch.id
                })
              })

              if (mergeRes.ok) {
                const data = await mergeRes.json()
                // Update state to reflect merge
                setSavedBatches(prev => {
                  const filtered = prev.filter(b => b.id !== sourceBatch.id)
                  return filtered.map(b => b.id === targetBatch.id ? data.batch : b)
                })
              }
            } catch (error) {
              console.error('Failed to auto-merge duplicate batches:', error)
            }
          }
        }
      }
    }

    mergeDuplicates()
  }, [savedBatches]) // Run when savedBatches changes, but ref prevents re-runs

  // Open tier selection modal for creating batch
  const openTierSelectionModal = (suggestedBatch: RecipeBatch) => {
    setTierSelectionBatch(suggestedBatch)
    // Pre-select all tiers by default
    setSelectedTierIds(new Set(suggestedBatch.tiers.map(t => t.tierId)))
  }

  // Create a new batch from suggested batch with selected tiers
  const handleCreateBatch = async (tierIds: number[], scheduledDate?: string) => {
    // Allow creating batch if we have tiers OR stock items
    const hasStockItems = tierSelectionBatch?.stockItems && tierSelectionBatch.stockItems.length > 0
    if (!tierSelectionBatch || (tierIds.length === 0 && !hasStockItems)) return

    setCreatingBatch(true)
    try {
      // Use provided date, batch's date, or null
      const dateToUse = scheduledDate || tierSelectionBatch.scheduledDate || null
      const res = await fetch('/api/production/batches/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${tierSelectionBatch.recipe} - Week of ${weekDates[0]}`,
          batchType: tierSelectionBatch.taskType,
          recipeName: tierSelectionBatch.recipe,
          scheduledDate: dateToUse,
          tierIds: tierIds.length > 0 ? tierIds : undefined,
          // Include stock item IDs so we can link them
          stockTaskIds: tierSelectionBatch.stockItems?.map(s => s.stockTaskId)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSavedBatches(prev => [...prev, data.batch])
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

  // Remove tiers from a saved batch (unschedule - tier goes back to unscheduled)
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
        if (data.batch.totalTiers === 0 && data.batch.StockProductionTask?.length === 0) {
          setSavedBatches(prev => prev.filter(b => b.id !== batchId))
        } else {
          setSavedBatches(prev => prev.map(b => b.id === batchId ? data.batch : b))
        }
        setEditingSavedBatch(null)

        // IMPORTANT: Refresh the batches data so removed tiers show up in unscheduled
        refreshBatches()
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

  // Update batch properties (duration, notes, etc.)
  const handleUpdateBatch = async (batchId: number, updates: { durationDays?: number; notes?: string }) => {
    try {
      const res = await fetch(`/api/production/batches/manage/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const data = await res.json()
        setSavedBatches(prev => prev.map(b => b.id === batchId ? data.batch : b))
        // Also update the editing batch if it's the same one
        if (editingSavedBatch?.id === batchId) {
          setEditingSavedBatch(data.batch)
        }
      }
    } catch (error) {
      console.error('Failed to update batch:', error)
    }
  }

  // Delete an order (CakeOrder) from the system
  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm(`Are you sure you want to delete Order #${orderId}? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // Refresh batches to remove the deleted order's tiers
        refreshBatches()
        // Close the modal
        setTierSelectionBatch(null)
        setSelectedTierIds(new Set())
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete order')
      }
    } catch (error) {
      console.error('Failed to delete order:', error)
      alert('Failed to delete order')
    }
  }

  // Update a saved batch (schedule, status)
  const handleUpdateSavedBatch = async (batchId: number, updates: Partial<SavedBatch>) => {
    try {
      const currentBatch = savedBatches.find(b => b.id === batchId)
      if (!currentBatch) return

      // Check if scheduling to a date that already has a batch of the same recipe/type
      if (updates.scheduledDate) {
        const targetDate = updates.scheduledDate.split('T')[0]
        const existingBatch = savedBatches.find(b =>
          b.id !== batchId &&
          b.recipeName === currentBatch.recipeName &&
          b.batchType === currentBatch.batchType &&
          b.scheduledDate?.split('T')[0] === targetDate
        )

        if (existingBatch) {
          // Merge the batches
          const mergeRes = await fetch('/api/production/batches/manage', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceBatchId: batchId,
              targetBatchId: existingBatch.id
            })
          })

          if (mergeRes.ok) {
            const data = await mergeRes.json()
            // Remove source batch and update target batch
            setSavedBatches(prev => {
              const filtered = prev.filter(b => b.id !== batchId)
              return filtered.map(b => b.id === existingBatch.id ? data.batch : b)
            })
          }

          // Refetch suggested batches
          const startDate = weekDates[0]
          const endDate = weekDates[6]
          const batchesRes = await fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`)
          if (batchesRes.ok) {
            const batchData = await batchesRes.json()
            setBatches(batchData.batches || [])
          }
          return
        }
      }

      // No merge needed, just update
      const res = await fetch('/api/production/batches/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: batchId, ...updates })
      })

      if (res.ok) {
        const data = await res.json()
        const updatedBatch = data.batch

        // Check if backend auto-merged the batches
        if (data.merged && data.deletedBatchId) {
          // Backend merged this batch into an existing one
          setSavedBatches(prev => {
            // Remove the deleted batch and update the merged target
            const filtered = prev.filter(b => b.id !== data.deletedBatchId)
            return filtered.map(b => b.id === updatedBatch.id ? updatedBatch : b)
          })

          // Refetch suggested batches
          const startDate = weekDates[0]
          const endDate = weekDates[6]
          const batchesRes = await fetch(`/api/production/batches?startDate=${startDate}&endDate=${endDate}`)
          if (batchesRes.ok) {
            const batchData = await batchesRes.json()
            setBatches(batchData.batches || [])
          }
          return
        }

        // Update the local state
        setSavedBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b))

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
        if (data.batchTypes) {
          setBatchTypeConfigs(data.batchTypes)
        }
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Failed to get auto-schedule suggestions:', error)
    }
  }

  // Apply all suggestions - creates real database batches
  const handleApplyAllSuggestions = async () => {
    setApplyingSchedule(true)
    try {
      const createdBatches: SavedBatch[] = []

      // Create a batch in the database for each suggestion
      for (const suggestion of suggestions) {
        // Find the suggested batch by ID
        const suggestedBatch = batches.find(b => b.id === suggestion.batchId)
        if (!suggestedBatch || suggestedBatch.tiers.length === 0) continue

        // Get all tier IDs from this batch
        const tierIds = suggestedBatch.tiers.map(t => t.tierId)

        // Create the batch in the database
        const res = await fetch('/api/production/batches/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${suggestedBatch.recipe} - Week of ${weekDates[0]}`,
            batchType: suggestedBatch.taskType,
            recipeName: suggestedBatch.recipe,
            scheduledDate: suggestion.suggestedDate,
            tierIds,
            stockTaskIds: suggestedBatch.stockItems?.map(s => s.stockTaskId)
          })
        })

        if (res.ok) {
          const data = await res.json()
          createdBatches.push(data.batch)
        } else {
          console.error('Failed to create batch:', await res.text())
        }
      }

      // Update saved batches with newly created ones
      setSavedBatches(prev => [...prev, ...createdBatches])

      // Refresh the suggested batches to remove tiers that are now scheduled
      await refreshBatches()

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

  // Get all batches for a specific date, grouped by recipe
  const getBatchesForDate = (date: string) => {
    const batchGroups: {
      id: string
      taskType: string
      recipe: string
      orders: {
        id: number
        customerName: string
        imageUrl: string | null
        occasion: string | null
        theme: string | null
        colors: string | null
        dueDate: string
        isDelivery: boolean
        tiersCount: number
      }[]
      stockItems: {
        stockTaskId: number
        itemName: string
        quantity: number
      }[]
    }[] = []

    // From suggested batches
    const suggestedDayBatches = batches.filter(b => {
      if (!b.scheduledDate) return false
      return b.scheduledDate.split('T')[0] === date
    })
    for (const batch of suggestedDayBatches) {
      const seenOrders = new Set<number>()
      const orders: typeof batchGroups[0]['orders'] = []

      for (const tier of batch.tiers) {
        if (!seenOrders.has(tier.orderId)) {
          seenOrders.add(tier.orderId)
          const tiersInOrder = batch.tiers.filter(t => t.orderId === tier.orderId).length
          orders.push({
            id: tier.orderId,
            customerName: tier.customerName,
            imageUrl: tier.imageUrl,
            occasion: tier.occasion,
            theme: tier.theme,
            colors: tier.colors,
            dueDate: tier.dueDate,
            isDelivery: tier.isDelivery,
            tiersCount: tiersInOrder
          })
        }
      }

      const stockItems = (batch.stockItems || []).map(stock => ({
        stockTaskId: stock.stockTaskId,
        itemName: stock.itemName,
        quantity: stock.quantity
      }))

      if (orders.length > 0 || stockItems.length > 0) {
        batchGroups.push({
          id: batch.id,
          taskType: batch.taskType,
          recipe: batch.recipe,
          orders,
          stockItems
        })
      }
    }

    // From saved batches
    const savedDayBatches = savedBatches.filter(b => {
      if (!b.scheduledDate) return false
      return b.scheduledDate.split('T')[0] === date
    })
    for (const batch of savedDayBatches) {
      const seenOrders = new Set<number>()
      const orders: typeof batchGroups[0]['orders'] = []

      for (const bt of batch.ProductionBatchTier) {
        const orderId = bt.CakeTier.CakeOrder.id
        if (!seenOrders.has(orderId)) {
          seenOrders.add(orderId)
          const order = bt.CakeTier.CakeOrder
          const tiersInOrder = batch.ProductionBatchTier.filter(t => t.CakeTier.CakeOrder.id === orderId).length
          orders.push({
            id: orderId,
            customerName: order.customerName || order.Customer?.name || 'Unknown',
            imageUrl: order.imageUrl,
            occasion: order.occasion,
            theme: order.theme,
            colors: order.colors,
            dueDate: order.eventDate,
            isDelivery: order.isDelivery,
            tiersCount: tiersInOrder
          })
        }
      }

      const stockItems = (batch.StockProductionTask || []).map(stock => ({
        stockTaskId: stock.id,
        itemName: stock.InventoryItem.name,
        quantity: stock.targetQuantity
      }))

      if (orders.length > 0 || stockItems.length > 0) {
        batchGroups.push({
          id: `saved-${batch.id}`,
          taskType: batch.batchType,
          recipe: batch.recipeName || batch.name,
          orders,
          stockItems
        })
      }
    }

    // Sort by task type (BAKE first, then PREP)
    const typeOrder = ['BAKE', 'PREP', 'FROST', 'STACK', 'DECORATE']
    batchGroups.sort((a, b) => typeOrder.indexOf(a.taskType) - typeOrder.indexOf(b.taskType))

    return batchGroups
  }

  // Legacy function for backward compatibility
  const getOrdersForDate = (date: string) => {
    const batchGroups = getBatchesForDate(date)
    const allOrders: { id: number; customerName: string; imageUrl: string | null; occasion: string | null; theme: string | null; colors: string | null; dueDate: string; isDelivery: boolean; tiersCount: number; source: 'suggested' | 'saved' }[] = []
    const seenOrders = new Set<number>()
    for (const batch of batchGroups) {
      for (const order of batch.orders) {
        if (!seenOrders.has(order.id)) {
          seenOrders.add(order.id)
          allOrders.push({ ...order, source: batch.id.startsWith('saved-') ? 'saved' : 'suggested' })
        }
      }
    }
    return allOrders
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

            {/* View Toggle */}
            <div className="flex items-center gap-1 border-l pl-3 ml-1">
              <span className="text-xs text-gray-500 mr-1">View:</span>
              <div className="inline-flex rounded border overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2 py-1 text-xs ${viewMode === 'cards' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`px-2 py-1 text-xs ${viewMode === 'gantt' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Gantt
                </button>
              </div>
            </div>

            {/* Units Toggle */}
            <div className="flex items-center gap-1 border-l pl-3 ml-1">
              <span className="text-xs text-gray-500 mr-1">Units:</span>
              <div className="inline-flex rounded border overflow-hidden">
                <button
                  onClick={() => setUseGrams(false)}
                  className={`px-2 py-1 text-xs ${!useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  oz
                </button>
                <button
                  onClick={() => setUseGrams(true)}
                  className={`px-2 py-1 text-xs ${useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  g
                </button>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="flex items-center gap-1 border-l pl-3 ml-1">
              <Link
                href={`/production/batch-planner/print-weekly?weekStart=${weekDates[0]}`}
                target="_blank"
                className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
                title="Print weekly schedule with order details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Schedule
              </Link>
              <Link
                href={`/production/batch-planner/print-recipe?weekStart=${weekDates[0]}`}
                target="_blank"
                className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
                title="Print recipes with ingredients"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Recipes
              </Link>
            </div>

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

        {/* Date Strip - Drop Targets & Click to Preview */}
        <div className="px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex gap-2">
            {weekDates.map(date => {
              const stats = getDateStats(date)
              const todayStr = getTodayString()
              const isToday = date === todayStr
              const isPast = date < todayStr
              return (
                <div
                  key={date}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(date)}
                  onClick={() => !draggedBatch && setPreviewDate(date)}
                  className={`flex-1 p-2 rounded-lg border-2 transition-all text-center cursor-pointer ${
                    isToday
                      ? 'border-pink-500 bg-pink-50'
                      : isPast
                      ? 'border-gray-200 bg-gray-100 opacity-60'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  } ${draggedBatch ? 'hover:border-pink-400 hover:bg-pink-50 hover:scale-105 cursor-grabbing' : 'hover:shadow-md'}`}
                >
                  <div className={`font-semibold text-sm ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {formatShortDate(date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.count} batch{stats.count !== 1 ? 'es' : ''} • {stats.tiers} tier{stats.tiers !== 1 ? 's' : ''}
                    {stats.saved > 0 && <span className="text-green-600 ml-1">({stats.saved} saved)</span>}
                  </div>
                  {!draggedBatch && stats.count > 0 && (
                    <div className="text-xs text-pink-500 mt-1">Click to preview</div>
                  )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSuggestions(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-pink-50 border-b border-pink-200 flex justify-between items-start flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Auto-Schedule Suggestions</h2>
                <p className="text-sm text-gray-600">Review and apply the suggested schedule</p>
              </div>
              <button onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
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
                          <div className="text-xs text-gray-500">
                            {suggestion.leadTime} day{suggestion.leadTime !== 1 ? 's' : ''} before event
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {batch.totalTiers} tiers • {batch.totalServings} servings
                        {suggestion.dependencies.length > 0 && (
                          <span className="ml-2 text-gray-400">
                            • Depends on: {suggestion.dependencies.join(', ')}
                          </span>
                        )}
                      </div>
                      {/* Show missing dependency warnings */}
                      {suggestion.missingDependencies && suggestion.missingDependencies.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          <div className="font-medium text-amber-800 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Suggested prerequisite batches:
                          </div>
                          <div className="mt-1 space-y-1">
                            {suggestion.missingDependencies.map(dep => (
                              <div key={dep.type} className="flex justify-between text-amber-700">
                                <span>{dep.type} batch</span>
                                <span>Schedule for: {formatDate(dep.suggestedDate)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-amber-600 italic">
                            You can skip these if using stock ingredients
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
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

      {/* Day Preview Modal */}
      {previewDate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDate(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-pink-50 border-b border-pink-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {new Date(previewDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <p className="text-sm text-gray-600">Orders with batches scheduled for this day</p>
              </div>
              <button
                onClick={() => setPreviewDate(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const batchGroups = getBatchesForDate(previewDate)
                if (batchGroups.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No batches scheduled for this day.
                    </div>
                  )
                }

                const BATCH_COLORS: Record<string, { bg: string; border: string; headerBg: string; text: string }> = {
                  BAKE: { bg: 'bg-orange-50', border: 'border-orange-200', headerBg: 'bg-orange-100', text: 'text-orange-800' },
                  PREP: { bg: 'bg-blue-50', border: 'border-blue-200', headerBg: 'bg-blue-100', text: 'text-blue-800' },
                  FROST: { bg: 'bg-purple-50', border: 'border-purple-200', headerBg: 'bg-purple-100', text: 'text-purple-800' },
                  STACK: { bg: 'bg-amber-50', border: 'border-amber-200', headerBg: 'bg-amber-100', text: 'text-amber-800' },
                  DECORATE: { bg: 'bg-pink-50', border: 'border-pink-200', headerBg: 'bg-pink-100', text: 'text-pink-800' },
                }

                return (
                  <div className="space-y-4">
                    {batchGroups.map(batch => {
                      const colors = BATCH_COLORS[batch.taskType] || BATCH_COLORS.BAKE
                      return (
                        <div key={batch.id} className={`${colors.bg} rounded-lg border ${colors.border} overflow-hidden`}>
                          {/* Batch Header */}
                          <div className={`${colors.headerBg} px-4 py-2 border-b ${colors.border}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${colors.text} uppercase`}>{batch.taskType}</span>
                              <span className={`font-semibold ${colors.text}`}>{batch.recipe}</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {batch.orders.length} order{batch.orders.length !== 1 ? 's' : ''}
                              {batch.stockItems.length > 0 && ` + ${batch.stockItems.length} stock item${batch.stockItems.length !== 1 ? 's' : ''}`}
                            </div>
                          </div>

                          {/* Batch Content */}
                          <div className="p-3 space-y-2">
                            {/* Orders */}
                            {batch.orders.map(order => {
                              const dateStr = order.dueDate.split('T')[0]
                              const dueDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })
                              return (
                                <div key={order.id} className="flex gap-3 p-2 bg-white rounded-lg border border-gray-200">
                                  {/* Order Image */}
                                  <div className="flex-shrink-0">
                                    {order.imageUrl ? (
                                      <img
                                        src={order.imageUrl}
                                        alt={`Order ${order.id}`}
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                        <span className="text-xl text-gray-300">🎂</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Order Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <Link
                                          href={`/orders/${order.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="font-bold text-pink-600 hover:text-pink-800 text-sm"
                                        >
                                          #{order.id}
                                        </Link>
                                        <span className="text-gray-600 ml-1 text-sm">{order.customerName}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-xs font-medium ${order.isDelivery ? 'text-blue-600' : 'text-green-600'}`}>
                                          {order.isDelivery ? 'Delivery' : 'Pickup'}
                                        </div>
                                        <div className="text-xs text-red-600">Due: {dueDate}</div>
                                      </div>
                                    </div>
                                    {(order.occasion || order.theme) && (
                                      <div className="text-xs text-gray-600 truncate">
                                        {order.occasion}{order.occasion && order.theme && ' - '}{order.theme}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      {order.tiersCount} tier{order.tiersCount !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Stock Items */}
                            {batch.stockItems.map(stock => (
                              <div key={stock.stockTaskId} className="flex gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">🧁</span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-green-800 text-sm">{stock.itemName}</div>
                                  <div className="text-xs text-green-600">Qty: {stock.quantity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(() => {
                  const batchGroups = getBatchesForDate(previewDate)
                  const totalOrders = batchGroups.reduce((sum, b) => sum + b.orders.length, 0)
                  const totalStock = batchGroups.reduce((sum, b) => sum + b.stockItems.length, 0)
                  const parts = []
                  parts.push(`${batchGroups.length} batch${batchGroups.length !== 1 ? 'es' : ''}`)
                  if (totalOrders > 0) parts.push(`${totalOrders} order${totalOrders !== 1 ? 's' : ''}`)
                  if (totalStock > 0) parts.push(`${totalStock} stock item${totalStock !== 1 ? 's' : ''}`)
                  return parts.join(', ') || 'Nothing scheduled'
                })()}
              </div>
              <button
                onClick={() => setPreviewDate(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 max-w-full mx-auto">
        {/* Gantt View */}
        {viewMode === 'gantt' && (
          <div className="mb-6">
            <BatchGanttChart
              batches={savedBatches.map(batch => ({
                id: batch.id,
                name: batch.name,
                batchType: batch.batchType,
                recipeName: batch.recipeName,
                scheduledDate: batch.scheduledDate,
                scheduledStartDate: batch.scheduledStartDate || null,
                scheduledEndDate: batch.scheduledEndDate || null,
                durationDays: batch.durationDays || 1,
                leadTimeDays: batch.leadTimeDays || null,
                status: batch.status,
                assignedTo: batch.assignedTo,
                totalTiers: batch.totalTiers,
                totalServings: batch.totalServings,
                totalButtercream: batch.totalButtercream,
                orderIds: batch.ProductionBatchTier.map(pbt => pbt.CakeTier.CakeOrder.id)
              }))}
              useGrams={useGrams}
              startDate={new Date(weekDates[0] + 'T00:00:00')}
              endDate={new Date(weekDates[6] + 'T23:59:59')}
              onBatchReschedule={async (batchId, newStartDate, newEndDate) => {
                try {
                  const res = await fetch(`/api/production/batches/manage/${batchId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      scheduledDate: newStartDate,
                      scheduledStartDate: newStartDate,
                      scheduledEndDate: newEndDate,
                    })
                  })
                  if (res.ok) {
                    // Refresh saved batches
                    const savedBatchesRes = await fetch(`/api/production/batches/manage?weekStart=${weekDates[0]}&weekEnd=${weekDates[6]}`)
                    if (savedBatchesRes.ok) {
                      const savedData = await savedBatchesRes.json()
                      setSavedBatches(savedData.batches || [])
                    }
                  }
                } catch (error) {
                  console.error('Failed to reschedule batch:', error)
                }
              }}
              onBatchClick={(batch) => {
                const savedBatch = savedBatches.find(b => b.id === batch.id)
                if (savedBatch) {
                  setEditingSavedBatch(savedBatch)
                }
              }}
            />

            {/* Unscheduled batches summary */}
            {unscheduledBatches.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  Unscheduled Batches ({unscheduledBatches.length})
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Switch to Cards view to schedule these batches by dragging them to dates.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <>
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
                          useGrams={useGrams}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Batches scheduled for other weeks */}
                {otherWeekBatches.length > 0 && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-blue-100 border-b border-blue-200">
                      <h2 className="font-semibold text-blue-800 text-sm">
                        Upcoming Scheduled ({otherWeekBatches.length})
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
                          useGrams={useGrams}
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

                  const isToday = date === getTodayString()

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
                              useGrams={useGrams}
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
                              schedulingDates={schedulingDates}
                              useGrams={useGrams}
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

        {batches.length === 0 && (
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
          <h4 className="text-sm font-medium text-gray-700 mb-2">How to Use Batch Planner</h4>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• <strong>Unscheduled section:</strong> Shows recipe batches waiting to be scheduled (grouped by recipe type)</li>
            <li>• <strong>Click a batch card</strong> to select orders/tiers, choose a date, and schedule the batch</li>
            <li>• <strong>Drag</strong> any batch card to a date in the calendar header to quickly schedule it</li>
            <li>• <strong>Auto-Schedule:</strong> Click to get optimal scheduling suggestions based on due dates</li>
            <li>• <strong>Edit scheduled batches:</strong> Click any scheduled batch to unschedule orders or adjust</li>
            <li>• <strong>Delete orders:</strong> Unschedule the order first, then click the trash icon in the batch modal</li>
            <li>• <strong>Print:</strong> Use Print Schedule for daily overview or Print Recipe for full recipes with ingredients</li>
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
          onSave={(scheduledDate?: string) => handleCreateBatch(Array.from(selectedTierIds), scheduledDate)}
          isSaving={creatingBatch}
          schedulingDates={schedulingDates}
          initialDate={tierSelectionBatch.scheduledDate || null}
          onDeleteOrder={tierSelectionBatch.status === 'unscheduled' ? handleDeleteOrder : undefined}
        />
      )}

      {/* Edit Saved Batch Modal - for removing tiers from existing batches */}
      {editingSavedBatch && (
        <EditSavedBatchModal
          batch={editingSavedBatch}
          onClose={() => setEditingSavedBatch(null)}
          onRemoveTiers={(tierIds) => handleRemoveTiersFromBatch(editingSavedBatch.id, tierIds)}
          onUpdateBatch={handleUpdateBatch}
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
  useGrams = false,
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
  useGrams?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [showAllTiers, setShowAllTiers] = useState(false)
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

  // Get unique images by order (one image per order)
  const orderImages: { orderId: number; imageUrl: string }[] = []
  const seenOrderIds = new Set<number>()
  for (const tier of batch.tiers) {
    if (tier.imageUrl && !seenOrderIds.has(tier.orderId)) {
      seenOrderIds.add(tier.orderId)
      orderImages.push({ orderId: tier.orderId, imageUrl: tier.imageUrl })
    }
  }
  const firstImage = orderImages[0]?.imageUrl

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
          {orderImages.length > 0 && (
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {orderImages.slice(0, 4).map((img) => (
                <div key={img.orderId} className="flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-gray-800">
                  <img src={img.imageUrl} alt={`Order #${img.orderId}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {orderImages.length > 4 && (
                <div className="flex-shrink-0 w-14 h-14 rounded bg-gray-700 flex items-center justify-center text-gray-400">
                  +{orderImages.length - 4}
                </div>
              )}
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

      {/* Header: Task Type + Recipe */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-semibold ${colors.text} uppercase`}>
            {batch.taskType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {RECIPE_TYPE_LABELS[batch.recipeType] || batch.recipeType}
          </span>
          {batch.scheduledDate && (
            <a
              href={`/production/batch-planner/print-recipe?date=${batch.scheduledDate.split('T')[0]}&type=${batch.taskType}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600 p-0.5"
              title="Print recipe for this day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Recipe Name */}
      <div className={`font-bold ${colors.text} text-lg leading-tight`}>
        {batch.recipe}
      </div>

      {/* Total Amount - PROMINENT */}
      <div className={`text-sm font-bold ${colors.text} bg-white/60 rounded px-2 py-1 my-2 inline-block`}>
        {(() => {
          const oz = batch.taskType === 'BAKE'
            ? batch.totalServings * 2
            : batch.totalButtercreamOz + batch.totalStockQuantityOz
          const grams = oz * 28.3495
          return useGrams
            ? <>{Math.round(grams)} g ({(grams / 1000).toFixed(2)} kg)</>
            : <>{Math.round(oz)} oz ({(oz / 16).toFixed(1)} lbs)</>
        })()}
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
      {batch.taskType === 'PREP' && (batch.totalButtercreamOz > 0 || batch.totalStockQuantityOz > 0) && (
        <div className="text-xs bg-white/50 rounded px-2 py-1 mb-2">
          <span className="font-medium text-gray-700">Total Yield: </span>
          <span className="text-gray-600">
            {(() => {
              const oz = batch.totalButtercreamOz + (batch.totalStockQuantityOz || 0)
              const grams = oz * 28.3495
              return useGrams
                ? <>{Math.round(grams)} g ({(grams / 1000).toFixed(2)} kg)</>
                : <>{Math.round(oz * 10) / 10} oz ({Math.round(oz / 16 * 10) / 10} lb)</>
            })()}
          </span>
        </div>
      )}

      {/* Orders with customer names and images */}
      <div className="text-xs text-gray-700 mb-2 space-y-1">
        {(showAllTiers ? batch.tiers : batch.tiers.slice(0, 4)).map((tier, idx) => (
          <div key={`${tier.orderId}-${tier.tierIndex}-${idx}`} className="flex items-center gap-2">
            {tier.imageUrl ? (
              <img
                src={tier.imageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <span className="text-gray-400 text-xs">🎂</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold">#{tier.orderId}</span>
                <span className="text-gray-500 truncate">{tier.customerName}</span>
              </div>
              <div className="text-gray-400 text-[10px]">
                {tier.sizeName} • {tier.servings} srv
              </div>
            </div>
          </div>
        ))}
        {batch.tiers.length > 4 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAllTiers(!showAllTiers); }}
            className="text-pink-500 hover:text-pink-700 text-center py-1 w-full font-medium"
          >
            {showAllTiers ? 'Show less ↑' : `+${batch.tiers.length - 4} more tiers...`}
          </button>
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
  schedulingDates,
  useGrams = false,
}: {
  batch: SavedBatch
  onDelete: (id: number) => void
  onUpdate: (id: number, updates: Partial<SavedBatch>) => void
  onEditTiers: (batch: SavedBatch) => void
  schedulingDates: string[]
  useGrams?: boolean
}) {
  const [showScheduler, setShowScheduler] = useState(false)
  const [showAllTiers, setShowAllTiers] = useState(false)
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

  // Get earliest due date
  const dueDates = batch.ProductionBatchTier.map(bt => new Date(bt.CakeTier.CakeOrder.eventDate))
  const earliestDue = dueDates.length > 0 ? new Date(Math.min(...dueDates.map(d => d.getTime()))) : null

  return (
    <div
      onClick={() => onEditTiers(batch)}
      className={`${colors.bg} rounded-lg p-3 border ${colors.border} hover:shadow-lg transition-all relative cursor-pointer`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-semibold ${colors.text} uppercase`}>
          {batch.batchType}
        </span>
        <div className="flex items-center gap-1">
          {scheduledDateOnly && (
            <a
              href={`/production/batch-planner/print-recipe?date=${scheduledDateOnly}&type=${batch.batchType}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600 text-sm p-0.5"
              title="Print recipe for this day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(batch.id); }}
            className="text-gray-400 hover:text-red-500 text-sm"
            title="Delete batch"
          >
            ×
          </button>
        </div>
      </div>

      {/* Batch Name */}
      <div className={`font-bold ${colors.text} text-lg leading-tight`}>
        {batch.recipeName || batch.name}
      </div>

      {/* Total Amount - PROMINENT */}
      <div className={`text-sm font-bold ${colors.text} bg-white/60 rounded px-2 py-1 my-2 inline-block`}>
        {(() => {
          const oz = batch.batchType === 'BAKE'
            ? batch.totalServings * 2
            : Number(batch.totalButtercream)
          const grams = oz * 28.3495
          return useGrams
            ? <>{Math.round(grams)} g ({(grams / 1000).toFixed(2)} kg)</>
            : <>{Math.round(oz)} oz ({(oz / 16).toFixed(1)} lbs)</>
        })()}
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

      {/* Orders with customer names and images */}
      <div className="text-xs text-gray-700 mb-2 space-y-1">
        {(showAllTiers ? batch.ProductionBatchTier : batch.ProductionBatchTier.slice(0, 4)).map((bt) => (
          <div key={bt.id} className="flex items-center gap-2">
            {bt.CakeTier.CakeOrder.imageUrl ? (
              <img
                src={bt.CakeTier.CakeOrder.imageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <span className="text-gray-400 text-xs">🎂</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold">#{bt.CakeTier.CakeOrder.id}</span>
                <span className="text-gray-500 truncate">{bt.CakeTier.CakeOrder.customerName || bt.CakeTier.CakeOrder.Customer?.name}</span>
              </div>
              <div className="text-gray-400 text-[10px]">
                {bt.CakeTier.TierSize?.name} • {bt.CakeTier.TierSize?.servings} srv
              </div>
            </div>
          </div>
        ))}
        {batch.ProductionBatchTier.length > 4 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAllTiers(!showAllTiers); }}
            className="text-pink-500 hover:text-pink-700 text-center py-1 w-full font-medium"
          >
            {showAllTiers ? 'Show less ↑' : `+${batch.ProductionBatchTier.length - 4} more tiers...`}
          </button>
        )}
      </div>

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
            {schedulingDates.map(date => (
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
  schedulingDates,
  initialDate,
  onDeleteOrder,
}: {
  batch: RecipeBatch
  selectedTierIds: Set<number>
  onToggleTier: (tierId: number) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onClose: () => void
  onSave: (scheduledDate?: string) => void
  isSaving: boolean
  schedulingDates: string[]
  initialDate: string | null
  onDeleteOrder?: (orderId: number) => void
}) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '')
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
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <div className="font-medium text-red-600 text-sm">Due {dueDateStr}</div>
                            <div className="text-xs text-gray-500">
                              {firstTier.isDelivery ? 'Delivery' : 'Pickup'}
                            </div>
                          </div>
                          {onDeleteOrder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteOrder(Number(orderId))
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete this order"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
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
            <div className="flex items-center gap-3">
              {/* Date Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Schedule for:</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Select a date...</option>
                  {schedulingDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(selectedDate || undefined)}
                disabled={(selectedTierIds.size === 0 && (!batch.stockItems || batch.stockItems.length === 0)) || isSaving || !selectedDate}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : selectedDate ? `Schedule Batch` : 'Select a date'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Saved Batch Modal - for unscheduling tiers from existing batches
function EditSavedBatchModal({
  batch,
  onClose,
  onRemoveTiers,
  onUpdateBatch,
}: {
  batch: SavedBatch
  onClose: () => void
  onRemoveTiers: (tierIds: number[]) => void
  onUpdateBatch: (batchId: number, updates: { durationDays?: number; notes?: string }) => Promise<void>
}) {
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set())
  const [durationDays, setDurationDays] = useState(batch.durationDays || 1)
  const [notes, setNotes] = useState(batch.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const colors = TASK_TYPE_COLORS[batch.batchType] || TASK_TYPE_COLORS.BAKE

  const handleSaveDuration = async (newDuration: number) => {
    if (newDuration === batch.durationDays) return
    setIsSaving(true)
    try {
      await onUpdateBatch(batch.id, { durationDays: newDuration })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (notes === (batch.notes || '')) return
    setIsSaving(true)
    try {
      await onUpdateBatch(batch.id, { notes })
    } finally {
      setIsSaving(false)
    }
  }

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

  const handleUnschedule = () => {
    if (selectedForRemoval.size === 0) return
    if (selectedForRemoval.size === batch.ProductionBatchTier.length && (!batch.StockProductionTask || batch.StockProductionTask.length === 0)) {
      if (!confirm('This will unschedule all tiers and delete the empty batch. The tiers will return to the Unscheduled section where you can reschedule them. Continue?')) return
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
              <p className="text-sm text-gray-600">Select tiers to unschedule (they will return to the Unscheduled section)</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          {/* Duration and scheduling info */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Duration:</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                  onBlur={() => handleSaveDuration(durationDays)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-pink-500 focus:border-pink-500"
                  disabled={isSaving}
                />
                <span className="ml-1 text-sm text-gray-600">day{durationDays !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {batch.scheduledDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Scheduled:</span>{' '}
                {new Date(batch.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric'
                })}
                {durationDays > 1 && batch.scheduledStartDate && (
                  <span>
                    {' → '}
                    {new Date(
                      new Date(batch.scheduledStartDate).getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000
                    ).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            {isSaving && <span className="text-xs text-pink-600">Saving...</span>}
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
                <span className="text-amber-600 font-medium">
                  {selectedForRemoval.size} tier{selectedForRemoval.size !== 1 ? 's' : ''} will be unscheduled
                </span>
              ) : (
                <span>Select tiers to unschedule</span>
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
                onClick={handleUnschedule}
                disabled={selectedForRemoval.size === 0}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
              >
                Unschedule Selected ({selectedForRemoval.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
