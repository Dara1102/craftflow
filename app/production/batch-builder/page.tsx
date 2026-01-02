'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

// Types
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
  occasion: string | null
  theme: string | null
  colors: string | null
  imageUrl: string | null
  finishType: string | null
  batterName: string | null
  frostingName: string | null
  diameterInches: number
  surfaceAreaSqIn: number
  buttercreamOz: number
  complexity: number
}

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

interface SavedBatch {
  id: number
  name: string
  batchType: string
  recipeName: string | null
  scheduledDate: string | null
  status: string
  totalTiers: number
  totalServings: number
  totalButtercream: number
  ProductionBatchTier: {
    id: number
    CakeTier: {
      id: number
      tierIndex: number
      TierSize: { name: string; servings: number } | null
      CakeOrder: {
        id: number
        customerName: string | null
        eventDate: string
      }
    }
  }[]
  StockProductionTask?: {
    id: number
    taskName: string
    targetQuantity: number
    InventoryItem: { id: number; name: string; productType: string }
  }[]
}

// Workflow steps
const WORKFLOW_STEPS = [
  { step: 1, title: 'Choose Recipe', description: 'Select what you\'re making (batter, buttercream, etc.)' },
  { step: 2, title: 'Add Items', description: 'Drag orders & products into your batch bucket' },
  { step: 3, title: 'Review Totals', description: 'Check quantities and servings needed' },
  { step: 4, title: 'Schedule', description: 'Pick a date and save your batch' },
]

const TASK_TYPE_INFO: Record<string, { label: string; icon: string; color: string; unit: string }> = {
  BAKE: { label: 'Cake Batter', icon: '🎂', color: 'orange', unit: 'oz batter' },
  PREP: { label: 'Buttercream/Filling', icon: '🧈', color: 'amber', unit: 'oz frosting' },
}

export default function BatchBuilderPage() {
  const [batches, setBatches] = useState<RecipeBatch[]>([])
  const [savedBatches, setSavedBatches] = useState<SavedBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeBatch | null>(null)
  const [bucketItems, setBucketItems] = useState<Set<number>>(new Set()) // tier IDs in bucket
  const [bucketStockItems, setBucketStockItems] = useState<Set<number>>(new Set()) // stock task IDs
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Get week dates for scheduling
  const weekDates = useMemo(() => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [batchesRes, savedRes] = await Promise.all([
          fetch('/api/production/batches'),
          fetch('/api/production/batches/manage')
        ])

        if (batchesRes.ok) {
          const data = await batchesRes.json()
          setBatches(data.batches || [])
        }
        if (savedRes.ok) {
          const data = await savedRes.json()
          setSavedBatches(data.batches || [])
        }
      } catch (error) {
        console.error('Failed to fetch:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Group batches by task type
  const batchesByType = useMemo(() => {
    const grouped: Record<string, RecipeBatch[]> = { BAKE: [], PREP: [] }
    for (const batch of batches) {
      if (grouped[batch.taskType]) {
        grouped[batch.taskType].push(batch)
      }
    }
    return grouped
  }, [batches])

  // Calculate bucket totals
  const bucketTotals = useMemo(() => {
    if (!selectedRecipe) return { tiers: 0, servings: 0, oz: 0, items: [] }

    const selectedTiers = selectedRecipe.tiers.filter(t => bucketItems.has(t.tierId))
    const selectedStock = selectedRecipe.stockItems.filter(s => bucketStockItems.has(s.stockTaskId))

    const tierOz = selectedRecipe.taskType === 'BAKE'
      ? selectedTiers.reduce((sum, t) => sum + t.servings * 2, 0) // rough estimate: 2oz per serving for batter
      : selectedTiers.reduce((sum, t) => sum + t.buttercreamOz, 0)

    const stockOz = selectedStock.reduce((sum, s) => sum + s.recipeQuantityOz, 0)

    return {
      tiers: selectedTiers.length,
      servings: selectedTiers.reduce((sum, t) => sum + t.servings, 0),
      oz: tierOz + stockOz,
      stockItems: selectedStock.length,
      items: [
        ...selectedTiers.map(t => ({
          type: 'tier' as const,
          id: t.tierId,
          label: `Order #${t.orderId} - ${t.sizeName}`,
          customer: t.customerName,
          servings: t.servings,
          oz: selectedRecipe.taskType === 'BAKE' ? t.servings * 2 : t.buttercreamOz
        })),
        ...selectedStock.map(s => ({
          type: 'stock' as const,
          id: s.stockTaskId,
          label: `${s.itemName} x${s.quantity}`,
          customer: 'Stock',
          servings: 0,
          oz: s.recipeQuantityOz
        }))
      ]
    }
  }, [selectedRecipe, bucketItems, bucketStockItems])

  // Handle recipe selection
  const handleSelectRecipe = (batch: RecipeBatch) => {
    setSelectedRecipe(batch)
    setBucketItems(new Set())
    setBucketStockItems(new Set())
    setScheduledDate('')
    setCurrentStep(2)
  }

  // Toggle item in bucket
  const toggleTierInBucket = (tierId: number) => {
    setBucketItems(prev => {
      const next = new Set(prev)
      if (next.has(tierId)) {
        next.delete(tierId)
      } else {
        next.add(tierId)
      }
      return next
    })
  }

  const toggleStockInBucket = (stockTaskId: number) => {
    setBucketStockItems(prev => {
      const next = new Set(prev)
      if (next.has(stockTaskId)) {
        next.delete(stockTaskId)
      } else {
        next.add(stockTaskId)
      }
      return next
    })
  }

  // Add all items to bucket
  const addAllToBucket = () => {
    if (!selectedRecipe) return
    setBucketItems(new Set(selectedRecipe.tiers.map(t => t.tierId)))
    setBucketStockItems(new Set(selectedRecipe.stockItems.map(s => s.stockTaskId)))
  }

  // Clear bucket
  const clearBucket = () => {
    setBucketItems(new Set())
    setBucketStockItems(new Set())
  }

  // Save batch
  const handleSaveBatch = async () => {
    if (!selectedRecipe || (bucketItems.size === 0 && bucketStockItems.size === 0)) return

    setSaving(true)
    try {
      const res = await fetch('/api/production/batches/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedRecipe.recipe} Batch`,
          batchType: selectedRecipe.taskType,
          recipeName: selectedRecipe.recipe,
          scheduledDate: scheduledDate || null,
          tierIds: Array.from(bucketItems),
          stockTaskIds: Array.from(bucketStockItems)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSavedBatches(prev => [...prev, data.batch])

        // Reset and refresh
        setSelectedRecipe(null)
        setBucketItems(new Set())
        setBucketStockItems(new Set())
        setScheduledDate('')
        setCurrentStep(1)

        // Refresh suggested batches
        const batchesRes = await fetch('/api/production/batches')
        if (batchesRes.ok) {
          const batchData = await batchesRes.json()
          setBatches(batchData.batches || [])
        }
      }
    } catch (error) {
      console.error('Failed to save batch:', error)
    } finally {
      setSaving(false)
    }
  }

  // Format helpers
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatOz = (oz: number) => {
    if (oz >= 16) {
      return `${(oz / 16).toFixed(1)} lbs`
    }
    return `${Math.round(oz)} oz`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">🥣</span> Batch Builder
              </h1>
              <p className="text-sm text-gray-500">Build your production batches like mixing a recipe</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/production/batch-planner"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Switch to Classic View →
              </Link>
              <Link
                href="/production"
                className="text-pink-600 hover:text-pink-800"
              >
                ← Back
              </Link>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="mt-4 flex gap-2">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.step}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  currentStep === step.step
                    ? 'bg-pink-50 border-pink-400 shadow-md'
                    : currentStep > step.step
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === step.step
                      ? 'bg-pink-500 text-white'
                      : currentStep > step.step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.step ? '✓' : step.step}
                  </span>
                  <span className={`font-semibold text-sm ${
                    currentStep === step.step ? 'text-pink-700' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6">
          {/* Left Panel - Recipe Selection & Available Items */}
          <div className="w-1/2 space-y-4">
            {/* Recipe Selection */}
            {!selectedRecipe ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">1</span>
                  What are you making today?
                </h2>

                {Object.entries(batchesByType).map(([type, typeBatches]) => {
                  const info = TASK_TYPE_INFO[type]
                  if (typeBatches.length === 0) return null

                  return (
                    <div key={type} className="mb-6">
                      <h3 className={`font-semibold text-${info.color}-700 mb-3 flex items-center gap-2`}>
                        <span className="text-xl">{info.icon}</span>
                        {info.label} ({typeBatches.length} recipes)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {typeBatches.map(batch => (
                          <button
                            key={batch.id}
                            onClick={() => handleSelectRecipe(batch)}
                            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
                              type === 'BAKE'
                                ? 'border-orange-200 bg-orange-50 hover:border-orange-400'
                                : 'border-amber-200 bg-amber-50 hover:border-amber-400'
                            }`}
                          >
                            <div className="font-bold text-gray-900">{batch.recipe}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {batch.tiers.length} tiers + {batch.stockItems.length} stock items
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ~{formatOz(batch.totalButtercreamOz + batch.totalStockQuantityOz)} needed
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {batches.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recipes need batching right now!</p>
                    <Link href="/orders" className="text-pink-600 hover:text-pink-800 mt-2 inline-block">
                      Check your orders →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Available Items to Add */
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className={`px-6 py-4 ${
                  selectedRecipe.taskType === 'BAKE' ? 'bg-orange-100' : 'bg-amber-100'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <button
                        onClick={() => {
                          setSelectedRecipe(null)
                          setCurrentStep(1)
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800 mb-1"
                      >
                        ← Choose different recipe
                      </button>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {TASK_TYPE_INFO[selectedRecipe.taskType]?.icon} {selectedRecipe.recipe}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addAllToBucket}
                        className="px-3 py-1 text-sm bg-white rounded-lg shadow hover:shadow-md"
                      >
                        Add All →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  <h3 className="font-semibold text-gray-700 mb-3">Available Items (click to add)</h3>

                  {/* Tiers from orders */}
                  {selectedRecipe.tiers.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-500 mb-2">Order Tiers</div>
                      <div className="space-y-2">
                        {selectedRecipe.tiers.map(tier => {
                          const inBucket = bucketItems.has(tier.tierId)
                          return (
                            <div
                              key={tier.tierId}
                              onClick={() => toggleTierInBucket(tier.tierId)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                inBucket
                                  ? 'border-green-400 bg-green-50 opacity-50'
                                  : 'border-gray-200 bg-white hover:border-pink-300 hover:shadow-md'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    Order #{tier.orderId} - {tier.customerName}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {tier.sizeName} • {tier.servings} servings
                                  </div>
                                  {tier.occasion && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {tier.occasion} {tier.theme && `• ${tier.theme}`}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-red-600">
                                    Due {formatDate(tier.dueDate)}
                                  </div>
                                  {inBucket ? (
                                    <span className="text-xs text-green-600">✓ In bucket</span>
                                  ) : (
                                    <span className="text-xs text-pink-600">+ Add</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stock items */}
                  {selectedRecipe.stockItems.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-2">Stock Products</div>
                      <div className="space-y-2">
                        {selectedRecipe.stockItems.map(stock => {
                          const inBucket = bucketStockItems.has(stock.stockTaskId)
                          return (
                            <div
                              key={stock.stockTaskId}
                              onClick={() => toggleStockInBucket(stock.stockTaskId)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                inBucket
                                  ? 'border-green-400 bg-green-50 opacity-50'
                                  : 'border-gray-200 bg-white hover:border-pink-300 hover:shadow-md'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {stock.itemName}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Quantity: {stock.quantity} • {stock.recipeQuantityOz} oz needed
                                  </div>
                                </div>
                                <div className="text-right">
                                  {inBucket ? (
                                    <span className="text-xs text-green-600">✓ In bucket</span>
                                  ) : (
                                    <span className="text-xs text-pink-600">+ Add</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Batches */}
            {savedBatches.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Recently Saved Batches ({savedBatches.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedBatches.slice(0, 5).map(batch => (
                    <div key={batch.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{batch.recipeName || batch.name}</div>
                          <div className="text-sm text-gray-600">
                            {batch.totalTiers} tiers • {batch.status}
                          </div>
                        </div>
                        {batch.scheduledDate && (
                          <div className="text-sm text-green-700 font-medium">
                            {formatDate(batch.scheduledDate.split('T')[0])}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Batch Bucket */}
          <div className="w-1/2">
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden sticky top-[200px] transition-all ${
              bucketTotals.items.length > 0 ? 'ring-4 ring-pink-300' : ''
            }`}>
              {/* Bucket Header */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">🪣</span>
                  Your Batch Bucket
                </h2>
                {selectedRecipe && (
                  <p className="text-pink-100 text-sm">
                    Building: {selectedRecipe.recipe}
                  </p>
                )}
              </div>

              {/* Bucket Contents */}
              <div className="p-6">
                {!selectedRecipe ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4">🪣</div>
                    <p className="text-lg">Your bucket is empty</p>
                    <p className="text-sm mt-1">Choose a recipe to start building your batch</p>
                  </div>
                ) : bucketTotals.items.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4 animate-bounce">👆</div>
                    <p className="text-lg">Click items on the left to add them</p>
                    <p className="text-sm mt-1">Or use "Add All" to include everything</p>
                  </div>
                ) : (
                  <>
                    {/* Running Totals - Prominent Display */}
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 mb-4 border-2 border-pink-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-3xl font-bold text-pink-600">{bucketTotals.tiers + (bucketTotals.stockItems || 0)}</div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Items</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-pink-600">{bucketTotals.servings}</div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Servings</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-pink-600">{formatOz(bucketTotals.oz)}</div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">
                            {TASK_TYPE_INFO[selectedRecipe.taskType]?.unit || 'Total'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items in Bucket */}
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {bucketTotals.items.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.label}</div>
                              <div className="text-xs text-gray-500">{item.customer}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{formatOz(item.oz)}</span>
                            <button
                              onClick={() => item.type === 'tier'
                                ? toggleTierInBucket(item.id)
                                : toggleStockInBucket(item.id)
                              }
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={clearBucket}
                      className="text-sm text-red-500 hover:text-red-700 mb-4"
                    >
                      Clear bucket
                    </button>

                    {/* Schedule & Save */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        When will you make this batch?
                      </label>
                      <select
                        value={scheduledDate}
                        onChange={(e) => {
                          setScheduledDate(e.target.value)
                          if (e.target.value) setCurrentStep(4)
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Select a date (optional)</option>
                        {weekDates.map(date => (
                          <option key={date} value={date}>
                            {formatDate(date)}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleSaveBatch}
                        disabled={saving || bucketTotals.items.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      >
                        {saving ? (
                          'Saving...'
                        ) : (
                          <>
                            Save Batch ({bucketTotals.items.length} items • {formatOz(bucketTotals.oz)})
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
