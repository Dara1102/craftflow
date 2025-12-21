'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AssignmentSpec {
  order: {
    id: number
    customerName: string
    eventDate: string
    eventTime: string | null
    isDelivery: boolean
    deliveryAddress: string | null
    theme: string | null
    colors: string | null
    notes: string | null
    status: string
  }
  isLead: boolean
  tiers: Array<{
    id: number
    tierIndex: number
    size: string
    shape: string
    flavor: string | null
    frosting: string | null
    filling: string | null
    cakeboard: string | null
  }>
  decorations: Array<{
    id: number
    techniqueName: string
    customText: string | null
    quantity: number
    notes: string | null
  }>
  myTasks: Array<{
    id: number
    taskType: string
    taskName: string
    scheduledDate: string
    scheduledStart: string | null
    scheduledEnd: string | null
    durationMinutes: number | null
    status: string
    notes: string | null
  }>
  allTasks: Array<{
    id: number
    taskName: string
    status: string
    assignedToName: string | null
  }>
  recipes: Array<{
    id: number
    name: string
    type: string
    tierIndex: number
  }>
  skillRequirements: string[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-yellow-100 text-yellow-800',
}

export default function AssignmentSpecPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.orderId as string
  const staffId = searchParams.get('staffId')

  const [data, setData] = useState<AssignmentSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const params = new URLSearchParams()
        if (staffId) params.set('staffId', staffId)

        const res = await fetch(`/api/production/assignment/${orderId}?${params}`)
        if (!res.ok) throw new Error('Failed to load assignment spec')

        const result = await res.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [orderId, staffId])

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      const updates: Record<string, unknown> = { status }
      if (status === 'IN_PROGRESS') {
        updates.startedAt = new Date().toISOString()
      } else if (status === 'COMPLETED') {
        updates.completedAt = new Date().toISOString()
        if (staffId) updates.completedById = parseInt(staffId)
      }

      const res = await fetch(`/api/production/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        // Refresh data
        const params = new URLSearchParams()
        if (staffId) params.set('staffId', staffId)
        const refreshRes = await fetch(`/api/production/assignment/${orderId}?${params}`)
        if (refreshRes.ok) {
          const result = await refreshRes.json()
          setData(result)
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-600">
          {error || 'Failed to load assignment spec'}
        </div>
      </div>
    )
  }

  const eventDate = new Date(data.order.eventDate)
  const completedTasks = data.myTasks.filter(t => t.status === 'COMPLETED').length
  const totalTasks = data.myTasks.length

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={staffId ? `/production/my-tasks?staffId=${staffId}` : '/production/my-tasks'}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to My Tasks
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Assignment Spec
              </h1>
              <p className="mt-1 text-lg text-gray-600">
                Order #{data.order.id} - {data.order.customerName}
              </p>
            </div>
            {data.isLead && (
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                Order Lead
              </span>
            )}
          </div>
        </div>

        {/* Order Overview Card */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-500 rounded-lg shadow-lg p-6 text-white mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-violet-200 text-sm">Event Date</div>
              <div className="text-xl font-bold">
                {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              {data.order.eventTime && (
                <div className="text-violet-200">{data.order.eventTime}</div>
              )}
            </div>
            <div>
              <div className="text-violet-200 text-sm">Type</div>
              <div className="text-xl font-bold">
                {data.order.isDelivery ? 'Delivery' : 'Pickup'}
              </div>
            </div>
            <div>
              <div className="text-violet-200 text-sm">Tiers</div>
              <div className="text-xl font-bold">{data.tiers.length}</div>
            </div>
            <div>
              <div className="text-violet-200 text-sm">My Progress</div>
              <div className="text-xl font-bold">{completedTasks}/{totalTasks}</div>
              {totalTasks > 0 && (
                <div className="w-full bg-white/30 rounded-full h-1 mt-1">
                  <div
                    className="bg-white h-1 rounded-full"
                    style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Design Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-sm">🎨</span>
                Design Details
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {data.order.theme && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Theme</div>
                    <div className="font-medium text-gray-900">{data.order.theme}</div>
                  </div>
                )}
                {data.order.colors && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Colors</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.order.colors.split(',').map((color, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-700">
                          {color.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {data.order.notes && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-700 uppercase tracking-wider mb-1">Special Notes</div>
                  <div className="text-sm text-amber-900">{data.order.notes}</div>
                </div>
              )}
            </div>

            {/* Tiers Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-pink-100 text-pink-600 flex items-center justify-center text-sm">🎂</span>
                Cake Tiers
              </h2>

              <div className="space-y-4">
                {data.tiers.map((tier) => (
                  <div key={tier.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center font-bold">
                        {tier.tierIndex}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">{tier.size} {tier.shape}</div>
                        {tier.cakeboard && (
                          <div className="text-xs text-gray-500">Board: {tier.cakeboard}</div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Flavor</div>
                        <div className="font-medium">{tier.flavor || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Frosting</div>
                        <div className="font-medium">{tier.frosting || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Filling</div>
                        <div className="font-medium">{tier.filling || '—'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorations Section */}
            {data.decorations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-sm">✨</span>
                  Decorations
                </h2>

                <div className="space-y-3">
                  {data.decorations.map((dec) => (
                    <div key={dec.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-violet-500">•</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {dec.techniqueName}
                          {dec.quantity > 1 && <span className="text-gray-500 ml-1">×{dec.quantity}</span>}
                        </div>
                        {dec.customText && (
                          <div className="text-sm text-gray-600 mt-1">"{dec.customText}"</div>
                        )}
                        {dec.notes && (
                          <div className="text-sm text-amber-600 mt-1">{dec.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes Section */}
            {data.recipes.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-sm">📋</span>
                  Recipes
                </h2>

                <div className="space-y-2">
                  {data.recipes.map((recipe) => (
                    <div key={`${recipe.id}-${recipe.tierIndex}`} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium text-gray-900">{recipe.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({recipe.type})</span>
                      </div>
                      <span className="text-sm text-gray-500">Tier {recipe.tierIndex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Tasks & Status */}
          <div className="space-y-6">
            {/* Skills Required */}
            {data.skillRequirements.length > 0 && (
              <div className="bg-violet-50 rounded-lg p-4">
                <h3 className="font-semibold text-violet-900 mb-2">Skills Required</h3>
                <div className="flex flex-wrap gap-1">
                  {data.skillRequirements.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* My Tasks */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">My Tasks</h3>
              {data.myTasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No tasks assigned to you</p>
              ) : (
                <div className="space-y-2">
                  {data.myTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.status === 'COMPLETED' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {task.status === 'COMPLETED' ? (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : task.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                            className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5 hover:bg-green-500 transition"
                          >
                            <div className="w-2.5 h-2.5 border-2 border-white rounded-full border-t-transparent animate-spin" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                            className="w-5 h-5 border-2 border-gray-300 rounded-full mt-0.5 hover:border-blue-500 transition"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {task.taskName}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[task.status]}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {task.durationMinutes && (
                              <span className="text-xs text-gray-500">{task.durationMinutes}min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Order Tasks */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">All Order Tasks</h3>
              <div className="space-y-1">
                {/* Note: Tasks should come pre-sorted from API by proper sequence */}
                {data.allTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between py-1.5 text-sm ${
                      data.myTasks.find(t => t.id === task.id) ? 'font-medium' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        task.status === 'COMPLETED' ? 'bg-green-500' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <span className={task.status === 'COMPLETED' ? 'text-gray-500' : 'text-gray-900'}>
                        {task.taskName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {task.assignedToName || 'Unassigned'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            {data.order.isDelivery && data.order.deliveryAddress && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Delivery Address</h3>
                <p className="text-sm text-green-800">{data.order.deliveryAddress}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/orders/${data.order.id}/production`}
                className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg text-center text-sm font-medium hover:bg-violet-700 transition"
              >
                View Production Sheet
              </Link>
              <Link
                href={`/orders/${data.order.id}`}
                className="w-full py-2 px-4 border border-violet-600 text-violet-600 rounded-lg text-center text-sm font-medium hover:bg-violet-50 transition"
              >
                View Full Order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
