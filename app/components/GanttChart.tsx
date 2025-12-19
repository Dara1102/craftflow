'use client'

import { useState } from 'react'
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
  customerName?: string
}

interface DateGroup {
  date: string
  tasks: Task[]
}

interface GanttChartProps {
  tasksByDate: DateGroup[]
  onTaskStatusChange?: (taskId: number, status: string) => void
}

const TASK_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PREP: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  BAKE: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  COOL: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
  FROST: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  DECORATE: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  ASSEMBLE: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
  PACKAGE: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  DELIVERY: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-200',
  IN_PROGRESS: 'bg-yellow-400',
  COMPLETED: 'bg-green-500',
  BLOCKED: 'bg-red-300',
  SKIPPED: 'bg-gray-400'
}

export default function GanttChart({ tasksByDate, onTaskStatusChange }: GanttChartProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(
    new Set(tasksByDate.map(d => d.date))
  )

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate timeline hours (6am to 8pm)
  const timelineHours = Array.from({ length: 15 }, (_, i) => i + 6)

  return (
    <div className="space-y-4">
      {tasksByDate.map(dateGroup => {
        const date = new Date(dateGroup.date + 'T12:00:00')
        const dayName = dayNames[date.getDay()]
        const isExpanded = expandedDates.has(dateGroup.date)
        const completedCount = dateGroup.tasks.filter(t => t.status === 'COMPLETED').length
        const totalCount = dateGroup.tasks.length

        return (
          <div key={dateGroup.date} className="bg-white shadow rounded-lg overflow-hidden print:shadow-none print:border">
            {/* Date Header */}
            <button
              onClick={() => toggleDate(dateGroup.date)}
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 print:cursor-default"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-gray-900">
                  {dayName}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <span className="text-sm text-gray-500">
                  {totalCount} task{totalCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{completedCount}/{totalCount}</span>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform print:hidden ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Tasks */}
            {(isExpanded || true) && (
              <div className={`${isExpanded ? '' : 'hidden print:block'}`}>
                {/* Timeline Header */}
                <div className="hidden md:flex border-b border-gray-200 bg-gray-50">
                  <div className="w-64 flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-500">
                    Task
                  </div>
                  <div className="flex-1 flex">
                    {timelineHours.map(hour => (
                      <div key={hour} className="flex-1 px-1 py-2 text-xs text-gray-400 text-center border-l border-gray-200">
                        {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Rows */}
                <div className="divide-y divide-gray-100">
                  {dateGroup.tasks.map(task => {
                    const colors = TASK_TYPE_COLORS[task.taskType] || TASK_TYPE_COLORS.PREP
                    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING
                    const duration = task.durationMinutes || 30

                    // Calculate bar position (simplified - based on task type order)
                    const taskTypeOrder = ['PREP', 'BAKE', 'COOL', 'FROST', 'DECORATE', 'ASSEMBLE', 'PACKAGE', 'DELIVERY']
                    const typeIndex = taskTypeOrder.indexOf(task.taskType)
                    const startHour = 6 + typeIndex * 1.5
                    const barLeft = ((startHour - 6) / 14) * 100
                    const barWidth = Math.max((duration / 60 / 14) * 100, 5)

                    return (
                      <div key={task.id} className="flex items-center hover:bg-gray-50">
                        {/* Task Info */}
                        <div className="w-64 flex-shrink-0 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                              {task.taskType}
                            </span>
                            <div
                              className={`w-3 h-3 rounded-full ${statusColor}`}
                              title={task.status}
                            />
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1 truncate" title={task.taskName}>
                            {task.taskName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Link
                              href={`/orders/${task.orderId}`}
                              className="text-pink-600 hover:text-pink-800"
                            >
                              #{task.orderId}
                            </Link>
                            {task.durationMinutes && (
                              <span>{formatDuration(task.durationMinutes)}</span>
                            )}
                            {task.assignedTo && (
                              <span className="bg-gray-100 px-1 rounded">{task.assignedTo}</span>
                            )}
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="hidden md:block flex-1 h-10 relative">
                          <div
                            className={`absolute top-1 h-8 rounded ${colors.bg} ${colors.border} border flex items-center px-2`}
                            style={{
                              left: `${barLeft}%`,
                              width: `${barWidth}%`,
                              minWidth: '60px'
                            }}
                          >
                            <span className={`text-xs font-medium ${colors.text} truncate`}>
                              {formatDuration(task.durationMinutes)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex-shrink-0 px-3 print:hidden">
                          {task.status === 'PENDING' && onTaskStatusChange && (
                            <button
                              onClick={() => onTaskStatusChange(task.id, 'IN_PROGRESS')}
                              className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                            >
                              Start
                            </button>
                          )}
                          {task.status === 'IN_PROGRESS' && onTaskStatusChange && (
                            <button
                              onClick={() => onTaskStatusChange(task.id, 'COMPLETED')}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              Complete
                            </button>
                          )}
                          {task.status === 'COMPLETED' && (
                            <span className="text-xs text-green-600">Done</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Legend */}
      <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(TASK_TYPE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                {type}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-xs text-gray-600">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
