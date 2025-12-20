'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface StaffWorkloadEntry {
  orderCount: number
  taskCount: number
  totalMinutes: number
  orders: Array<{ orderId: number; customerName: string; eventDate: string; isLead: boolean }>
}

interface PrepReviewData {
  order: {
    id: number
    customerName: string
    eventDate: string
    eventTime: string | null
    isDelivery: boolean
    deliveryAddress: string | null
    status: string
    theme: string | null
    colors: string | null
  }
  orderLead: {
    staffId: number
    staffName: string
    isManager: boolean
    assignedAt: string
  } | null
  tiers: Array<{
    id: number
    tierIndex: number
    size: string
    shape: string
    flavor: string | null
    frosting: string | null
    filling: string | null
    batterRecipe: { id: number; name: string } | null
    frostingRecipe: { id: number; name: string } | null
    fillingRecipe: { id: number; name: string } | null
    cakeboard: {
      typeId: number
      typeName: string
      shape: string | null
      sizeInches: number | null
    } | null
  }>
  tasks: Array<{
    id: number
    taskType: string
    taskName: string
    scheduledDate: string
    status: string
    assignedTo: string | null
    assignedToId: number | null
    assignedToName: string | null
  }>
  decorations: Array<{
    id: number
    techniqueName: string
    customText: string | null
    quantity: number
  }>
  prepStatus: string
  checklistItems: {
    staffAssigned: boolean
    cakeboardsConfirmed: boolean
    recipesVerified: boolean
    ingredientsInStock: boolean
    timelineApproved: boolean
  }
  autoChecks: {
    hasOrderLead: boolean
    allTiersHaveCakeboards: boolean
    allTiersHaveRecipes: boolean
    hasTasks: boolean
    allTasksAssigned: boolean
  }
  signoff: {
    signedById: number
    signedByName: string
    signedAt: string
    managerNotes: string | null
    lockedAt: string | null
  } | null
  staff: Array<{ id: number; name: string; isManager: boolean }>
  managers: Array<{ id: number; name: string; isManager: boolean }>
  cakeboardTypes: Array<{ id: number; name: string; material: string }>
  staffWorkload: Record<number, StaffWorkloadEntry>
  skillRequirements: string[]
}

type Step = 'staff' | 'cakeboards' | 'recipes' | 'ingredients' | 'timeline' | 'signoff'

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: 'staff', label: 'Staff Assignment', description: 'Assign order lead and task workers' },
  { key: 'cakeboards', label: 'Cakeboards', description: 'Confirm cakeboard for each tier' },
  { key: 'recipes', label: 'Recipes', description: 'Verify recipes are set' },
  { key: 'ingredients', label: 'Ingredients', description: 'Confirm ingredients in stock' },
  { key: 'timeline', label: 'Timeline', description: 'Review production schedule' },
  { key: 'signoff', label: 'Sign-off', description: 'Manager approval' },
]

export default function OrderPrepReviewPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [data, setData] = useState<PrepReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<Step>('staff')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/prep-review`)
      if (!res.ok) throw new Error('Failed to fetch prep review data')
      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateChecklist = async (key: keyof PrepReviewData['checklistItems'], value: boolean) => {
    if (!data) return
    setSaving(true)
    try {
      const newChecklist = { ...data.checklistItems, [key]: value }
      const res = await fetch(`/api/orders/${orderId}/prep-review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistItems: newChecklist }),
      })
      if (!res.ok) throw new Error('Failed to update checklist')
      setData({ ...data, checklistItems: newChecklist })
    } catch (err) {
      console.error('Failed to update checklist:', err)
    } finally {
      setSaving(false)
    }
  }

  const assignOrderLead = async (staffId: number) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      })
      if (!res.ok) throw new Error('Failed to assign order lead')
      await fetchData()
    } catch (err) {
      console.error('Failed to assign order lead:', err)
    } finally {
      setSaving(false)
    }
  }

  const assignTask = async (taskId: number, staffId: number | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/production/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: staffId }),
      })
      if (!res.ok) throw new Error('Failed to assign task')
      await fetchData()
    } catch (err) {
      console.error('Failed to assign task:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSignoff = async (managerId: number, notes: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/prep-review/signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedById: managerId, managerNotes: notes }),
      })
      if (!res.ok) throw new Error('Failed to sign off')
      await fetchData()
    } catch (err) {
      console.error('Failed to sign off:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading prep review...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Failed to load data'}</div>
      </div>
    )
  }

  const isLocked = !!data.signoff?.lockedAt
  const eventDate = new Date(data.order.eventDate)
  const stepIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/production/prep"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Prep Review
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Order #{data.order.id} - {data.order.customerName}
                </h1>
                <p className="text-sm text-gray-600">
                  {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  {data.order.eventTime && ` at ${data.order.eventTime}`}
                  {data.order.isDelivery ? ' • Delivery' : ' • Pickup'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLocked ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Signed Off
                </span>
              ) : data.prepStatus === 'IN_REVIEW' ? (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  In Review
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  Not Started
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex">
            {STEPS.map((step, index) => {
              const isActive = step.key === currentStep
              const isPast = index < stepIndex
              const isComplete = getStepComplete(step.key, data)

              return (
                <button
                  key={step.key}
                  onClick={() => setCurrentStep(step.key)}
                  className={`
                    flex-1 py-4 px-2 text-center border-b-2 transition-colors
                    ${isActive ? 'border-violet-600 text-violet-600' : 'border-transparent'}
                    ${isPast ? 'text-gray-600' : 'text-gray-400'}
                    hover:text-violet-600
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isComplete ? (
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">✓</span>
                    ) : (
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs
                        ${isActive ? 'border-violet-600 text-violet-600' : 'border-gray-300 text-gray-400'}
                      `}>
                        {index + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content with Order Preview Sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Order Preview Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <OrderPreviewPanel data={data} />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {currentStep === 'staff' && (
              <StaffStep
                data={data}
                onAssignLead={assignOrderLead}
                onAssignTask={assignTask}
                onChecklistChange={(v) => updateChecklist('staffAssigned', v)}
                saving={saving}
                isLocked={isLocked}
              />
            )}

            {currentStep === 'cakeboards' && (
              <CakeboardsStep
                data={data}
                onChecklistChange={(v) => updateChecklist('cakeboardsConfirmed', v)}
                onRefresh={fetchData}
                saving={saving}
                isLocked={isLocked}
              />
            )}

            {currentStep === 'recipes' && (
              <RecipesStep
                data={data}
                onChecklistChange={(v) => updateChecklist('recipesVerified', v)}
                saving={saving}
                isLocked={isLocked}
              />
            )}

            {currentStep === 'ingredients' && (
              <IngredientsStep
                data={data}
                onChecklistChange={(v) => updateChecklist('ingredientsInStock', v)}
                saving={saving}
                isLocked={isLocked}
              />
            )}

            {currentStep === 'timeline' && (
              <TimelineStep
                data={data}
                onChecklistChange={(v) => updateChecklist('timelineApproved', v)}
                saving={saving}
                isLocked={isLocked}
              />
            )}

            {currentStep === 'signoff' && (
              <SignoffStep
                data={data}
                onSignoff={handleSignoff}
                saving={saving}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => {
                  const prevIndex = stepIndex - 1
                  if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex].key)
                }}
                disabled={stepIndex === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  const nextIndex = stepIndex + 1
                  if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].key)
                }}
                disabled={stepIndex === STEPS.length - 1}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStepComplete(step: Step, data: PrepReviewData): boolean {
  switch (step) {
    case 'staff':
      return data.autoChecks.hasOrderLead && data.checklistItems.staffAssigned
    case 'cakeboards':
      return data.autoChecks.allTiersHaveCakeboards && data.checklistItems.cakeboardsConfirmed
    case 'recipes':
      return data.autoChecks.allTiersHaveRecipes && data.checklistItems.recipesVerified
    case 'ingredients':
      return data.checklistItems.ingredientsInStock
    case 'timeline':
      return data.autoChecks.hasTasks && data.checklistItems.timelineApproved
    case 'signoff':
      return !!data.signoff?.signedAt
    default:
      return false
  }
}

// Order Preview Panel Component
function OrderPreviewPanel({ data }: { data: PrepReviewData }) {
  const eventDate = new Date(data.order.eventDate)

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-pink-500 p-4 text-white">
        <div className="text-sm opacity-90">Order #{data.order.id}</div>
        <div className="text-lg font-bold">{data.order.customerName}</div>
        <div className="text-sm opacity-90 mt-1">
          {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {data.order.eventTime && ` • ${data.order.eventTime}`}
        </div>
      </div>

      {/* Design Details */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-xs">🎨</span>
          Design
        </h3>

        {data.order.theme && (
          <div className="mb-2">
            <span className="text-xs text-gray-500">Theme:</span>
            <div className="text-sm font-medium text-gray-900">{data.order.theme}</div>
          </div>
        )}

        {data.order.colors && (
          <div className="mb-2">
            <span className="text-xs text-gray-500">Colors:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.order.colors.split(',').map((color, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700"
                >
                  {color.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {!data.order.theme && !data.order.colors && (
          <p className="text-sm text-gray-400 italic">No theme/colors specified</p>
        )}
      </div>

      {/* Tiers Summary */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-pink-100 text-pink-600 flex items-center justify-center text-xs">🎂</span>
          Tiers ({data.tiers.length})
        </h3>
        <div className="space-y-2">
          {data.tiers.map((tier) => (
            <div key={tier.id} className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-medium">
                {tier.tierIndex}
              </span>
              <div className="flex-1">
                <span className="font-medium">{tier.size}</span>
                <span className="text-gray-500"> • {tier.shape}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorations */}
      {data.decorations.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs">✨</span>
            Decorations
          </h3>
          <div className="space-y-1">
            {data.decorations.map((d) => (
              <div key={d.id} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>
                  {d.techniqueName}
                  {d.quantity > 1 && <span className="text-gray-400"> ×{d.quantity}</span>}
                  {d.customText && (
                    <span className="text-gray-400 text-xs block">"{d.customText}"</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Requirements */}
      {data.skillRequirements && data.skillRequirements.length > 0 && (
        <div className="p-4 border-b bg-violet-50">
          <h3 className="text-sm font-semibold text-violet-900 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-violet-200 text-violet-700 flex items-center justify-center text-xs">⭐</span>
            Skills Required
          </h3>
          <div className="flex flex-wrap gap-1">
            {data.skillRequirements.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delivery/Pickup */}
      <div className="p-4 bg-gray-50">
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            data.order.isDelivery ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {data.order.isDelivery ? 'Delivery' : 'Pickup'}
          </span>
          {data.order.isDelivery && data.order.deliveryAddress && (
            <span className="text-gray-500 text-xs truncate flex-1" title={data.order.deliveryAddress}>
              {data.order.deliveryAddress}
            </span>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="p-3 border-t bg-gray-50 flex gap-2">
        <Link
          href={`/orders/${data.order.id}`}
          className="flex-1 text-center py-1.5 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded transition"
        >
          Edit Order
        </Link>
        <Link
          href={`/orders/${data.order.id}/costing`}
          className="flex-1 text-center py-1.5 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded transition"
        >
          Costing
        </Link>
        <Link
          href={`/orders/${data.order.id}/production`}
          className="flex-1 text-center py-1.5 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded transition"
        >
          Prod Sheet
        </Link>
      </div>
    </div>
  )
}

// Step Components

function StaffStep({
  data,
  onAssignLead,
  onAssignTask,
  onChecklistChange,
  saving,
  isLocked,
}: {
  data: PrepReviewData
  onAssignLead: (staffId: number) => void
  onAssignTask: (taskId: number, staffId: number | null) => void
  onChecklistChange: (v: boolean) => void
  saving: boolean
  isLocked: boolean
}) {
  const [showWorkload, setShowWorkload] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)

  // Get workload info for a staff member
  const getWorkloadInfo = (staffId: number) => {
    const workload = data.staffWorkload?.[staffId]
    if (!workload) return { orderCount: 0, taskCount: 0, totalMinutes: 0, orders: [] }
    return workload
  }

  // Workload level indicator
  const getWorkloadLevel = (staffId: number) => {
    const workload = getWorkloadInfo(staffId)
    const hours = workload.totalMinutes / 60
    if (hours >= 6) return { level: 'high', color: 'text-red-600 bg-red-100', label: 'Heavy' }
    if (hours >= 3) return { level: 'medium', color: 'text-amber-600 bg-amber-100', label: 'Moderate' }
    return { level: 'low', color: 'text-green-600 bg-green-100', label: 'Light' }
  }

  return (
    <div className="space-y-6">
      {/* Staff Workload Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Staff Workload</h2>
            <p className="text-sm text-gray-500">View staff availability before making assignments</p>
          </div>
          <button
            onClick={() => setShowWorkload(!showWorkload)}
            className="text-sm text-violet-600 hover:text-violet-800"
          >
            {showWorkload ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Workload Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.staff.map((s) => {
            const workload = getWorkloadInfo(s.id)
            const { color, label } = getWorkloadLevel(s.id)
            const hours = Math.round(workload.totalMinutes / 60 * 10) / 10

            return (
              <button
                key={s.id}
                onClick={() => setSelectedStaffId(selectedStaffId === s.id ? null : s.id)}
                className={`p-3 rounded-lg border text-left transition ${
                  selectedStaffId === s.id
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                  {s.isManager && (
                    <span className="text-xs text-violet-600">M</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {workload.orderCount} orders • {hours}h
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Staff Detail */}
        {selectedStaffId && showWorkload && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">
                {data.staff.find(s => s.id === selectedStaffId)?.name}'s Assignments
              </h3>
              <Link
                href={`/production/my-tasks?staffId=${selectedStaffId}`}
                className="text-xs text-violet-600 hover:text-violet-800"
              >
                View Full Schedule →
              </Link>
            </div>
            <div className="space-y-2">
              {getWorkloadInfo(selectedStaffId).orders.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No assignments this week</p>
              ) : (
                getWorkloadInfo(selectedStaffId).orders.map((order, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${order.isLead ? 'bg-violet-500' : 'bg-gray-400'}`} />
                    <span className="text-gray-700">
                      #{order.orderId} - {order.customerName}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(order.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {order.isLead && (
                      <span className="text-xs text-violet-600">(Lead)</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Lead Assignment */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Lead</h2>
        <p className="text-sm text-gray-600 mb-4">
          Assign a staff member as the primary lead for this order.
        </p>

        <div className="flex items-center gap-4">
          <select
            value={data.orderLead?.staffId || ''}
            onChange={(e) => onAssignLead(parseInt(e.target.value))}
            disabled={isLocked || saving}
            className="flex-1 max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
          >
            <option value="">Select order lead...</option>
            {data.staff.map((s) => {
              const workload = getWorkloadInfo(s.id)
              const hours = Math.round(workload.totalMinutes / 60 * 10) / 10
              return (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isManager ? '(Manager)' : ''} • {workload.orderCount} orders, {hours}h
                </option>
              )
            })}
          </select>
          {data.orderLead && (
            <span className="text-sm text-gray-500">
              Assigned {new Date(data.orderLead.assignedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {!data.autoChecks.hasOrderLead && (
          <p className="mt-2 text-sm text-amber-600">⚠ Order lead not yet assigned</p>
        )}
      </div>

      {/* Task Assignments */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Assignments</h2>
        <p className="text-sm text-gray-600 mb-4">
          Assign staff to individual production tasks. Workload shown in dropdown.
        </p>

        {data.tasks.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-amber-800 text-sm">
              ⚠ No production tasks generated yet.{' '}
              <Link href={`/orders/${data.order.id}`} className="underline">
                Generate tasks from order page
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{task.taskName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(task.scheduledDate).toLocaleDateString()} • {task.taskType}
                    {task.assignedToId && (
                      <span className="ml-2">
                        • {(() => {
                          const { label, color } = getWorkloadLevel(task.assignedToId)
                          return <span className={`px-1 py-0.5 rounded text-xs ${color}`}>{label}</span>
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={task.assignedToId || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    onAssignTask(task.id, val ? parseInt(val) : null)
                  }}
                  disabled={isLocked || saving}
                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
                >
                  <option value="">Unassigned</option>
                  {data.staff.map((s) => {
                    const workload = getWorkloadInfo(s.id)
                    const hours = Math.round(workload.totalMinutes / 60 * 10) / 10
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({hours}h)
                      </option>
                    )
                  })}
                </select>
              </div>
            ))}
          </div>
        )}

        {data.tasks.length > 0 && !data.autoChecks.allTasksAssigned && (
          <p className="mt-4 text-sm text-amber-600">
            ⚠ {data.tasks.filter(t => !t.assignedToId).length} task(s) still unassigned
          </p>
        )}
      </div>

      {/* Confirmation Checkbox */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.checklistItems.staffAssigned}
            onChange={(e) => onChecklistChange(e.target.checked)}
            disabled={isLocked || saving}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div>
            <div className="font-medium text-gray-900">Staff assignments confirmed</div>
            <div className="text-sm text-gray-500">
              Order lead and all task assignments have been reviewed
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

function CakeboardsStep({
  data,
  onChecklistChange,
  onRefresh,
  saving,
  isLocked,
}: {
  data: PrepReviewData
  onChecklistChange: (v: boolean) => void
  onRefresh: () => void
  saving: boolean
  isLocked: boolean
}) {
  const [updating, setUpdating] = useState(false)
  const [selectedShape, setSelectedShape] = useState<string>(
    data.tiers[0]?.cakeboard?.shape || data.tiers[0]?.shape || 'round'
  )
  const [selectedSize, setSelectedSize] = useState<string>(
    data.tiers[0]?.cakeboard?.sizeInches?.toString() || ''
  )
  const [selectedType, setSelectedType] = useState<number | ''>(
    data.tiers[0]?.cakeboard?.typeId || ''
  )

  // Bottom tier is the one that needs the cakeboard
  const bottomTier = data.tiers.reduce((bottom, tier) =>
    !bottom || tier.tierIndex > bottom.tierIndex ? tier : bottom
  , data.tiers[0])

  const hasCakeboard = !!bottomTier?.cakeboard

  const updateCakeboard = async () => {
    if (!bottomTier || !selectedType) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/production/tiers/${bottomTier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cakeboardTypeId: selectedType,
          cakeboardShape: selectedShape,
          cakeboardSizeInches: selectedSize ? parseInt(selectedSize) : null
        }),
      })
      if (!res.ok) throw new Error('Failed to update cakeboard')
      await onRefresh()
    } catch (err) {
      console.error('Failed to update cakeboard:', err)
    } finally {
      setUpdating(false)
    }
  }

  // Get suggested size based on bottom tier
  const suggestedSize = bottomTier ? parseInt(bottomTier.size) + 2 : 12

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cakeboard</h2>
        <p className="text-sm text-gray-600 mb-6">
          One cakeboard goes under the bottom tier of the cake.
        </p>

        {/* Cake Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Cake Structure</div>
          <div className="flex items-center gap-2">
            {data.tiers.map((tier, idx) => (
              <span key={tier.id} className="flex items-center">
                {idx > 0 && <span className="text-gray-300 mx-1">/</span>}
                <span className={`px-2 py-1 rounded text-sm ${
                  tier.id === bottomTier?.id
                    ? 'bg-violet-100 text-violet-700 font-medium'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tier.size} {tier.shape}
                </span>
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Bottom tier: {bottomTier?.size} {bottomTier?.shape} (highlighted)
          </div>
        </div>

        {/* Cakeboard Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shape */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
            <select
              value={selectedShape}
              onChange={(e) => setSelectedShape(e.target.value)}
              disabled={isLocked || updating}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
            >
              <option value="round">Round</option>
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
              <option value="heart">Heart</option>
            </select>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size (inches)
              <span className="text-gray-400 font-normal ml-1">suggested: {suggestedSize}"</span>
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              disabled={isLocked || updating}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
            >
              <option value="">Select size...</option>
              {[6, 8, 10, 12, 14, 16, 18, 20].map(size => (
                <option key={size} value={size}>
                  {size}" {size === suggestedSize ? '(recommended)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value ? parseInt(e.target.value) : '')}
              disabled={isLocked || updating}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
            >
              <option value="">Select type...</option>
              {data.cakeboardTypes.map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={updateCakeboard}
            disabled={isLocked || updating || !selectedType || !selectedSize}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {updating ? 'Saving...' : 'Save Cakeboard'}
          </button>

          {hasCakeboard && (
            <span className="text-green-600 flex items-center gap-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cakeboard assigned
            </span>
          )}
        </div>

        {!hasCakeboard && (
          <p className="mt-4 text-sm text-amber-600">
            ⚠ Cakeboard not yet assigned
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.checklistItems.cakeboardsConfirmed}
            onChange={(e) => onChecklistChange(e.target.checked)}
            disabled={isLocked || saving}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div>
            <div className="font-medium text-gray-900">Cakeboard confirmed</div>
            <div className="text-sm text-gray-500">
              Cakeboard shape, size, and type have been verified
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

function RecipesStep({
  data,
  onChecklistChange,
  saving,
  isLocked,
}: {
  data: PrepReviewData
  onChecklistChange: (v: boolean) => void
  saving: boolean
  isLocked: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipe Verification</h2>
        <p className="text-sm text-gray-600 mb-4">
          Verify that all tier recipes are set correctly.
        </p>

        <div className="space-y-4">
          {data.tiers.map((tier) => (
            <div key={tier.id} className="p-4 border rounded-lg">
              <div className="font-medium text-gray-900 mb-2">
                Tier {tier.tierIndex}: {tier.size} {tier.shape}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Batter:</span>
                  <div className={tier.batterRecipe || tier.flavor ? 'text-gray-900' : 'text-amber-600'}>
                    {tier.batterRecipe?.name || tier.flavor || '⚠ Not set'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Frosting:</span>
                  <div className={tier.frostingRecipe || tier.frosting ? 'text-gray-900' : 'text-amber-600'}>
                    {tier.frostingRecipe?.name || tier.frosting || '⚠ Not set'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Filling:</span>
                  <div className="text-gray-900">
                    {tier.fillingRecipe?.name || tier.filling || 'None'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!data.autoChecks.allTiersHaveRecipes && (
          <p className="mt-4 text-sm text-amber-600">
            ⚠ Some tiers are missing recipe assignments
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-medium text-gray-900 mb-3">Decorations</h3>
        {data.decorations.length === 0 ? (
          <p className="text-gray-500 italic">No decorations on this order.</p>
        ) : (
          <ul className="space-y-2">
            {data.decorations.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <span className="text-violet-600">•</span>
                <span>{d.techniqueName}</span>
                {d.quantity > 1 && <span className="text-gray-500">x{d.quantity}</span>}
                {d.customText && <span className="text-gray-400">"{d.customText}"</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.checklistItems.recipesVerified}
            onChange={(e) => onChecklistChange(e.target.checked)}
            disabled={isLocked || saving}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div>
            <div className="font-medium text-gray-900">Recipes verified</div>
            <div className="text-sm text-gray-500">
              All batter, frosting, and filling recipes are correct
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

function IngredientsStep({
  data,
  onChecklistChange,
  saving,
  isLocked,
}: {
  data: PrepReviewData
  onChecklistChange: (v: boolean) => void
  saving: boolean
  isLocked: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingredients Check</h2>
        <p className="text-sm text-gray-600 mb-4">
          Confirm that all required ingredients are in stock or ordered.
        </p>

        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-xl">ℹ</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Review Shopping List</p>
              <p>
                Use the{' '}
                <Link href={`/production/shopping-list?orderIds=${data.order.id}`} className="underline">
                  Shopping List
                </Link>
                {' '}to see all ingredients needed for this order and verify stock levels.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-medium text-gray-900 mb-2">Recipes Used:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {data.tiers.flatMap(t => [
              t.batterRecipe?.name,
              t.frostingRecipe?.name,
              t.fillingRecipe?.name,
            ]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((name, i) => (
              <li key={i}>• {name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.checklistItems.ingredientsInStock}
            onChange={(e) => onChecklistChange(e.target.checked)}
            disabled={isLocked || saving}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div>
            <div className="font-medium text-gray-900">Ingredients in stock</div>
            <div className="text-sm text-gray-500">
              All required ingredients are available or have been ordered
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

function TimelineStep({
  data,
  onChecklistChange,
  saving,
  isLocked,
}: {
  data: PrepReviewData
  onChecklistChange: (v: boolean) => void
  saving: boolean
  isLocked: boolean
}) {
  const tasksByDate = data.tasks.reduce((acc, task) => {
    const date = new Date(task.scheduledDate).toLocaleDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(task)
    return acc
  }, {} as Record<string, typeof data.tasks>)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Production Timeline</h2>
        <p className="text-sm text-gray-600 mb-4">
          Review the production schedule and task assignments.
        </p>

        {data.tasks.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-amber-800">
              ⚠ No production tasks have been generated for this order.{' '}
              <Link href={`/orders/${data.order.id}`} className="underline">
                Generate tasks
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tasksByDate).map(([date, tasks]) => (
              <div key={date}>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  {date}
                </h3>
                <div className="ml-4 space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                    >
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'}
                      `}>
                        {task.taskType}
                      </span>
                      <span className="flex-1 text-sm text-gray-900">{task.taskName}</span>
                      <span className="text-sm text-gray-500">
                        {task.assignedToName || 'Unassigned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Link
            href={`/production/gantt?orderIds=${data.order.id}`}
            className="text-violet-600 hover:text-violet-800 text-sm"
          >
            View full Gantt chart →
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.checklistItems.timelineApproved}
            onChange={(e) => onChecklistChange(e.target.checked)}
            disabled={isLocked || saving}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div>
            <div className="font-medium text-gray-900">Timeline approved</div>
            <div className="text-sm text-gray-500">
              Production schedule is realistic and has been reviewed
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

function SignoffStep({
  data,
  onSignoff,
  saving,
}: {
  data: PrepReviewData
  onSignoff: (managerId: number, notes: string) => void
  saving: boolean
}) {
  const [selectedManager, setSelectedManager] = useState<number>(data.managers[0]?.id || 0)
  const [notes, setNotes] = useState('')

  const allChecklistComplete = Object.values(data.checklistItems).every(Boolean)
  const allAutoChecksPass = data.autoChecks.hasOrderLead &&
    data.autoChecks.allTiersHaveCakeboards &&
    data.autoChecks.allTiersHaveRecipes &&
    data.autoChecks.hasTasks

  const canSignOff = allChecklistComplete && allAutoChecksPass && !data.signoff

  if (data.signoff) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xl">
              ✓
            </span>
            <div>
              <h2 className="text-lg font-semibold text-green-900">Order Signed Off</h2>
              <p className="text-sm text-green-700">
                This order has been approved for production
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-green-700">Signed by:</span>{' '}
              <span className="font-medium text-green-900">{data.signoff.signedByName}</span>
            </div>
            <div>
              <span className="text-green-700">Signed at:</span>{' '}
              <span className="text-green-900">
                {new Date(data.signoff.signedAt).toLocaleString()}
              </span>
            </div>
            {data.signoff.managerNotes && (
              <div>
                <span className="text-green-700">Notes:</span>{' '}
                <span className="text-green-900">{data.signoff.managerNotes}</span>
              </div>
            )}
            {data.signoff.lockedAt && (
              <div className="pt-2 border-t border-green-200">
                <span className="text-green-600 text-xs">
                  Order locked at {new Date(data.signoff.lockedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manager Sign-off</h2>
        <p className="text-sm text-gray-600 mb-4">
          Final manager approval before production begins. This will lock the order configuration.
        </p>

        {/* Checklist Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Checklist Summary</h3>
          <div className="space-y-2">
            <CheckItem label="Order lead assigned" checked={data.autoChecks.hasOrderLead} />
            <CheckItem label="Staff assignments confirmed" checked={data.checklistItems.staffAssigned} />
            <CheckItem label="All tiers have cakeboards" checked={data.autoChecks.allTiersHaveCakeboards} />
            <CheckItem label="Cakeboards confirmed" checked={data.checklistItems.cakeboardsConfirmed} />
            <CheckItem label="All tiers have recipes" checked={data.autoChecks.allTiersHaveRecipes} />
            <CheckItem label="Recipes verified" checked={data.checklistItems.recipesVerified} />
            <CheckItem label="Ingredients in stock" checked={data.checklistItems.ingredientsInStock} />
            <CheckItem label="Production tasks exist" checked={data.autoChecks.hasTasks} />
            <CheckItem label="Timeline approved" checked={data.checklistItems.timelineApproved} />
          </div>
        </div>

        {!canSignOff && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg">
            <p className="text-amber-800">
              ⚠ Complete all checklist items before signing off
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(parseInt(e.target.value))}
              disabled={!canSignOff || saving}
              className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
            >
              <option value="">Select manager...</option>
              {data.managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canSignOff || saving}
              rows={3}
              placeholder="Any special instructions or notes..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
            />
          </div>

          <button
            onClick={() => onSignoff(selectedManager, notes)}
            disabled={!canSignOff || !selectedManager || saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Signing off...' : 'Sign Off & Lock Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <span className="text-green-600">✓</span>
      ) : (
        <span className="text-gray-400">○</span>
      )}
      <span className={checked ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
    </div>
  )
}
