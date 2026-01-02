'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Staff {
  id: number
  name: string
  isManager: boolean
}

interface Task {
  id: number
  taskType: string
  taskName: string
  scheduledDate: string
  scheduledStart: string | null
  scheduledEnd: string | null
  durationMinutes: number | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED'
  notes: string | null
  orderId: number
  order: {
    id: number
    customerName: string
    eventDate: string
    theme: string | null
    colors: string | null
  }
}

interface OrderAssignment {
  orderId: number
  customerName: string
  eventDate: string
  theme: string | null
  colors: string | null
  status: string
  isLead: boolean
  tierCount: number
  tasks: Task[]
}

interface WorkerData {
  staff: Staff
  assignments: OrderAssignment[]
  stats: {
    totalOrders: number
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    inProgressTasks: number
    totalMinutes: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-yellow-100 text-yellow-800',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
  SKIPPED: 'Skipped',
}

function LoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkerAssignmentsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkerAssignmentsPageInner />
    </Suspense>
  )
}

function WorkerAssignmentsPageInner() {
  const searchParams = useSearchParams()
  const staffIdParam = searchParams.get('staffId')

  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(
    staffIdParam ? parseInt(staffIdParam) : null
  )
  const [workerData, setWorkerData] = useState<WorkerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')

  // Load staff list
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch('/api/staff?activeOnly=true')
        if (res.ok) {
          const data = await res.json()
          setAllStaff(data)
          // Auto-select first staff if none specified
          if (!selectedStaffId && data.length > 0) {
            setSelectedStaffId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load staff:', err)
      }
    }
    loadStaff()
  }, [])

  // Load worker assignments when staff selected
  useEffect(() => {
    if (!selectedStaffId) {
      setLoading(false)
      return
    }

    const loadWorkerData = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set('staffId', selectedStaffId.toString())
        params.set('range', dateRange)

        const res = await fetch(`/api/production/worker-assignments?${params}`)
        if (!res.ok) throw new Error('Failed to load worker assignments')

        const data = await res.json()
        setWorkerData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadWorkerData()
  }, [selectedStaffId, dateRange])

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      const updates: Record<string, unknown> = { status }
      if (status === 'IN_PROGRESS') {
        updates.startedAt = new Date().toISOString()
      } else if (status === 'COMPLETED') {
        updates.completedAt = new Date().toISOString()
        updates.completedById = selectedStaffId
      }

      const res = await fetch(`/api/production/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        // Refresh data
        const params = new URLSearchParams()
        params.set('staffId', selectedStaffId!.toString())
        params.set('range', dateRange)
        const refreshRes = await fetch(`/api/production/worker-assignments?${params}`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setWorkerData(data)
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  // Filter assignments based on status filter
  const filteredAssignments = workerData?.assignments.filter(assignment => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') {
      return assignment.tasks.some(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    }
    if (statusFilter === 'completed') {
      return assignment.tasks.every(t => t.status === 'COMPLETED' || t.status === 'SKIPPED')
    }
    return true
  }) || []

  if (loading && !workerData) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage your production assignments
            </p>
          </div>
        </div>

        {/* Staff Selector & Filters */}
        <div className="bg-white shadow sm:rounded-lg mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Staff Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Worker:</label>
              <select
                value={selectedStaffId || ''}
                onChange={(e) => setSelectedStaffId(parseInt(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select worker...</option>
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isManager ? '(Manager)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Range:</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                  { key: 'all', label: 'All' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setDateRange(option.key as typeof dateRange)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      dateRange === option.key
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'completed', label: 'Completed' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setStatusFilter(option.key as typeof statusFilter)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      statusFilter === option.key
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {!selectedStaffId ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">Select a worker to view their assignments.</p>
          </div>
        ) : workerData ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white shadow sm:rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{workerData.stats.totalOrders}</div>
                <div className="text-sm text-gray-500">Orders</div>
              </div>
              <div className="bg-white shadow sm:rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{workerData.stats.totalTasks}</div>
                <div className="text-sm text-gray-500">Total Tasks</div>
              </div>
              <div className="bg-white shadow sm:rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{workerData.stats.completedTasks}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="bg-white shadow sm:rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{workerData.stats.pendingTasks}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="bg-white shadow sm:rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-violet-600">
                  {Math.round(workerData.stats.totalMinutes / 60 * 10) / 10}h
                </div>
                <div className="text-sm text-gray-500">Est. Hours</div>
              </div>
            </div>

            {/* Progress Bar */}
            {workerData.stats.totalTasks > 0 && (
              <div className="bg-white shadow sm:rounded-lg mb-6 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">
                    {workerData.stats.completedTasks} of {workerData.stats.totalTasks} tasks completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${(workerData.stats.completedTasks / workerData.stats.totalTasks) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Assignments List */}
            {filteredAssignments.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">No assignments match the current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div key={assignment.orderId} className="bg-white shadow sm:rounded-lg overflow-hidden">
                    {/* Order Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-pink-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/orders/${assignment.orderId}`}
                            className="font-semibold text-violet-600 hover:text-violet-800"
                          >
                            Order #{assignment.orderId}
                          </Link>
                          <span className="text-gray-900">{assignment.customerName}</span>
                          {assignment.isLead && (
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{new Date(assignment.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                          <Link
                            href={`/production/assignment/${assignment.orderId}?staffId=${selectedStaffId}`}
                            className="text-violet-600 hover:text-violet-800 text-xs"
                          >
                            View Spec →
                          </Link>
                        </div>
                      </div>
                      {(assignment.theme || assignment.colors) && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          {assignment.theme && <span>Theme: {assignment.theme}</span>}
                          {assignment.theme && assignment.colors && <span>•</span>}
                          {assignment.colors && <span>Colors: {assignment.colors}</span>}
                        </div>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="divide-y divide-gray-100">
                      {assignment.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`px-4 py-3 flex items-center gap-4 ${
                            task.status === 'COMPLETED' ? 'bg-gray-50' : ''
                          }`}
                        >
                          {/* Status Control */}
                          {task.status === 'COMPLETED' ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : task.status === 'IN_PROGRESS' ? (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                              className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center hover:bg-green-500 transition"
                              title="Mark complete"
                            >
                              <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin" />
                            </button>
                          ) : (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                              className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-blue-500 transition"
                              title="Start task"
                            />
                          )}

                          {/* Task Info */}
                          <div className="flex-1">
                            <div className={`font-medium ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.taskName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[task.status]}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                              <span>{task.taskType}</span>
                              {task.durationMinutes && (
                                <span>• {task.durationMinutes} min</span>
                              )}
                              {task.scheduledStart && (
                                <span>• {new Date(task.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          {task.status !== 'COMPLETED' && (
                            <div className="flex items-center gap-2">
                              {task.status === 'PENDING' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                >
                                  Start
                                </button>
                              )}
                              {task.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
