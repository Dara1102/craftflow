'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string
  yieldVolumeMl: number | null
  prepMinutes: number | null
  bakeMinutes: number | null
  coolMinutes: number | null
  laborMinutes: number | null
  instructions: string | null
  // API returns both formats for compatibility
  RecipeIngredient?: {
    id: number
    quantity: number
    Ingredient: {
      id: number
      name: string
      unit: string
    }
  }[]
  recipeIngredients?: {
    id: number
    quantity: number
    ingredient: {
      id: number
      name: string
      unit: string
    }
  }[]
}

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
  }[]
  stockItems: {
    stockTaskId: number
    itemName: string
    quantity: number
    productType: string
  }[]
}

// Saved batch from /api/production/batches/manage
interface SavedBatch {
  id: number
  name: string
  batchType: string
  recipeName: string | null
  scheduledDate: string | null
  totalTiers: number
  totalServings: number
  totalButtercream: number
  ProductionBatchTier: {
    id: number
    CakeTier: {
      id: number
      CakeOrder: {
        id: number
        customerName: string | null
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

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  PREP: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
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

// Convert ml to cups/oz for display
function formatVolume(ml: number, multiplier: number): string {
  const totalMl = ml * multiplier
  const cups = totalMl / 236.588
  const oz = totalMl / 29.5735

  if (cups >= 1) {
    return `${cups.toFixed(1)} cups (${oz.toFixed(0)} fl oz)`
  }
  return `${oz.toFixed(1)} fl oz`
}

// Unified batch type for display
interface UnifiedBatch {
  id: string
  batchType: string
  recipeName: string
  scheduledDate: string | null
  totalTiers: number
  totalServings: number
  totalButtercreamOz: number
  orderIds: number[]
  stockItems: {
    id: number
    name: string
    quantity: number
    productType: string
  }[]
}

export default function PrintRecipePage() {
  const [batches, setBatches] = useState<UnifiedBatch[]>([])
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [weekStart, setWeekStart] = useState<string>('')
  const [selectedBatchType, setSelectedBatchType] = useState<string>('all')
  const [surplusPercent, setSurplusPercent] = useState<number>(5)
  const [useGrams, setUseGrams] = useState<boolean>(true)

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dateParam = params.get('date')
    const weekParam = params.get('weekStart')
    const typeParam = params.get('type')

    if (typeParam) {
      setSelectedBatchType(typeParam)
    }

    if (dateParam) {
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
    } else {
      // Default to WEEK view (more useful for print page)
      const today = new Date()
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      setWeekStart(getLocalDateString(monday))
      setSelectedDate(getLocalDateString(today))
      setMode('week') // Changed from 'day' to 'week' for better default
    }
  }, [])

  const weekDates = useMemo(() => weekStart ? getWeekDates(weekStart) : [], [weekStart])

  // Fetch batches and recipes - merge SAVED batches and SCHEDULED stock-only batches
  useEffect(() => {
    if (!weekStart || weekDates.length === 0) return

    const fetchData = async () => {
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

          // Convert saved batches to unified format
          for (const batch of savedBatches) {
            // Only include batches with a scheduled date
            if (!batch.scheduledDate) continue

            const batchDate = batch.scheduledDate.split('T')[0]
            if (!weekDates.includes(batchDate)) continue

            const key = `${batch.batchType}-${batch.recipeName}-${batchDate}`
            addedBatchKeys.add(key)

            // Get order IDs from tiers
            const orderIds = [...new Set(
              (batch.ProductionBatchTier || []).map((pbt: { CakeTier: { CakeOrder: { id: number } } }) => pbt.CakeTier.CakeOrder.id)
            )]

            // Calculate stock quantity (estimate 6oz per stock unit)
            const stockQuantityOz = (batch.StockProductionTask || []).reduce(
              (sum: number, task: { targetQuantity: number }) => sum + (task.targetQuantity * 6), 0
            )

            unifiedBatches.push({
              id: String(batch.id),
              batchType: batch.batchType,
              recipeName: batch.recipeName || 'Unknown',
              scheduledDate: batch.scheduledDate,
              totalTiers: batch.totalTiers || (batch.ProductionBatchTier || []).length,
              totalServings: batch.totalServings || 0,
              totalButtercreamOz: Number(batch.totalButtercream) || 0,
              orderIds: orderIds as number[],
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
              totalTiers: 0,
              totalServings: 0,
              totalButtercreamOz: 0,
              orderIds: [],
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

        // Fetch recipes for all batch recipe names
        const recipeNames = [...new Set(unifiedBatches.map(b => b.recipeName).filter(Boolean))]
        const recipeMap: Record<string, Recipe> = {}

        for (const name of recipeNames) {
          if (!name) continue
          try {
            const recipeRes = await fetch(`/api/recipes?name=${encodeURIComponent(name)}`)
            if (recipeRes.ok) {
              const recipeData = await recipeRes.json()
              // API returns array directly
              if (Array.isArray(recipeData) && recipeData[0]) {
                recipeMap[name] = recipeData[0]
              }
            }
          } catch (err) {
            console.error(`Failed to fetch recipe ${name}:`, err)
          }
        }

        setRecipes(recipeMap)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [weekStart, weekDates])

  // Filter batches by date/mode and type
  const filteredBatches = useMemo(() => {
    let result = batches

    // Filter by date
    if (mode === 'day' && selectedDate) {
      result = result.filter(b => b.scheduledDate?.split('T')[0] === selectedDate)
    } else if (mode === 'week') {
      result = result.filter(b => {
        const batchDate = b.scheduledDate?.split('T')[0]
        return batchDate && weekDates.includes(batchDate)
      })
    }

    // Filter by batch type
    if (selectedBatchType !== 'all') {
      result = result.filter(b => b.batchType === selectedBatchType)
    }

    // Sort by date then type
    result.sort((a, b) => {
      const dateA = a.scheduledDate || ''
      const dateB = b.scheduledDate || ''
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      const typeOrder = ['BAKE', 'PREP']
      return typeOrder.indexOf(a.batchType) - typeOrder.indexOf(b.batchType)
    })

    return result
  }, [batches, mode, selectedDate, weekDates, selectedBatchType])

  // Group batches by recipe name (combine same recipe on same day)
  const groupedRecipes = useMemo(() => {
    const groups: Record<string, { batches: UnifiedBatch[]; recipe: Recipe | null; date: string; displayName: string }> = {}

    for (const batch of filteredBatches) {
      const displayName = batch.recipeName
      const date = batch.scheduledDate?.split('T')[0] || ''
      const key = `${displayName}|${date}|${batch.batchType}`

      if (!groups[key]) {
        groups[key] = {
          batches: [],
          recipe: recipes[batch.recipeName] || null,
          date,
          displayName
        }
      }
      groups[key].batches.push(batch)
    }

    return Object.values(groups)
  }, [filteredBatches, recipes])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading recipes...</div>
      </div>
    )
  }

  const dateLabel = mode === 'day' && selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : `Week of ${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(weekDates[6] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - hidden when printing */}
      <div className="print:hidden bg-gray-100 border-b p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/production/batch-planner" className="text-pink-600 hover:text-pink-800">
                &larr; Back to Batch Planner
              </Link>
              <h1 className="text-lg font-bold">Print Recipes</h1>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Recipes
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-sm text-gray-600 mr-2">View:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'day' | 'week')}
                className="border rounded px-2 py-1"
              >
                <option value="day">Single Day</option>
                <option value="week">Entire Week</option>
              </select>
            </div>

            {mode === 'day' && (
              <div>
                <label className="text-sm text-gray-600 mr-2">Date:</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  {weekDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 mr-2">Type:</label>
              <select
                value={selectedBatchType}
                onChange={(e) => setSelectedBatchType(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="BAKE">BAKE (Batter)</option>
                <option value="PREP">PREP (Frosting/Filling)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mr-2">Surplus:</label>
              <select
                value={surplusPercent}
                onChange={(e) => setSurplusPercent(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={0}>0% (exact)</option>
                <option value={5}>5% (recommended)</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mr-2">Units:</label>
              <div className="inline-flex rounded border overflow-hidden">
                <button
                  onClick={() => setUseGrams(true)}
                  className={`px-3 py-1 text-sm ${useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Grams
                </button>
                <button
                  onClick={() => setUseGrams(false)}
                  className={`px-3 py-1 text-sm ${!useGrams ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Ounces
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">Production Recipes</h1>
          <p className="text-gray-600">{dateLabel}</p>
        </div>

        {/* Week Summary - Show when viewing entire week */}
        {mode === 'week' && groupedRecipes.length > 0 && (
          <div className="mb-8 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden print:break-inside-avoid">
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
              <h2 className="font-bold text-gray-800">Weekly Recipe Summary</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Recipe</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
                    {weekDates.map(date => (
                      <th key={date} className="text-center py-2 px-2 font-semibold text-gray-700">
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </th>
                    ))}
                    <th className="text-right py-2 px-2 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Group by recipe name across all days */}
                  {(() => {
                    // Build a map of recipe -> day -> quantity
                    const recipeByDay: Record<string, { type: string; days: Record<string, number>; total: number }> = {}

                    for (const group of groupedRecipes) {
                      const key = `${group.displayName}|${group.batches[0].batchType}`
                      if (!recipeByDay[key]) {
                        recipeByDay[key] = { type: group.batches[0].batchType, days: {}, total: 0 }
                      }
                      const totalServings = group.batches.reduce((sum, b) => sum + b.totalServings, 0)
                      const totalButtercream = group.batches.reduce((sum, b) => sum + (b.totalButtercreamOz || 0), 0)
                      // Include stock item quantities (estimate ~12oz per stock item)
                      const stockOz = group.batches.reduce((sum, b) => sum + b.stockItems.reduce((s, item) => s + (item.quantity * 12), 0), 0)
                      const oz = group.batches[0].batchType === 'BAKE' ? (totalServings * 2) + stockOz : totalButtercream + stockOz
                      recipeByDay[key].days[group.date] = (recipeByDay[key].days[group.date] || 0) + oz
                      recipeByDay[key].total += oz
                    }

                    return Object.entries(recipeByDay).map(([key, data]) => {
                      const [recipeName] = key.split('|')
                      const colors = TASK_TYPE_COLORS[data.type] || TASK_TYPE_COLORS.BAKE
                      return (
                        <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">{recipeName}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                              {data.type}
                            </span>
                          </td>
                          {weekDates.map(date => (
                            <td key={date} className="text-center py-2 px-2">
                              {data.days[date] ? (
                                <span className="font-mono">
                                  {useGrams
                                    ? `${Math.round(data.days[date] * 28.3495)} g`
                                    : `${Math.round(data.days[date])} oz`
                                  }
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}
                          <td className="text-right py-2 px-2 font-bold">
                            {useGrams
                              ? <>{Math.round(data.total * 28.3495)} g<span className="text-gray-500 font-normal ml-1">({(data.total * 28.3495 / 1000).toFixed(2)} kg)</span></>
                              : <>{Math.round(data.total)} oz<span className="text-gray-500 font-normal ml-1">({(data.total / 16).toFixed(1)} lbs)</span></>
                            }
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recipes */}
        {groupedRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No recipes scheduled for this {mode === 'day' ? 'day' : 'week'}.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedRecipes.map((group, index) => {
              const { batches: groupBatches, recipe, date, displayName } = group
              const firstBatch = groupBatches[0]
              const colors = TASK_TYPE_COLORS[firstBatch.batchType] || TASK_TYPE_COLORS.BAKE

              // Calculate totals
              const totalTiers = groupBatches.reduce((sum, b) => sum + b.totalTiers, 0)
              const totalServings = groupBatches.reduce((sum, b) => sum + b.totalServings, 0)
              const totalButtercream = groupBatches.reduce((sum, b) => sum + (b.totalButtercreamOz || 0), 0)

              // Get all stock items from all batches in this group
              const stockItems = groupBatches.flatMap(b => b.stockItems || [])

              // Calculate stock item quantity (estimate 12oz per stock item for cupcakes/cake pops)
              const stockQuantityOz = stockItems.reduce((sum, item) => sum + (item.quantity * 12), 0)

              // Calculate base needed amount (include stock items)
              const baseNeededOz = firstBatch.batchType === 'BAKE'
                ? (totalServings * 2) + stockQuantityOz
                : totalButtercream + stockQuantityOz

              // Apply surplus
              const surplusMultiplier = 1 + (surplusPercent / 100)
              const neededOz = baseNeededOz * surplusMultiplier
              const neededGrams = neededOz * 28.3495

              // Calculate multiplier based on yield
              const baseYieldMl = recipe?.yieldVolumeMl || 1000
              const neededMl = neededOz * 29.5735
              const multiplier = Math.ceil(neededMl / baseYieldMl * 10) / 10

              // Get order IDs
              const orderIds = [...new Set(groupBatches.flatMap(b => b.orderIds))]

              const scheduledDateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })

              return (
                <div key={`${displayName}-${date}-${index}`} className="border rounded-lg overflow-hidden print:break-inside-avoid">
                  {/* Recipe Header with Yield at Top */}
                  <div className={`${colors.bg} ${colors.border} border-b px-6 py-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${colors.text} uppercase px-2 py-0.5 bg-white/50 rounded`}>
                            {firstBatch.batchType}
                          </span>
                          <span className="text-gray-600 text-sm">for {scheduledDateLabel}</span>
                        </div>
                        <h2 className={`text-2xl font-bold ${colors.text}`}>
                          {displayName}
                        </h2>
                      </div>
                      {/* YIELD - Prominent at top right */}
                      <div className="text-right bg-white/70 rounded-lg px-4 py-2">
                        <div className="text-xs uppercase text-gray-500 font-semibold">Total Yield</div>
                        <div className={`text-2xl font-bold ${colors.text}`}>
                          {useGrams
                            ? `${Math.round(neededGrams)} g`
                            : `${Math.round(neededOz)} oz`
                          }
                        </div>
                        <div className="text-sm text-gray-600">
                          {useGrams
                            ? `(${(neededGrams / 1000).toFixed(2)} kg)`
                            : `(${(neededOz / 16).toFixed(1)} lbs)`
                          }
                        </div>
                        {surplusPercent > 0 && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            +{surplusPercent}% surplus included
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Production Summary - What this batch makes */}
                    <div className="mt-4 bg-white/50 rounded-lg p-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">This batch produces:</div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {totalTiers > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-2xl">🎂</span>
                            <span><strong>{totalTiers}</strong> cake tier{totalTiers !== 1 ? 's' : ''} ({totalServings} servings)</span>
                          </div>
                        )}
                        {stockItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-1">
                            <span className="text-2xl">{item.productType === 'CUPCAKE' ? '🧁' : '🍪'}</span>
                            <span><strong>{item.quantity}</strong> {item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recipe scaling info */}
                    {recipe && (
                      <div className="mt-3 text-sm text-gray-600">
                        Recipe scaled to: <strong>{multiplier}x</strong> base recipe
                      </div>
                    )}
                  </div>

                  {/* Timing */}
                  {recipe && (recipe.prepMinutes || recipe.bakeMinutes || recipe.coolMinutes) && (
                    <div className="bg-gray-50 px-6 py-3 border-b flex gap-6 text-sm">
                      {recipe.prepMinutes && (
                        <div>
                          <span className="text-gray-500">Prep:</span>
                          <span className="ml-1 font-medium">{recipe.prepMinutes} min</span>
                        </div>
                      )}
                      {recipe.bakeMinutes && (
                        <div>
                          <span className="text-gray-500">Bake:</span>
                          <span className="ml-1 font-medium">{recipe.bakeMinutes} min</span>
                        </div>
                      )}
                      {recipe.coolMinutes && (
                        <div>
                          <span className="text-gray-500">Cool:</span>
                          <span className="ml-1 font-medium">{recipe.coolMinutes} min</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ingredients */}
                  {recipe && ((recipe.RecipeIngredient && recipe.RecipeIngredient.length > 0) || (recipe.recipeIngredients && recipe.recipeIngredients.length > 0)) && (
                    <div className="px-6 py-4 border-b">
                      <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm">
                        Ingredients (scaled for {multiplier}x batch{surplusPercent > 0 ? ` + ${surplusPercent}% surplus` : ''})
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Handle both API formats */}
                        {(recipe.RecipeIngredient || recipe.recipeIngredients || []).map((ri: { id: number; quantity: number; Ingredient?: { name: string; unit: string }; ingredient?: { name: string; unit: string } }) => {
                          const scaledQty = Number(ri.quantity) * multiplier * surplusMultiplier
                          const displayQty = scaledQty >= 10 ? Math.round(scaledQty) : Math.round(scaledQty * 10) / 10
                          const ingredientData = ri.Ingredient || ri.ingredient

                          return (
                            <div key={ri.id} className="flex justify-between py-1 border-b border-gray-100">
                              <span className="text-gray-800">{ingredientData?.name}</span>
                              <span className="font-mono text-gray-600">
                                {displayQty} {ingredientData?.unit}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {recipe?.instructions && (
                    <div className="px-6 py-4 border-b">
                      <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm">Instructions</h3>
                      {(() => {
                        const instructions = recipe.instructions

                        // Check if it's JSON array of steps
                        if (instructions.trim().startsWith('[') && instructions.includes('"step"')) {
                          try {
                            const steps = JSON.parse(instructions) as { step: number; description: string; minutes?: number; type?: string }[]
                            return (
                              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                                {steps.map((s, i) => (
                                  <li key={i} className="leading-relaxed">
                                    <span className="font-medium">{s.description}</span>
                                    {s.minutes && (
                                      <span className="ml-2 text-xs text-gray-500">({s.minutes} min)</span>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )
                          } catch {
                            // Fall through to other formats
                          }
                        }

                        // Check if instructions contain HTML tags
                        if (instructions.includes('<') && instructions.includes('>')) {
                          return (
                            <div
                              className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100"
                              dangerouslySetInnerHTML={{ __html: instructions }}
                            />
                          )
                        }

                        // Plain text
                        return (
                          <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                            {instructions}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* No recipe found */}
                  {!recipe && (
                    <div className="px-6 py-8 text-center text-gray-500 italic">
                      Recipe details not found in database.
                      <br />
                      Please add &quot;{displayName}&quot; to the Recipes admin.
                    </div>
                  )}

                  {/* Orders covered */}
                  <div className="px-6 py-3 bg-gray-50 text-sm">
                    {orderIds.length > 0 && (
                      <>
                        <span className="text-gray-500">Covers Orders: </span>
                        <span className="font-medium">
                          {orderIds.map((id, i) => (
                            <span key={id}>
                              {i > 0 && ', '}
                              #{id}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                    {orderIds.length === 0 && stockItems.length > 0 && (
                      <span className="text-gray-500 italic">Stock production only</span>
                    )}
                  </div>
                </div>
              )
            })}
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
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
