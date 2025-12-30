'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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
  tierIds?: number[]  // Tier IDs in this batch for dependency tracking
}

interface BatchTypeConfig {
  code: string
  name: string
  dependsOn: string[]
  color: string | null
}

interface DependencyConnection {
  fromBatchId: number
  toBatchId: number
  fromType: string
  toType: string
  // Positions as percentages
  fromX: number  // End of source batch
  fromY: number  // Center of source batch row
  toX: number    // Start of target batch
  toY: number    // Center of target batch row
  isMissing: boolean  // True if dependency not satisfied
}

interface BatchGanttChartProps {
  batches: BatchItem[]
  startDate: Date
  endDate: Date
  onBatchReschedule?: (batchId: number, newStartDate: string, newEndDate: string) => void
  onBatchClick?: (batch: BatchItem) => void
  useGrams?: boolean
  batchTypeConfigs?: BatchTypeConfig[]  // For showing dependency info
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
  batchTypeConfigs = [],
}: BatchGanttChartProps) {
  // Build dependency lookup from batch type configs
  const dependencyMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const config of batchTypeConfigs) {
      map[config.code] = config.dependsOn
    }
    return map
  }, [batchTypeConfigs])
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

  // Swim lane type order
  const typeOrder = ['BAKE', 'PREP', 'STACK', 'FROST', 'DECORATE']

  // Group batches by type for swim lanes
  const batchesByType = useMemo(() => {
    const grouped: Record<string, BatchItem[]> = {}

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

  // Calculate dependency connections between batches
  const dependencyConnections = useMemo(() => {
    const connections: DependencyConnection[] = []
    const SWIM_LANE_HEIGHT = 60  // min-h-[60px]
    const BATCH_BAR_HEIGHT = 44  // Height per batch row within lane
    const HEADER_OFFSET = 0      // Relative to swim lane container

    // For each batch that has dependencies, find matching prerequisite batches
    batches.forEach(batch => {
      const dependencies = dependencyMap[batch.batchType]
      if (!dependencies || dependencies.length === 0) return

      const batchPos = getBatchPosition(batch)
      if (!batchPos) return

      // Find this batch's index within its type group
      const batchTypeIndex = batchesByType[batch.batchType]?.findIndex(b => b.id === batch.id) ?? 0
      const toRowIndex = typeOrder.indexOf(batch.batchType)
      if (toRowIndex === -1) return

      // For each dependency type, find related batches
      dependencies.forEach(depType => {
        const depBatches = batchesByType[depType] || []
        const fromRowIndex = typeOrder.indexOf(depType)
        if (fromRowIndex === -1) return

        // Find batches that share tier IDs with this batch
        const relatedBatches = depBatches.filter(depBatch => {
          if (!batch.tierIds || !depBatch.tierIds) return false
          return batch.tierIds.some(tid => depBatch.tierIds?.includes(tid))
        })

        if (relatedBatches.length > 0) {
          // Draw arrows from related batches
          relatedBatches.forEach(depBatch => {
            const depPos = getBatchPosition(depBatch)
            if (!depPos) return

            const depBatchIndex = batchesByType[depType]?.findIndex(b => b.id === depBatch.id) ?? 0

            // Calculate cumulative heights for each swim lane
            let fromYOffset = 0
            let toYOffset = 0
            for (let i = 0; i < fromRowIndex; i++) {
              const laneBatches = batchesByType[typeOrder[i]] || []
              fromYOffset += Math.max(SWIM_LANE_HEIGHT, laneBatches.length * BATCH_BAR_HEIGHT + 8)
            }
            for (let i = 0; i < toRowIndex; i++) {
              const laneBatches = batchesByType[typeOrder[i]] || []
              toYOffset += Math.max(SWIM_LANE_HEIGHT, laneBatches.length * BATCH_BAR_HEIGHT + 8)
            }

            // Add offset for batch position within its lane
            fromYOffset += depBatchIndex * BATCH_BAR_HEIGHT + 24  // Center of batch bar
            toYOffset += batchTypeIndex * BATCH_BAR_HEIGHT + 24

            connections.push({
              fromBatchId: depBatch.id,
              toBatchId: batch.id,
              fromType: depType,
              toType: batch.batchType,
              fromX: depPos.left + depPos.width,  // End of source batch
              toX: batchPos.left,                  // Start of target batch
              fromY: fromYOffset,
              toY: toYOffset,
              isMissing: false,
            })
          })
        }
      })
    })

    return connections
  }, [batches, batchesByType, dependencyMap])

  // Get IDs of batches connected to the hovered batch (for chain highlighting)
  const connectedBatchIds = useMemo(() => {
    if (!hoveredBatch) return new Set<number>()
    const connected = new Set<number>([hoveredBatch])

    // Add all batches connected via dependencies
    dependencyConnections.forEach(conn => {
      if (conn.fromBatchId === hoveredBatch || conn.toBatchId === hoveredBatch) {
        connected.add(conn.fromBatchId)
        connected.add(conn.toBatchId)
      }
    })

    return connected
  }, [hoveredBatch, dependencyConnections])

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
      <div className="relative">
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
                    const isConnected = connectedBatchIds.has(batch.id)
                    const isDimmed = hoveredBatch !== null && !isConnected
                    const statusStyle = STATUS_STYLES[batch.status] || ''

                    return (
                      <div
                        key={batch.id}
                        className={`absolute h-10 rounded border-2 cursor-pointer transition-all
                          ${colors.bg} ${colors.border} ${statusStyle}
                          ${isHovered ? 'shadow-lg scale-[1.02] z-10' : 'shadow'}
                          ${isConnected && !isHovered ? 'ring-2 ring-indigo-400 ring-opacity-50' : ''}
                          ${isDimmed ? 'opacity-40' : ''}
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
                            {/* Show dependencies from config */}
                            {dependencyMap[batch.batchType]?.length > 0 && (
                              <div className="text-blue-300 mt-1 pt-1 border-t border-gray-700">
                                Depends on: {dependencyMap[batch.batchType].join(', ')}
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

        {/* Dependency arrows SVG overlay */}
        {dependencyConnections.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none print:hidden"
            style={{ left: '128px', width: 'calc(100% - 128px)' }}
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6366f1"
                  fillOpacity="0.7"
                />
              </marker>
              <marker
                id="arrowhead-missing"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#f59e0b"
                  fillOpacity="0.7"
                />
              </marker>
            </defs>
            {dependencyConnections.map((conn, idx) => {
              // Calculate bezier control points for a smooth curve
              const x1 = `${conn.fromX}%`
              const y1 = conn.fromY
              const x2 = `${conn.toX}%`
              const y2 = conn.toY

              // Control points - curve out horizontally then down/up
              const midX = (conn.fromX + conn.toX) / 2
              const ctrlX1 = `${Math.min(conn.fromX + 5, midX)}%`
              const ctrlX2 = `${Math.max(conn.toX - 5, midX)}%`

              // Highlight if connected to hovered batch
              const isHighlighted = hoveredBatch !== null &&
                (conn.fromBatchId === hoveredBatch || conn.toBatchId === hoveredBatch)
              const isDimmed = hoveredBatch !== null && !isHighlighted

              return (
                <path
                  key={`dep-${conn.fromBatchId}-${conn.toBatchId}-${idx}`}
                  d={`M ${x1} ${y1} C ${ctrlX1} ${y1}, ${ctrlX2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={conn.isMissing ? '#f59e0b' : '#6366f1'}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeOpacity={isDimmed ? 0.2 : isHighlighted ? 0.9 : 0.6}
                  strokeDasharray={conn.isMissing ? '4 2' : 'none'}
                  markerEnd={conn.isMissing ? 'url(#arrowhead-missing)' : 'url(#arrowhead)'}
                  className={isHighlighted ? 'transition-all duration-150' : ''}
                />
              )
            })}
          </svg>
        )}
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
        {dependencyConnections.length > 0 && (
          <>
            <div className="border-l border-gray-300 mx-2" />
            <div className="flex items-center gap-1">
              <svg width="20" height="10">
                <path d="M 0 5 L 15 5" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.6" />
                <polygon points="15,2 20,5 15,8" fill="#6366f1" fillOpacity="0.7" />
              </svg>
              <span className="text-gray-500">Dependency</span>
            </div>
          </>
        )}
        <div className="ml-auto text-gray-400 print:hidden">
          Drag batches to reschedule
        </div>
      </div>
    </div>
  )
}
