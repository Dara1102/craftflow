'use client'

import { useState, useEffect } from 'react'

interface Staff {
  id: number
  name: string
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
  assignedToId: number | null
  assignedTo: string | null
  AssignedToStaff: Staff | null
  startedAt: string | null
  completedAt: string | null
  completedById: number | null
  completedBy: string | null
  CompletedByStaff: Staff | null
  notes: string | null
}

interface TaskManagerProps {
  orderId: number
  eventDate: string
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

export default function TaskManager({ orderId, eventDate }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [orderId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksRes, staffRes] = await Promise.all([
        fetch('/api/production/tasks?orderId=' + orderId),
        fetch('/api/staff?activeOnly=true')
      ])

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const generateTasks = async () => {
    setGenerating(true)
    setError(null)
    try {
      const schedDate = new Date(new Date(eventDate).getTime() - 24 * 60 * 60 * 1000)
      const res = await fetch('/api/production/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          scheduledDate: schedDate.toISOString()
        })
      })

      if (res.ok) {
        await loadData()
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to generate tasks')
      }
    } catch (err) {
      setError('Failed to generate tasks')
    } finally {
      setGenerating(false)
    }
  }

  const updateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const res = await fetch('/api/production/tasks/' + taskId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const updated = await res.json()
        setTasks(tasks.map(t => t.id === taskId ? updated : t))
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const assignStaff = async (taskId: number, staffId: number | null) => {
    await updateTask(taskId, { assignedToId: staffId } as Partial<Task>)
  }

  const startTask = async (taskId: number) => {
    await updateTask(taskId, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString()
    } as Partial<Task>)
  }

  const completeTask = async (taskId: number, staffId?: number) => {
    await updateTask(taskId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      completedById: staffId || null
    } as Partial<Task>)
  }

  const deleteTask = async (taskId: number) => {
    if (!confirm('Delete this task?')) return

    try {
      const res = await fetch('/api/production/tasks/' + taskId, {
        method: 'DELETE'
      })

      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== taskId))
      }
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
  const totalCount = tasks.length

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Production Tasks</h3>
            <p className="text-sm text-gray-500">
              {completedCount} of {totalCount} tasks completed
            </p>
          </div>
          {tasks.length === 0 && (
            <button
              onClick={generateTasks}
              disabled={generating}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50 transition text-sm"
            >
              {generating ? 'Generating...' : 'Generate Standard Tasks'}
            </button>
          )}
        </div>

        {totalCount > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: (completedCount / totalCount) * 100 + '%' }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          <p>No tasks yet. Click Generate Standard Tasks to create a task list for this order.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {tasks.map(task => (
            <div key={task.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {task.status === 'COMPLETED' ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : task.status === 'IN_PROGRESS' ? (
                    <button
                      onClick={() => completeTask(task.id, task.assignedToId || undefined)}
                      className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center hover:bg-green-500 transition"
                      title="Mark complete"
                    >
                      <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startTask(task.id)}
                      className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-blue-500 transition"
                      title="Start task"
                    />
                  )}

                  <div>
                    <p className={'text-sm font-medium ' + (task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900')}>
                      {task.taskName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={'px-1.5 py-0.5 rounded ' + STATUS_COLORS[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {task.durationMinutes && (
                        <span>{task.durationMinutes} min</span>
                      )}
                      {task.completedAt && (
                        <span>
                          Done {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {task.CompletedByStaff && ' by ' + task.CompletedByStaff.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={task.assignedToId || ''}
                    onChange={(e) => assignStaff(task.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="text-sm border rounded px-2 py-1 focus:ring-pink-500 focus:border-pink-500"
                    disabled={task.status === 'COMPLETED'}
                  >
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Delete task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={generateTasks}
            disabled={generating}
            className="text-sm text-pink-600 hover:text-pink-800"
          >
            + Add missing standard tasks
          </button>
        </div>
      )}
    </div>
  )
}
