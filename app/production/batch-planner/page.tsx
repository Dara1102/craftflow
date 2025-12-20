'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  flavor?: string
}

interface BatchGroup {
  key: string
  taskType: string
  flavor: string | null
  date: string
  tasks: Task[]
}

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BAKE: { bg: 'bg-orange-100', text: 'text-orange-800' },
  COOL: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  FILL: { bg: 'bg-amber-100', text: 'text-amber-800' },
  FROST: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DECORATE: { bg: 'bg-pink-100', text: 'text-pink-800' },
  STACK: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  FINAL: { bg: 'bg-teal-100', text: 'text-teal-800' },
  PACKAGE: { bg: 'bg-green-100', text: 'text-green-800' },
}

export default function BatchPlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('all')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Get week range (Mon-Sun)
  const getWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  const weekDates = getWeekDates()

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    groupTasksIntoBatches()
  }, [tasks, filterType])

  const fetchTasks = async () => {
    try {
      const startDate = weekDates[0]
      const endDate = weekDates[6]
      const res = await fetch(`/api/production/tasks?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupTasksIntoBatches = () => {
    // Group by taskType + flavor + scheduledDate
    const groups: Record<string, BatchGroup> = {}

    const filtered = filterType === 'all'
      ? tasks
      : tasks.filter(t => t.taskType === filterType)

    for (const task of filtered) {
      const date = task.scheduledDate.split('T')[0]
      const flavor = extractFlavor(task.taskName) || 'Mixed'
      const key = `${task.taskType}-${flavor}-${date}`

      if (!groups[key]) {
        groups[key] = {
          key,
          taskType: task.taskType,
          flavor,
          date,
          tasks: []
        }
      }
      groups[key].tasks.push(task)
    }

    // Sort by date, then by task type order
    const taskTypeOrder = ['BAKE', 'COOL', 'FILL', 'FROST', 'DECORATE', 'STACK', 'FINAL', 'PACKAGE']
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return taskTypeOrder.indexOf(a.taskType) - taskTypeOrder.indexOf(b.taskType)
    })

    setBatchGroups(sorted)
  }

  const extractFlavor = (taskName: string): string | null => {
    const flavors = ['vanilla', 'chocolate', 'red velvet', 'lemon', 'strawberry', 'carrot']
    const lower = taskName.toLowerCase()
    for (const flavor of flavors) {
      if (lower.includes(flavor)) {
        return flavor.charAt(0).toUpperCase() + flavor.slice(1)
      }
    }
    return null
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
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
        // Update local state
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

  const getDateStats = (date: string) => {
    const dayTasks = tasks.filter(t => t.scheduledDate.split('T')[0] === date)
    const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.durationMinutes || 30), 0)
    return {
      count: dayTasks.length,
      hours: (totalMinutes / 60).toFixed(1)
    }
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Planner</h1>
          <p className="text-gray-600">Group similar tasks together for efficient production</p>
        </div>
        <Link
          href="/production"
          className="text-pink-600 hover:text-pink-800"
        >
          ← Back to Production
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Tasks
          </button>
          {Object.keys(TASK_TYPE_COLORS).map(type => {
            const colors = TASK_TYPE_COLORS[type]
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === type
                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-1`
                    : `${colors.bg} ${colors.text} opacity-60 hover:opacity-100`
                }`}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>

      {/* Week Calendar Strip */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {weekDates.map(date => {
            const stats = getDateStats(date)
            const isToday = date === new Date().toISOString().split('T')[0]
            return (
              <div
                key={date}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(date)}
                className={`flex-1 min-w-[120px] p-3 rounded-lg border-2 transition-colors ${
                  isToday
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                } ${draggedTask ? 'hover:border-pink-400 hover:bg-pink-50' : ''}`}
              >
                <div className="text-center">
                  <div className={`font-semibold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {formatDate(date)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.count} tasks
                  </div>
                  <div className="text-xs text-gray-400">
                    {stats.hours} hrs
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Batch Groups */}
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
                    const colors = TASK_TYPE_COLORS[group.taskType] || { bg: 'bg-gray-100', text: 'text-gray-800' }
                    const totalMinutes = group.tasks.reduce((sum, t) => sum + (t.durationMinutes || 30), 0)
                    const completedCount = group.tasks.filter(t => t.status === 'COMPLETED').length

                    return (
                      <div
                        key={group.key}
                        className={`${colors.bg} rounded-lg p-4 border ${colors.text.replace('text', 'border')}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className={`font-bold ${colors.text}`}>
                              {group.taskType}
                            </span>
                            {group.flavor && (
                              <span className="ml-2 text-sm opacity-75">
                                {group.flavor}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium">
                            {completedCount}/{group.tasks.length}
                          </span>
                        </div>

                        <div className="text-sm opacity-75 mb-3">
                          {Math.round(totalMinutes / 60 * 10) / 10} hours total
                        </div>

                        <div className="space-y-2">
                          {group.tasks.map(task => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={() => handleDragStart(task)}
                              className={`bg-white bg-opacity-60 rounded px-3 py-2 text-sm cursor-move hover:bg-opacity-80 transition-colors ${
                                task.status === 'COMPLETED' ? 'line-through opacity-50' : ''
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium truncate">
                                  Order #{task.orderId}
                                </span>
                                <span className="text-xs opacity-75">
                                  {task.durationMinutes || 30}m
                                </span>
                              </div>
                              {task.customerName && (
                                <div className="text-xs opacity-75 truncate">
                                  {task.customerName}
                                </div>
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

      {/* Legend */}
      <div className="mt-6 bg-white shadow rounded-lg p-4 print:hidden">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Drag & Drop</h4>
        <p className="text-sm text-gray-500">
          Drag individual tasks to a different day on the calendar strip above to reschedule them.
          Tasks are automatically grouped by type and flavor for batch processing.
        </p>
      </div>
    </div>
  )
}
