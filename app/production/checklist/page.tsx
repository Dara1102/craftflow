'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Task {
  id: number
  orderId: number
  taskType: string
  taskName: string
  productType: string | null
  status: string
  scheduledDate: string
  scheduledStart: string | null
  scheduledEnd: string | null
  durationMinutes: number | null
  assignedTo: string | null
  dependsOnId: number | null
}

interface DateGroup {
  date: string
  tasks: Task[]
}

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PREP: { bg: 'bg-blue-100', text: 'text-blue-800' },
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800' },
  COOL: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  FROST: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DECORATE: { bg: 'bg-pink-100', text: 'text-pink-800' },
  ASSEMBLE: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  PACKAGE: { bg: 'bg-green-100', text: 'text-green-800' },
  DELIVERY: { bg: 'bg-amber-100', text: 'text-amber-800' }
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChecklistPageInner />
    </Suspense>
  )
}

function ChecklistPageInner() {
  const searchParams = useSearchParams()
  const [tasksByDate, setTasksByDate] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [staffName, setStaffName] = useState('')
  const [showSignoffModal, setShowSignoffModal] = useState<Task | null>(null)

  useEffect(() => {
    loadTasks()
  }, [searchParams])

  const loadTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const orderIds = searchParams.get('orderIds')

      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (orderIds) params.set('orderIds', orderIds)

      const res = await fetch(`/api/production/tasks?${params}`)
      if (!res.ok) throw new Error('Failed to load tasks')

      const result = await res.json()
      setTasksByDate(result.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskToggle = async (task: Task) => {
    if (!staffName.trim()) {
      setShowSignoffModal(task)
      return
    }

    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'

    try {
      const res = await fetch(`/api/production/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completedBy: newStatus === 'COMPLETED' ? staffName : null
        })
      })

      if (!res.ok) throw new Error('Failed to update task')

      // Optimistic update
      setTasksByDate(prev =>
        prev.map(group => ({
          ...group,
          tasks: group.tasks.map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
          )
        }))
      )

      // Add signoff if completing
      if (newStatus === 'COMPLETED') {
        await fetch(`/api/production/tasks/${task.id}/signoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signoffType: 'COMPLETE',
            signedBy: staffName
          })
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleSignoff = async () => {
    if (!showSignoffModal || !staffName.trim()) return

    await handleTaskToggle(showSignoffModal)
    setShowSignoffModal(null)
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredTasksByDate = tasksByDate.map(group => ({
    ...group,
    tasks: group.tasks.filter(task => {
      if (filter === 'pending') return task.status !== 'COMPLETED'
      if (filter === 'completed') return task.status === 'COMPLETED'
      return true
    })
  })).filter(group => group.tasks.length > 0)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalTasks = tasksByDate.reduce((sum, g) => sum + g.tasks.length, 0)
  const completedTasks = tasksByDate.reduce(
    (sum, g) => sum + g.tasks.filter(t => t.status === 'COMPLETED').length,
    0
  )

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block print:hidden">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Production Checklist</h1>
            <p className="mt-1 text-sm text-gray-500">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition print:hidden"
          >
            Print
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:hidden">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your name for signoffs"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'completed')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending Only</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round((completedTasks / totalTasks) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>

        {/* Task List */}
        {filteredTasksByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No tasks found for the selected criteria.</p>
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {filteredTasksByDate.map(dateGroup => {
              const date = new Date(dateGroup.date + 'T12:00:00')
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              const dayName = dayNames[date.getDay()]
              const completed = dateGroup.tasks.filter(t => t.status === 'COMPLETED').length

              return (
                <div key={dateGroup.date} className="print:break-inside-avoid">
                  {/* Date Header */}
                  <div className="bg-gray-100 px-4 py-2 rounded-t-lg border border-gray-200 border-b-0">
                    <div className="flex justify-between items-center">
                      <h2 className="font-semibold text-gray-900">
                        {dayName}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </h2>
                      <span className="text-sm text-gray-500">
                        {completed}/{dateGroup.tasks.length} done
                      </span>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="bg-white shadow rounded-b-lg border border-gray-200 divide-y divide-gray-100 print:shadow-none">
                    {dateGroup.tasks.map(task => {
                      const colors = TASK_TYPE_COLORS[task.taskType] || TASK_TYPE_COLORS.PREP
                      const isCompleted = task.status === 'COMPLETED'

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${isCompleted ? 'bg-green-50' : ''}`}
                        >
                          <button
                            onClick={() => handleTaskToggle(task)}
                            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {isCompleted && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                                {task.taskType}
                              </span>
                              <span className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {task.taskName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Link
                                href={`/orders/${task.orderId}`}
                                className="text-pink-600 hover:text-pink-800"
                              >
                                Order #{task.orderId}
                              </Link>
                              {task.durationMinutes && (
                                <span>
                                  {task.durationMinutes < 60
                                    ? `${task.durationMinutes}m`
                                    : `${Math.floor(task.durationMinutes / 60)}h ${task.durationMinutes % 60}m`}
                                </span>
                              )}
                              {task.assignedTo && (
                                <span className="bg-gray-100 px-1 rounded">{task.assignedTo}</span>
                              )}
                            </div>
                          </div>

                          {/* Print checkbox */}
                          <div className="hidden print:block w-5 h-5 border-2 border-gray-400 rounded">
                            {isCompleted && (
                              <svg className="w-full h-full text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Signoff Modal */}
        {showSignoffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Off Task</h3>
              <p className="text-gray-600 mb-4">
                Enter your name to sign off on: <strong>{showSignoffModal.taskName}</strong>
              </p>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-pink-500 focus:border-pink-500"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSignoffModal(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignoff}
                  disabled={!staffName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
