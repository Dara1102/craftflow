'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface BatchItem {
  id: number
  name: string
  batchType: string
  recipeName: string | null
  scheduledDate: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  durationDays: number
  leadTimeDays: number | null
  status: string
  assignedTo: string | null
  totalTiers: number
  totalServings?: number
  totalButtercream?: number  // oz for PREP/FROST batches
  eventDate?: string | null  // Derived from orders in batch
  orderIds?: number[]
}

interface BatchGanttChartProps {
  batches: BatchItem[]
  startDate: Date
  endDate: Date
  onBatchReschedule?: (batchId: number, newStartDate: string, newEndDate: string) => void
  onBatchClick?: (batch: BatchItem) => void
  useGrams?: boolean
}

// Batch type colors matching task types
const BATCH_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; track: string }> = {
  BAKE: { bg: 'bg-orange-200', border: 'border-orange-400', text: 'text-orange-800', track: 'bg-orange-50' },
  PREP: { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-800', track: 'bg-amber-50' },
  STACK: { bg: 'bg-indigo-200', border: 'border-indigo-400', text: 'text-indigo-800', track: 'bg-indigo-50' },
  FROST: { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-800', track: 'bg-purple-50' },
  DECORATE: { bg: 'bg-teal-200', border: 'border-teal-400', text: 'text-teal-800', track: 'bg-teal-50' },
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'opacity-60 border-dashed',
  SCHEDULED: 'opacity-100',
  IN_PROGRESS: 'ring-2 ring-yellow-400',
  COMPLETED: 'opacity-50',
}

export default function BatchGanttChart({
  batches,
  startDate,
  endDate,
  onBatchReschedule,
  onBatchClick,
  useGrams = true,
}: BatchGanttChartProps) {
  const [hoveredBatch, setHoveredBatch] = useState<number | null>(null)
  const [draggingBatch, setDraggingBatch] = useState<BatchItem | null>(null)

  // Format quantity based on unit preference
  const formatQuantity = (oz: number) => {
    if (useGrams) {
      const grams = Math.round(oz * 28.35)
      return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`
    } else {
      return oz >= 16 ? `${(oz / 16).toFixed(1)} lbs` : `${Math.round(oz)} oz`
    }
  }

  // Print handler
  const handlePrint = () => {
    window.print()
  }

  // Generate array of dates for the timeline
  const dates = useMemo(() => {
    const result: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [startDate, endDate])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Group batches by type for swim lanes
  const batchesByType = useMemo(() => {
    const grouped: Record<string, BatchItem[]> = {}
    const typeOrder = ['BAKE', 'PREP', 'STACK', 'FROST', 'DECORATE']

    // Initialize all types
    typeOrder.forEach(type => {
      grouped[type] = []
    })

    batches.forEach(batch => {
      if (!grouped[batch.batchType]) {
        grouped[batch.batchType] = []
      }
      grouped[batch.batchType].push(batch)
    })

    return grouped
  }, [batches])

  // Calculate position and width for a batch bar
  const getBatchPosition = (batch: BatchItem) => {
    const batchStart = batch.scheduledStartDate || batch.scheduledDate
    if (!batchStart) return null

    // Parse date as local time to avoid timezone shift issues
    // Extract just the date part and create a local date at noon
    const dateStr = batchStart.split('T')[0]
    const startDay = new Date(dateStr + 'T12:00:00')

    const timelineStart = new Date(startDate)
    timelineStart.setHours(12, 0, 0, 0)

    const daysDiff = Math.round((startDay.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
    const duration = batch.durationDays || 1

    if (daysDiff < 0 || daysDiff >= dates.length) return null

    return {
      left: (daysDiff / dates.length) * 100,
      width: (duration / dates.length) * 100,
      startDayIndex: daysDiff,
      endDayIndex: daysDiff + duration - 1,
    }
  }

  const handleDragStart = (e: React.DragEvent, batch: BatchItem) => {
    setDraggingBatch(batch)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, dateIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dateIndex: number) => {
    e.preventDefault()
    if (draggingBatch && onBatchReschedule) {
      const newStartDate = dates[dateIndex]
      const duration = draggingBatch.durationDays || 1
      const newEndDate = new Date(newStartDate)
      newEndDate.setDate(newEndDate.getDate() + duration - 1)

      onBatchReschedule(
        draggingBatch.id,
        newStartDate.toISOString().split('T')[0],
        newEndDate.toISOString().split('T')[0]
      )
    }
    setDraggingBatch(null)
  }

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
      {/* Print header - only shows when printing */}
      <div className="hidden print:block p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">Production Schedule - Gantt View</h1>
        <p className="text-sm text-gray-500">
          {formatDateShort(startDate)} - {formatDateShort(endDate)}
        </p>
      </div>

      {/* Toolbar with print button */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-gray-50 print:hidden">
        <div className="text-sm text-gray-600">
          {batches.length} batch{batches.length !== 1 ? 'es' : ''} scheduled
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>

      {/* Header with dates */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {/* Swim lane label column */}
          <div className="w-32 flex-shrink-0 bg-gray-50 border-r border-gray-200" />

          {/* Date headers */}
          <div className="flex-1 flex">
            {dates.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString()
              const isWeekend = date.getDay() === 0 || date.getDay() === 6

              return (
                <div
                  key={idx}
                  className={`flex-1 px-1 py-2 text-center border-l border-gray-200 ${
                    isToday ? 'bg-pink-50' : isWeekend ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500">
                    {dayNames[date.getDay()]}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                  {idx === 0 && (
                    <div className="text-xs text-gray-400">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Swim lanes by batch type */}
      <div className="divide-y divide-gray-200">
        {Object.entries(batchesByType).map(([batchType, typeBatches]) => {
          const colors = BATCH_TYPE_COLORS[batchType] || BATCH_TYPE_COLORS.PREP
          const hasBatches = typeBatches.length > 0

          return (
            <div key={batchType} className={`flex min-h-[60px] ${colors.track}`}>
              {/* Swim lane label */}
              <div className={`w-32 flex-shrink-0 px-3 py-2 border-r border-gray-200 bg-white`}>
                <div className={`text-sm font-semibold ${colors.text}`}>
                  {batchType}
                </div>
                <div className="text-xs text-gray-400">
                  {typeBatches.length} batch{typeBatches.length !== 1 ? 'es' : ''}
                </div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative">
                {/* Day grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {dates.map((date, idx) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    return (
                      <div
                        key={idx}
                        className={`flex-1 border-l border-gray-200 ${isWeekend ? 'bg-gray-50/50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        style={{ pointerEvents: 'all' }}
                      />
                    )
                  })}
                </div>

                {/* Batch bars */}
                <div className="relative h-full py-1">
                  {typeBatches.map((batch, batchIdx) => {
                    const position = getBatchPosition(batch)
                    if (!position) return null

                    const isHovered = hoveredBatch === batch.id
                    const statusStyle = STATUS_STYLES[batch.status] || ''

                    return (
                      <div
                        key={batch.id}
                        className={`absolute h-10 rounded border-2 cursor-pointer transition-all
                          ${colors.bg} ${colors.border} ${statusStyle}
                          ${isHovered ? 'shadow-lg scale-[1.02] z-10' : 'shadow'}
                        `}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          minWidth: '80px',
                          top: `${batchIdx * 44 + 4}px`,
                        }}
                        draggable={!!onBatchReschedule}
                        onDragStart={(e) => handleDragStart(e, batch)}
                        onDragEnd={() => setDraggingBatch(null)}
                        onMouseEnter={() => setHoveredBatch(batch.id)}
                        onMouseLeave={() => setHoveredBatch(null)}
                        onClick={() => onBatchClick?.(batch)}
                      >
                        <div className="px-2 py-1 h-full flex items-center justify-between overflow-hidden">
                          <div className="truncate">
                            <span className={`text-xs font-semibold ${colors.text}`}>
                              {batch.recipeName || batch.name}
                            </span>
                            {batch.totalTiers > 0 && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({batch.totalTiers} tier{batch.totalTiers !== 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          {batch.durationDays > 1 && (
                            <span className="text-xs text-gray-500 ml-1 flex-shrink-0">
                              {batch.durationDays}d
                            </span>
                          )}
                        </div>

                        {/* Hover tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full left-0 mb-2 z-20 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg whitespace-nowrap">
                            <div className="font-semibold">{batch.name}</div>
                            {batch.recipeName && (
                              <div className="text-gray-300">{batch.recipeName}</div>
                            )}
                            <div className="text-gray-300">
                              {batch.totalTiers} tier{batch.totalTiers !== 1 ? 's' : ''}
                              {batch.totalServings ? ` • ${batch.totalServings} servings` : ''}
                              {batch.durationDays > 1 ? ` • ${batch.durationDays} days` : ''}
                            </div>
                            {batch.totalButtercream !== undefined && batch.totalButtercream > 0 && (
                              <div className="text-yellow-300 font-medium">
                                {batch.batchType === 'BAKE' ? 'Batter' : 'Buttercream'}: {formatQuantity(batch.totalButtercream)}
                              </div>
                            )}
                            {batch.assignedTo && (
                              <div className="text-gray-300">Assigned: {batch.assignedTo}</div>
                            )}
                            {batch.orderIds && batch.orderIds.length > 0 && (
                              <div className="text-gray-300">
                                Orders: {batch.orderIds.map(id => `#${id}`).join(', ')}
                              </div>
                            )}
                            {batch.leadTimeDays !== null && (
                              <div className="text-gray-300">
                                Day {batch.leadTimeDays} before event
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Empty state for rows with no batches */}
                  {!hasBatches && (
                    <div className="h-10 flex items-center justify-center text-xs text-gray-400">
                      No {batchType.toLowerCase()} batches scheduled
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex flex-wrap gap-4 text-xs">
        <div className="font-medium text-gray-600">Status:</div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-dashed border-gray-400 opacity-60" />
          <span className="text-gray-500">Draft</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-gray-400" />
          <span className="text-gray-500">Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-gray-400 ring-2 ring-yellow-400" />
          <span className="text-gray-500">In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-gray-400 opacity-50" />
          <span className="text-gray-500">Completed</span>
        </div>
        <div className="ml-auto text-gray-400 print:hidden">
          Drag batches to reschedule
        </div>
      </div>
    </div>
  )
}
