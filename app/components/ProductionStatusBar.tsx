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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED'
  assignedToId: number | null
  assignedTo: string | null
  AssignedToStaff: Staff | null
  completedAt: string | null
  completedBy: string | null
  CompletedByStaff: Staff | null
}

interface OrderAssignment {
  id: number
  staffId: number
  Staff: Staff
}

interface ProductionStatusBarProps {
  orderId: number
  eventDate: string
  orderStatus: string
  isDelivery: boolean
  initialTasks?: Task[]
  initialAssignment?: OrderAssignment | null
}

// Production workflow steps in order
const WORKFLOW_STEPS = [
  { type: 'BAKE', label: 'Bake', icon: '🍞' },
  { type: 'PREP', label: 'Prep', icon: '🥣' },
  { type: 'STACK', label: 'Stack', icon: '🎂' },
  { type: 'DECORATE', label: 'Decorate', icon: '🎨' },
  { type: 'PACKAGE', label: 'Package', icon: '📦' },
  { type: 'DELIVERY', label: 'Deliver', icon: '🚗' },
]

const STATUS_STYLES = {
  COMPLETED: 'bg-green-500 text-white',
  IN_PROGRESS: 'bg-blue-500 text-white animate-pulse',
  PENDING: 'bg-gray-200 text-gray-500',
  BLOCKED: 'bg-red-500 text-white',
  SKIPPED: 'bg-yellow-100 text-yellow-700 line-through',
}

export default function ProductionStatusBar({
  orderId,
  eventDate,
  orderStatus,
  isDelivery,
  initialTasks = [],
  initialAssignment = null
}: ProductionStatusBarProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [staff, setStaff] = useState<Staff[]>([])
  const [assignment, setAssignment] = useState<OrderAssignment | null>(initialAssignment)
  const [loading, setLoading] = useState(initialTasks.length === 0)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [orderId])

  const loadData = async () => {
    try {
      const [tasksRes, staffRes, assignmentRes] = await Promise.all([
        fetch(`/api/production/tasks?orderId=${orderId}`),
        fetch('/api/staff?activeOnly=true'),
        fetch(`/api/production/assignment/${orderId}`)
      ])

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData)
      }

      if (assignmentRes.ok) {
        const assignmentData = await assignmentRes.json()
        setAssignment(assignmentData.assignment || null)
      }
    } catch (error) {
      console.error('Failed to load production data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group tasks by type and get the aggregate status
  const getStepStatus = (taskType: string): { status: string; task: Task | null; completedBy: string | null; completedAt: string | null } => {
    const typeTasks = tasks.filter(t => t.taskType === taskType)
    if (typeTasks.length === 0) {
      return { status: 'PENDING', task: null, completedBy: null, completedAt: null }
    }

    // If any are in progress, step is in progress
    const inProgress = typeTasks.find(t => t.status === 'IN_PROGRESS')
    if (inProgress) {
      return { status: 'IN_PROGRESS', task: inProgress, completedBy: null, completedAt: null }
    }

    // If all are completed or skipped
    const allDone = typeTasks.every(t => t.status === 'COMPLETED' || t.status === 'SKIPPED')
    if (allDone) {
      const completed = typeTasks.find(t => t.status === 'COMPLETED')
      return {
        status: 'COMPLETED',
        task: completed || typeTasks[0],
        completedBy: completed?.CompletedByStaff?.name || completed?.completedBy || null,
        completedAt: completed?.completedAt || null
      }
    }

    // If any are blocked
    const blocked = typeTasks.find(t => t.status === 'BLOCKED')
    if (blocked) {
      return { status: 'BLOCKED', task: blocked, completedBy: null, completedAt: null }
    }

    return { status: 'PENDING', task: typeTasks[0], completedBy: null, completedAt: null }
  }

  const handleAssignDecorator = async (staffId: number | null) => {
    setUpdating(true)
    try {
      if (staffId) {
        await fetch(`/api/production/assignment/${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId })
        })
      } else {
        await fetch(`/api/production/assignment/${orderId}`, {
          method: 'DELETE'
        })
      }
      await loadData()
    } catch (error) {
      console.error('Failed to update assignment:', error)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const eventDateObj = new Date(eventDate)
  const daysUntilEvent = Math.ceil((eventDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  // Filter steps based on whether it's delivery
  const visibleSteps = isDelivery
    ? WORKFLOW_STEPS
    : WORKFLOW_STEPS.filter(s => s.type !== 'DELIVERY')

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 animate-pulse">
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Production Progress</h3>
          <p className="text-xs text-gray-500">
            Event: {eventDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {daysUntilEvent > 0 && (
              <span className={`ml-2 ${daysUntilEvent <= 2 ? 'text-red-600 font-medium' : ''}`}>
                ({daysUntilEvent} day{daysUntilEvent !== 1 ? 's' : ''} away)
              </span>
            )}
            {daysUntilEvent === 0 && <span className="ml-2 text-red-600 font-bold">TODAY!</span>}
            {daysUntilEvent < 0 && <span className="ml-2 text-gray-400">(past)</span>}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          orderStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          orderStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
          orderStatus === 'CONFIRMED' ? 'bg-purple-100 text-purple-800' :
          orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {orderStatus}
        </div>
      </div>

      {/* Progress Steps */}
      {tasks.length > 0 ? (
        <div className="flex items-center justify-between mb-4">
          {visibleSteps.map((step, index) => {
            const { status, completedBy, completedAt } = getStepStatus(step.type)
            const isLast = index === visibleSteps.length - 1

            return (
              <div key={step.type} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.PENDING}`}
                    title={`${step.label}: ${status}`}
                  >
                    {status === 'COMPLETED' ? '✓' : step.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 mt-1">{step.label}</span>
                  {completedAt && (
                    <span className="text-xs text-gray-500">{formatDate(completedAt)}</span>
                  )}
                  {completedBy && (
                    <span className="text-xs text-gray-400 truncate max-w-[60px]" title={completedBy}>
                      {completedBy.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    status === 'COMPLETED' ? 'bg-green-500' :
                    status === 'IN_PROGRESS' ? 'bg-blue-300' :
                    'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          No production tasks generated yet.
          <button
            onClick={async () => {
              setUpdating(true)
              try {
                await fetch('/api/production/tasks/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId })
                })
                await loadData()
              } finally {
                setUpdating(false)
              }
            }}
            disabled={updating}
            className="ml-2 text-pink-600 hover:text-pink-700 font-medium"
          >
            {updating ? 'Generating...' : 'Generate Tasks'}
          </button>
        </div>
      )}

      {/* Assignment Row */}
      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Lead Decorator:</label>
          <select
            value={assignment?.staffId || ''}
            onChange={(e) => handleAssignDecorator(e.target.value ? parseInt(e.target.value) : null)}
            disabled={updating}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="">Unassigned</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            {tasks.filter(t => t.status === 'COMPLETED').length}/{tasks.length} tasks done
          </span>
        </div>
      </div>
    </div>
  )
}
