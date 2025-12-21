'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Flavors {
  batters: string[]
  fillings: string[]
  frostings: string[]
}

interface Task {
  id: number
  orderId: number
  taskType: string
  taskName: string
  productType: string | null
  status: string
  scheduledDate: string
  durationMinutes: number | null
  assignedTo: string | null
  customerName?: string
  // Order details
  eventDate: string | null
  eventTime: string | null
  isDelivery: boolean
  cakeSize: string | null
  tierCount: number
  isBulkOrder: boolean
  bulkQuantity: number | null
  flavors: Flavors
}

interface BatchGroup {
  key: string
  taskType: string
  flavor: string | null
  date: string
  tasks: Task[]
}

// Task sequence: BAKE → PREP → STACK → COOL → FROST → FINAL → PACKAGE
const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  PREP: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  STACK: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  COOL: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  FROST: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  FINAL: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  PACKAGE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  // Legacy task types
  DECORATE: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  FILL: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
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
  const [tasks, setTasks] = useState<Task[]>([])
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = next week, etc.

  // Memoize week dates to prevent infinite loop
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  // Fetch tasks when week changes
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const startDate = weekDates[0]
        const endDate = weekDates[6]
        const res = await fetch(`/api/production/tasks?startDate=${startDate}&endDate=${endDate}`)
        if (res.ok) {
          const data = await res.json()
          // Flatten grouped tasks into single array
          const allTasks: Task[] = []
          if (data.tasks && Array.isArray(data.tasks)) {
            for (const dateGroup of data.tasks) {
              if (dateGroup.tasks && Array.isArray(dateGroup.tasks)) {
                allTasks.push(...dateGroup.tasks)
              }
            }
          }
          setTasks(allTasks)
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [weekDates])

  useEffect(() => {
    groupTasksIntoBatches()
  }, [tasks, filterType])

  const groupTasksIntoBatches = () => {
    const groups: Record<string, BatchGroup> = {}

    const filtered = filterType === 'all'
      ? tasks
      : tasks.filter(t => t.taskType === filterType)

    for (const task of filtered) {
      const date = task.scheduledDate.split('T')[0]
      // Use actual flavors from the order
      const flavorStr = task.flavors?.batters?.join(', ') || 'Mixed'
      const key = `${task.taskType}-${flavorStr}-${date}`

      if (!groups[key]) {
        groups[key] = {
          key,
          taskType: task.taskType,
          flavor: flavorStr,
          date,
          tasks: []
        }
      }
      groups[key].tasks.push(task)
    }

    // Sort by date, then by task type order
    const taskTypeOrder = ['BAKE', 'PREP', 'STACK', 'COOL', 'FROST', 'FINAL', 'PACKAGE', 'DECORATE', 'FILL']
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return taskTypeOrder.indexOf(a.taskType) - taskTypeOrder.indexOf(b.taskType)
    })

    setBatchGroups(sorted)
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetDate: string) => {
    if (!draggedTask) return

    try {
      const res = await fetch(`/api/production/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: targetDate })
      })

      if (res.ok) {
        setTasks(prev => prev.map(t =>
          t.id === draggedTask.id
            ? { ...t, scheduledDate: targetDate + 'T00:00:00.000Z' }
            : t
        ))
      }
    } catch (error) {
      console.error('Failed to reschedule task:', error)
    }

    setDraggedTask(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
  }

  const getDateStats = (date: string) => {
    const dayTasks = tasks.filter(t => t.scheduledDate.split('T')[0] === date)
    const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.durationMinutes || 30), 0)
    return {
      count: dayTasks.length,
      hours: (totalMinutes / 60).toFixed(1)
    }
  }

  const getWeekLabel = () => {
    const start = new Date(weekDates[0] + 'T12:00:00')
    const end = new Date(weekDates[6] + 'T12:00:00')
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startStr} - ${endStr}`
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
      {/* Sticky Header with Date Strip */}
      <div className="sticky top-0 z-20 bg-white shadow-md">
        {/* Title Bar */}
        <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Batch Planner</h1>
            <p className="text-sm text-gray-500">Drag tasks to reschedule</p>
          </div>
          <Link
            href="/production"
            className="text-pink-600 hover:text-pink-800 text-sm"
          >
            ← Back to Production
          </Link>
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
                  } ${draggedTask ? 'hover:border-pink-400 hover:bg-pink-50 hover:scale-105' : ''}`}
                >
                  <div className={`font-semibold text-sm ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {formatShortDate(date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.count} tasks
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
              All ({tasks.length})
            </button>
            {Object.keys(TASK_TYPE_COLORS).slice(0, 7).map(type => {
              const colors = TASK_TYPE_COLORS[type]
              const count = tasks.filter(t => t.taskType === type).length
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

      {/* Batch Groups Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="space-y-4">
          {weekDates.map(date => {
            const dayGroups = batchGroups.filter(g => g.date === date)
            if (dayGroups.length === 0) return null

            return (
              <div key={date} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">{formatDate(date)}</h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayGroups.map(group => {
                      const colors = TASK_TYPE_COLORS[group.taskType] || TASK_TYPE_COLORS.BAKE
                      const totalMinutes = group.tasks.reduce((sum, t) => sum + (t.durationMinutes || 30), 0)
                      const completedCount = group.tasks.filter(t => t.status === 'COMPLETED').length

                      return (
                        <div
                          key={group.key}
                          className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`font-bold ${colors.text}`}>
                                {group.taskType}
                              </span>
                            </div>
                            <span className="text-sm font-medium opacity-75">
                              {completedCount}/{group.tasks.length}
                            </span>
                          </div>

                          {group.flavor && group.flavor !== 'Mixed' && (
                            <div className="text-sm opacity-80 mb-2">
                              {group.flavor}
                            </div>
                          )}

                          <div className="text-xs opacity-60 mb-3">
                            {Math.round(totalMinutes / 60 * 10) / 10} hours total
                          </div>

                          <div className="space-y-2">
                            {group.tasks.map(task => {
                              const dueDate = task.eventDate ? new Date(task.eventDate) : null
                              const dueTime = task.eventTime ? new Date(task.eventTime) : null
                              const dueDateStr = dueDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              const dueTimeStr = dueTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                              const cakeDesc = task.tierCount > 0
                                ? `${task.tierCount}-tier`
                                : task.cakeSize || ''

                              // Build flavor summary
                              const flavorSummary = []
                              if (task.flavors?.batters?.length > 0) {
                                flavorSummary.push(task.flavors.batters.join('/'))
                              }
                              if (task.flavors?.frostings?.length > 0) {
                                flavorSummary.push(task.flavors.frostings.join('/'))
                              }

                              return (
                                <div
                                  key={task.id}
                                  draggable
                                  onDragStart={() => handleDragStart(task)}
                                  onDragEnd={handleDragEnd}
                                  className={`bg-white rounded px-3 py-2 text-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border border-gray-200 ${
                                    task.status === 'COMPLETED' ? 'opacity-50' : ''
                                  } ${draggedTask?.id === task.id ? 'opacity-50 ring-2 ring-pink-400' : ''}`}
                                >
                                  {/* Row 1: Order # and Due Date */}
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold">#{task.orderId}</span>
                                      {task.isBulkOrder && (
                                        <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded font-medium">
                                          BULK{task.bulkQuantity ? ` x${task.bulkQuantity}` : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right text-xs shrink-0">
                                      <div className="font-semibold text-red-600">
                                        Due {dueDateStr || 'TBD'}
                                      </div>
                                      {dueTimeStr && (
                                        <div className="text-gray-500">
                                          {task.isDelivery ? '🚚' : '🏪'} {dueTimeStr}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Row 2: Customer */}
                                  <div className="text-xs text-gray-600 mt-1 truncate">
                                    {task.customerName}
                                  </div>

                                  {/* Row 3: Cake description and flavors */}
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-medium text-gray-700">
                                        {cakeDesc || 'Cake'}
                                      </span>
                                      <span className="text-gray-400">
                                        {task.durationMinutes || 30}m
                                      </span>
                                    </div>
                                    {flavorSummary.length > 0 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {flavorSummary.join(' • ')}
                                      </div>
                                    )}
                                    {task.flavors?.fillings?.length > 0 && (
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        Fill: {task.flavors.fillings.join(', ')}
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {batchGroups.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500">No tasks scheduled for this week</p>
            <Link
              href="/production/prep"
              className="text-pink-600 hover:text-pink-800 mt-2 inline-block"
            >
              Go to Prep Review to generate tasks
            </Link>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">How to Use</h4>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• <strong>Drag</strong> any task card and <strong>drop</strong> it on a date in the header to reschedule</li>
            <li>• Use <strong>Prev/Next Week</strong> to view and plan future weeks</li>
            <li>• Tasks are grouped by type and batter flavor for efficient batching</li>
            <li>• <span className="text-orange-500 font-medium">BULK</span> orders are highlighted for priority</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
