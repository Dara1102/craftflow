'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import GanttChart from '@/app/components/GanttChart'

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

export default function GanttPage() {
  const searchParams = useSearchParams()
  const [tasksByDate, setTasksByDate] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

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

  const generateTasks = async () => {
    const orderIdsParam = searchParams.get('orderIds')
    if (!orderIdsParam) {
      setError('Please select orders first')
      return
    }

    setGenerating(true)
    try {
      const orderIds = orderIdsParam.split(',').map(id => parseInt(id))

      const res = await fetch('/api/production/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      })

      if (!res.ok) throw new Error('Failed to generate tasks')

      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks')
    } finally {
      setGenerating(false)
    }
  }

  const handleTaskStatusChange = async (taskId: number, status: string) => {
    try {
      const res = await fetch(`/api/production/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!res.ok) throw new Error('Failed to update task')

      // Optimistic update
      setTasksByDate(prev =>
        prev.map(group => ({
          ...group,
          tasks: group.tasks.map(task =>
            task.id === taskId ? { ...task, status } : task
          )
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div>
            <Link href="/production" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block print:hidden">
              ← Back to Production Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Production Gantt</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalTasks} task{totalTasks !== 1 ? 's' : ''} | {completedTasks} completed
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={generateTasks}
              disabled={generating}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Tasks'}
            </button>
            <button
              onClick={handlePrint}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition"
            >
              Print
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Summary */}
        {totalTasks > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 print:mb-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-indigo-600">{tasksByDate.length}</div>
                <div className="text-sm text-gray-600">Days</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">{totalTasks}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{totalTasks - completedTasks}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
          </div>
        )}

        {/* Gantt Chart */}
        {tasksByDate.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No tasks found. Generate tasks for the selected orders.</p>
            <button
              onClick={generateTasks}
              disabled={generating}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Tasks'}
            </button>
          </div>
        ) : (
          <GanttChart
            tasksByDate={tasksByDate}
            onTaskStatusChange={handleTaskStatusChange}
          />
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
