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

interface DependencyArrow {
  fromBatchId: number
  toBatchId: number
  fromType: string
  toType: string
  isMissing: boolean  // True if dependency batch doesn't exist
}

interface BatchTypeConfig {
  code: string
  name: string
  dependsOn: string[]
  color: string | null
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
  ASSEMBLE: { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-800', track: 'bg-purple-50' },
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
  const [hoveredArrowChain, setHoveredArrowChain] = useState<number[] | null>(null)
  const [draggingBatch, setDraggingBatch] = useState<BatchItem | null>(null)
  const [showArrows, setShowArrows] = useState(true)
  const swimLanesRef = useRef<HTMLDivElement>(null)
  const [arrowPositions, setArrowPositions] = useState<{
    arrows: Array<{
      from: { x: number; y: number }
      to: { x: number; y: number }
      fromBatchId: number
      toBatchId: number
      isMissing: boolean
    }>
    containerHeight: number
  }>({ arrows: [], containerHeight: 0 })

  // Calculate dependency arrows between batches that share tier IDs
  const dependencyArrows = useMemo(() => {
    const arrows: DependencyArrow[] = []

    batches.forEach(batch => {
      const deps = dependencyMap[batch.batchType] || []
      if (deps.length === 0 || !batch.tierIds || batch.tierIds.length === 0) return

      deps.forEach(depType => {
        // Find batches of the dependency type that share tier IDs
        const depBatches = batches.filter(b =>
          b.batchType === depType &&
          b.tierIds &&
          b.tierIds.some(tid => batch.tierIds?.includes(tid))
        )

        if (depBatches.length > 0) {
          // Connect to matching dependency batches
          depBatches.forEach(depBatch => {
            arrows.push({
              fromBatchId: depBatch.id,
              toBatchId: batch.id,
              fromType: depType,
              toType: batch.batchType,
              isMissing: false
            })
          })
        }
      })
    })

    return arrows
  }, [batches, dependencyMap, batchTypeConfigs])

  // Get all batches in the same dependency chain as a given batch
  const getChainBatchIds = (batchId: number): number[] => {
    const chainIds = new Set<number>([batchId])
    let changed = true

    while (changed) {
      changed = false
      dependencyArrows.forEach(arrow => {
        if (chainIds.has(arrow.fromBatchId) && !chainIds.has(arrow.toBatchId)) {
          chainIds.add(arrow.toBatchId)
          changed = true
        }
        if (chainIds.has(arrow.toBatchId) && !chainIds.has(arrow.fromBatchId)) {
          chainIds.add(arrow.fromBatchId)
          changed = true
        }
      })
    }

    return Array.from(chainIds)
  }

  // Calculate arrow positions after render
  useEffect(() => {
    if (!swimLanesRef.current || dependencyArrows.length === 0) {
      setArrowPositions({ arrows: [], containerHeight: 0 })
      return
    }

    // Use requestAnimationFrame to ensure DOM is fully rendered
    const calculatePositions = () => {
      const container = swimLanesRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const calculatedArrows: typeof arrowPositions.arrows = []

      dependencyArrows.forEach(arrow => {
        const fromEl = container.querySelector(`[data-batch-id="${arrow.fromBatchId}"]`)
        const toEl = container.querySelector(`[data-batch-id="${arrow.toBatchId}"]`)

        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect()
          const toRect = toEl.getBoundingClientRect()

          calculatedArrows.push({
            from: {
              x: fromRect.right - containerRect.left,
              y: fromRect.top + fromRect.height / 2 - containerRect.top
            },
            to: {
              x: toRect.left - containerRect.left,
              y: toRect.top + toRect.height / 2 - containerRect.top
            },
            fromBatchId: arrow.fromBatchId,
            toBatchId: arrow.toBatchId,
            isMissing: arrow.isMissing
          })
        }
      })

      setArrowPositions({
        arrows: calculatedArrows,
        containerHeight: containerRect.height
      })
    }

    // Wait for DOM to be ready
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(calculatePositions)
    })

    return () => cancelAnimationFrame(rafId)
  }, [dependencyArrows, batches, hoveredBatch, batchTypeConfigs])

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
    const typeOrder = ['BAKE', 'PREP', 'STACK', 'ASSEMBLE', 'DECORATE']

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
          {dependencyArrows.length > 0 && (
            <span className="text-gray-400 ml-2">
              • {dependencyArrows.length} connection{dependencyArrows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dependencyArrows.length > 0 && (
            <button
              onClick={() => setShowArrows(!showArrows)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                showArrows
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              {showArrows ? 'Hide' : 'Show'} Dependencies
            </button>
          )}
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
      <div className="divide-y divide-gray-200 relative overflow-hidden" ref={swimLanesRef}>
        {/* SVG overlay for dependency arrows */}
        {showArrows && arrowPositions.arrows.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none z-20"
            style={{ width: '100%', height: arrowPositions.containerHeight || '100%' }}
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
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker
                id="arrowhead-highlighted"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
              </marker>
              <marker
                id="arrowhead-missing"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
            </defs>
            {arrowPositions.arrows.map((arrow, idx) => {
              const isInChain = hoveredArrowChain?.includes(arrow.fromBatchId) ||
                               hoveredArrowChain?.includes(arrow.toBatchId)
              const isHighlighted = isInChain ||
                                   hoveredBatch === arrow.fromBatchId ||
                                   hoveredBatch === arrow.toBatchId

              // Calculate smooth bezier curve control points
              const dx = arrow.to.x - arrow.from.x
              const dy = arrow.to.y - arrow.from.y

              // Control point offset - creates a smooth S-curve
              const curveStrength = Math.min(Math.abs(dx) * 0.4, 60)

              // For arrows going right-to-left or same column, use vertical offset
              const goingBackward = dx < 50

              let path: string
              if (goingBackward) {
                // Arrow needs to curve around - go down/up first then over
                const verticalOffset = dy > 0 ? 30 : -30
                path = `M ${arrow.from.x} ${arrow.from.y}
                        C ${arrow.from.x + 30} ${arrow.from.y + verticalOffset},
                          ${arrow.to.x - 30} ${arrow.to.y - verticalOffset},
                          ${arrow.to.x} ${arrow.to.y}`
              } else {
                // Normal left-to-right arrow with smooth S-curve
                path = `M ${arrow.from.x} ${arrow.from.y}
                        C ${arrow.from.x + curveStrength} ${arrow.from.y},
                          ${arrow.to.x - curveStrength} ${arrow.to.y},
                          ${arrow.to.x} ${arrow.to.y}`
              }

              return (
                <path
                  key={idx}
                  d={path}
                  fill="none"
                  stroke={arrow.isMissing ? '#ef4444' : isHighlighted ? '#4f46e5' : '#6366f1'}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeDasharray={arrow.isMissing ? '5,5' : undefined}
                  markerEnd={`url(#arrowhead${arrow.isMissing ? '-missing' : isHighlighted ? '-highlighted' : ''})`}
                  opacity={isHighlighted ? 1 : 0.6}
                  className="transition-all duration-150"
                />
              )
            })}
          </svg>
        )}

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
                    const isInHoveredChain = hoveredArrowChain?.includes(batch.id)
                    const statusStyle = STATUS_STYLES[batch.status] || ''

                    return (
                      <div
                        key={batch.id}
                        data-batch-id={batch.id}
                        className={`absolute h-10 rounded border-2 cursor-pointer transition-all
                          ${colors.bg} ${colors.border} ${statusStyle}
                          ${isHovered ? 'shadow-lg scale-[1.02] z-10' : 'shadow'}
                          ${isInHoveredChain && !isHovered ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
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
                        onMouseEnter={() => {
                          setHoveredBatch(batch.id)
                          if (showArrows) {
                            setHoveredArrowChain(getChainBatchIds(batch.id))
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredBatch(null)
                          setHoveredArrowChain(null)
                        }}
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
        {dependencyArrows.length > 0 && (
          <>
            <div className="border-l border-gray-300 h-4 mx-1" />
            <div className="font-medium text-gray-600">Dependencies:</div>
            <div className="flex items-center gap-1">
              <svg width="24" height="12" className="text-indigo-500">
                <line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="2" />
                <polygon points="18,3 24,6 18,9" fill="currentColor" />
              </svg>
              <span className="text-gray-500">Connected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded border-2 border-gray-300 ring-2 ring-indigo-400 ring-offset-1" />
              <span className="text-gray-500">In Chain</span>
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
