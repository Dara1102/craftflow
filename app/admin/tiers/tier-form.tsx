'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTierSize, updateTierSize, deleteTierSize } from '@/app/actions/admin'

interface LaborRole {
  id: number
  name: string
  hourlyRate: number
}

interface TierSize {
  id: number
  name: string
  shape: string
  diameterCm: number
  lengthCm: number | null
  widthCm: number | null
  heightCm: number
  volumeMl: number | null
  servings: number
  assemblyMinutes: number | null
  assemblyRoleId: number | null
}

interface Props {
  tierSize: TierSize | null
  laborRoles: LaborRole[]
}

const SHAPES = ['Round', 'Square', 'Heart', 'Hexagon', 'Oval', 'Rectangle', 'Cupcakes', 'Sheet']

// Unit conversion helpers
const inchesToCm = (inches: number) => inches * 2.54
const cmToInches = (cm: number) => cm / 2.54

// Common cake sizes in inches for quick selection
const COMMON_SIZES_ROUND = [4, 5, 6, 8, 9, 10, 12, 14, 16]
const COMMON_SIZES_SQUARE = [6, 8, 10, 12, 14, 16]
const COMMON_HEIGHTS = [3, 4, 5, 6]

// Standard cake slice sizes based on Wilton Cake Serving Guide
const DEFAULT_SLICE_SIZES = [
  { id: 'wedding', name: 'Wedding (1" x 2")', widthCm: 2.54, depthCm: 5.08, description: 'Thin slices - weddings & formal events' },
  { id: 'party', name: 'Party (1.5" x 2")', widthCm: 3.81, depthCm: 5.08, description: 'Standard party/birthday slices' },
  { id: 'generous', name: 'Generous (2" x 2")', widthCm: 5.08, depthCm: 5.08, description: 'Larger dessert portions' },
  { id: 'custom', name: 'Custom', widthCm: 0, depthCm: 0, description: 'Define your own slice size' },
]

// Wilton serving guide reference data for round cakes (4" high / two-layer)
const WILTON_ROUND_SERVINGS: Record<number, { party: number; wedding: number }> = {
  4: { party: 8, wedding: 8 },
  6: { party: 12, wedding: 12 },
  8: { party: 20, wedding: 24 },
  9: { party: 24, wedding: 32 },
  10: { party: 28, wedding: 38 },
  12: { party: 40, wedding: 56 },
  14: { party: 63, wedding: 78 },
  16: { party: 77, wedding: 100 },
}

const WILTON_SQUARE_SERVINGS: Record<number, { party: number; wedding: number }> = {
  6: { party: 12, wedding: 18 },
  8: { party: 20, wedding: 32 },
  10: { party: 30, wedding: 50 },
  12: { party: 48, wedding: 72 },
  14: { party: 63, wedding: 98 },
  16: { party: 80, wedding: 128 },
}

export default function TierForm({ tierSize, laborRoles }: Props) {
  const router = useRouter()
  const [name, setName] = useState(tierSize?.name || '')
  const [shape, setShape] = useState(tierSize?.shape || 'Round')

  // Unit preference - default to inches for US market
  const [useInches, setUseInches] = useState(true)

  // Store dimensions in cm internally, display in preferred unit
  const [diameterCm, setDiameterCm] = useState(tierSize?.diameterCm?.toString() || '')
  const [lengthCm, setLengthCm] = useState(tierSize?.lengthCm?.toString() || '')
  const [widthCm, setWidthCm] = useState(tierSize?.widthCm?.toString() || '')
  const [heightCm, setHeightCm] = useState(tierSize?.heightCm?.toString() || '')
  const [servings, setServings] = useState(tierSize?.servings?.toString() || '')
  const [assemblyMinutes, setAssemblyMinutes] = useState(tierSize?.assemblyMinutes?.toString() || '')
  const [assemblyRoleId, setAssemblyRoleId] = useState(tierSize?.assemblyRoleId?.toString() || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Serving calculator state
  const [showServingCalculator, setShowServingCalculator] = useState(false)
  const [selectedSliceSize, setSelectedSliceSize] = useState('party')
  const [customSliceWidth, setCustomSliceWidth] = useState('1.5')
  const [customSliceDepth, setCustomSliceDepth] = useState('2')

  const needsLength = shape === 'Rectangle' || shape === 'Oval' || shape === 'Sheet'
  const needsWidth = shape === 'Rectangle' || shape === 'Sheet'

  // Helper functions to get/set display values in preferred unit
  const getDisplayValue = (cmValue: string): string => {
    if (!cmValue) return ''
    const cm = parseFloat(cmValue)
    if (isNaN(cm)) return ''
    if (useInches) {
      return cmToInches(cm).toFixed(1)
    }
    return cm.toFixed(1)
  }

  const setFromDisplayValue = (displayValue: string, setter: (val: string) => void) => {
    if (!displayValue) {
      setter('')
      return
    }
    const val = parseFloat(displayValue)
    if (isNaN(val)) return
    if (useInches) {
      setter(inchesToCm(val).toString())
    } else {
      setter(val.toString())
    }
  }

  // Quick size selection handlers
  const setQuickDiameter = (inches: number) => {
    setDiameterCm(inchesToCm(inches).toString())
  }

  const setQuickHeight = (inches: number) => {
    setHeightCm(inchesToCm(inches).toString())
  }

  // Get the alternate unit display
  const getAlternateDisplay = (cmValue: string): string => {
    if (!cmValue) return ''
    const cm = parseFloat(cmValue)
    if (isNaN(cm)) return ''
    if (useInches) {
      return `${cm.toFixed(1)} cm`
    }
    return `${cmToInches(cm).toFixed(1)}"`
  }

  // Calculate volume based on shape (in ml / cubic cm)
  const calculateVolume = (shapeType: string, diameter: number, length: number | null, width: number | null, height: number): number => {
    switch (shapeType) {
      case 'Round':
        return Math.PI * Math.pow(diameter / 2, 2) * height
      case 'Square':
        return Math.pow(diameter, 2) * height
      case 'Rectangle':
      case 'Sheet':
        return diameter * (length || diameter) * height
      case 'Oval':
        return Math.PI * (diameter / 2) * ((length || diameter) / 2) * height
      case 'Heart':
        return Math.pow(diameter, 2) * height * 0.8
      case 'Hexagon':
        const side = diameter / Math.sqrt(3)
        return (3 * Math.sqrt(3) / 2) * Math.pow(side, 2) * height
      case 'Cupcakes':
        // Standard cupcake volume ~60ml each, diameter represents quantity
        return diameter * 60
      default:
        return Math.PI * Math.pow(diameter / 2, 2) * height
    }
  }

  // Get current volume
  const currentVolume = (() => {
    const d = parseFloat(diameterCm)
    const h = parseFloat(heightCm)
    const l = parseFloat(lengthCm) || null
    const w = parseFloat(widthCm) || null
    if (!d || !h) return null
    return Math.round(calculateVolume(shape, d, l, w, h))
  })()

  // Calculate serving based on Wilton serving guide or interpolation
  const calculateServings = (): { servings: number; isExact: boolean; source: string } | null => {
    const d = parseFloat(diameterCm)
    const h = parseFloat(heightCm)
    const l = needsLength ? parseFloat(lengthCm) : null

    if (!d || !h) return null
    if (needsLength && !l) return null

    // For cupcakes, diameter represents quantity
    if (shape === 'Cupcakes') {
      return { servings: Math.round(d), isExact: true, source: 'Cupcake quantity' }
    }

    const diameterInches = d / 2.54
    const heightInches = h / 2.54
    const sliceKey = selectedSliceSize === 'wedding' ? 'wedding' : 'party'

    // For round cakes, try to use Wilton data
    if (shape === 'Round') {
      const roundedDiameter = Math.round(diameterInches)
      if (WILTON_ROUND_SERVINGS[roundedDiameter] && Math.abs(diameterInches - roundedDiameter) < 0.5) {
        let servings = WILTON_ROUND_SERVINGS[roundedDiameter][sliceKey]
        if (selectedSliceSize === 'generous') {
          servings = Math.round(servings * 0.75)
        }
        if (heightInches < 3) {
          servings = Math.round(servings * 0.5)
        }
        return { servings, isExact: true, source: `Wilton ${roundedDiameter}" round` }
      }

      // Interpolate between known values
      const sizes = Object.keys(WILTON_ROUND_SERVINGS).map(Number).sort((a, b) => a - b)
      const lower = sizes.filter(s => s <= diameterInches).pop()
      const upper = sizes.filter(s => s > diameterInches)[0]

      if (lower && upper) {
        const lowerServings = WILTON_ROUND_SERVINGS[lower][sliceKey]
        const upperServings = WILTON_ROUND_SERVINGS[upper][sliceKey]
        const ratio = (diameterInches - lower) / (upper - lower)
        let servings = Math.round(lowerServings + (upperServings - lowerServings) * ratio)
        if (selectedSliceSize === 'generous') {
          servings = Math.round(servings * 0.75)
        }
        if (heightInches < 3) {
          servings = Math.round(servings * 0.5)
        }
        return { servings, isExact: false, source: `Interpolated ${diameterInches.toFixed(1)}" round` }
      }
    }

    // For square cakes
    if (shape === 'Square') {
      const roundedSide = Math.round(diameterInches)
      if (WILTON_SQUARE_SERVINGS[roundedSide] && Math.abs(diameterInches - roundedSide) < 0.5) {
        let servings = WILTON_SQUARE_SERVINGS[roundedSide][sliceKey]
        if (selectedSliceSize === 'generous') {
          servings = Math.round(servings * 0.75)
        }
        if (heightInches < 3) {
          servings = Math.round(servings * 0.5)
        }
        return { servings, isExact: true, source: `Wilton ${roundedSide}" square` }
      }
    }

    // For other shapes, calculate from surface area
    let sliceWidthCm: number
    let sliceDepthCm: number

    if (selectedSliceSize === 'custom') {
      const customWidth = parseFloat(customSliceWidth)
      const customDepth = parseFloat(customSliceDepth)
      if (!customWidth || !customDepth) return null
      sliceWidthCm = inchesToCm(customWidth)
      sliceDepthCm = inchesToCm(customDepth)
    } else {
      const sliceSize = DEFAULT_SLICE_SIZES.find(s => s.id === selectedSliceSize)
      if (!sliceSize) return null
      sliceWidthCm = sliceSize.widthCm
      sliceDepthCm = sliceSize.depthCm
    }

    let surfaceArea: number
    switch (shape) {
      case 'Rectangle':
      case 'Sheet':
        surfaceArea = d * (l || d)
        break
      case 'Oval':
        surfaceArea = Math.PI * (d / 2) * ((l || d) / 2)
        break
      case 'Heart':
        surfaceArea = Math.pow(d, 2) * 0.8
        break
      case 'Hexagon':
        const side = d / Math.sqrt(3)
        surfaceArea = (3 * Math.sqrt(3) / 2) * Math.pow(side, 2)
        break
      default:
        surfaceArea = Math.PI * Math.pow(d / 2, 2)
    }

    const sliceArea = sliceWidthCm * sliceDepthCm
    let servings = Math.floor(surfaceArea / sliceArea)
    if (heightInches < 3) {
      servings = Math.round(servings * 0.5)
    }

    return { servings, isExact: false, source: `Estimated from ${shape.toLowerCase()} area` }
  }

  const calculatedServingsResult = calculateServings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const data = {
      name,
      shape,
      diameterCm: parseFloat(diameterCm),
      lengthCm: needsLength && lengthCm ? parseFloat(lengthCm) : null,
      widthCm: needsWidth && widthCm ? parseFloat(widthCm) : null,
      heightCm: parseFloat(heightCm),
      volumeMl: currentVolume,
      servings: parseInt(servings),
      assemblyMinutes: assemblyMinutes ? parseInt(assemblyMinutes) : undefined,
      assemblyRoleId: assemblyRoleId ? parseInt(assemblyRoleId) : undefined
    }

    try {
      if (tierSize) {
        await updateTierSize(tierSize.id, data)
      } else {
        await createTierSize(data)
      }
      router.push('/admin/tiers')
      router.refresh()
    } catch (error) {
      console.error('Error saving tier size:', error)
      alert('Error saving tier size')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tierSize) return
    if (!confirm('Are you sure you want to delete this tier size? This may affect existing orders.')) return

    setIsDeleting(true)
    try {
      await deleteTierSize(tierSize.id)
      router.push('/admin/tiers')
      router.refresh()
    } catch (error) {
      console.error('Error deleting tier size:', error)
      alert('Error deleting tier size. It may be in use by cake orders.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Tier Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., 8 inch round"
            />
          </div>

          <div className="col-span-6 sm:col-span-2">
            <label htmlFor="shape" className="block text-sm font-medium text-gray-700">
              Shape
            </label>
            <select
              id="shape"
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              {SHAPES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dimensions</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Unit:</span>
            <button
              type="button"
              onClick={() => setUseInches(true)}
              className={`px-3 py-1 text-sm font-medium rounded-l-md border ${
                useInches
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => setUseInches(false)}
              className={`px-3 py-1 text-sm font-medium rounded-r-md border-t border-r border-b ${
                !useInches
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              cm
            </button>
          </div>
        </div>

        {/* Quick size selection for common cake sizes */}
        {(shape === 'Round' || shape === 'Square') && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Quick Select Size:</p>
            <div className="flex flex-wrap gap-2">
              {(shape === 'Round' ? COMMON_SIZES_ROUND : COMMON_SIZES_SQUARE).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setQuickDiameter(size)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border transition ${
                    Math.abs(parseFloat(diameterCm) - inchesToCm(size)) < 0.1
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300 hover:bg-pink-50'
                  }`}
                >
                  {size}"
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-2">
            <label htmlFor="diameter" className="block text-sm font-medium text-gray-700">
              {shape === 'Cupcakes' ? 'Quantity' : shape === 'Rectangle' || shape === 'Sheet' ? `Width (${useInches ? 'in' : 'cm'})` : shape === 'Oval' ? `Width (${useInches ? 'in' : 'cm'})` : shape === 'Square' ? `Side (${useInches ? 'in' : 'cm'})` : `Diameter (${useInches ? 'in' : 'cm'})`}
            </label>
            <input
              type="number"
              id="diameter"
              step={shape === 'Cupcakes' ? '1' : '0.1'}
              min="0"
              required
              value={shape === 'Cupcakes' ? diameterCm : getDisplayValue(diameterCm)}
              onChange={(e) => shape === 'Cupcakes' ? setDiameterCm(e.target.value) : setFromDisplayValue(e.target.value, setDiameterCm)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder={shape === 'Cupcakes' ? 'e.g., 12' : useInches ? 'e.g., 8' : 'e.g., 20.3'}
            />
            {diameterCm && shape !== 'Cupcakes' && (
              <p className="mt-1 text-xs text-gray-500">
                = {getAlternateDisplay(diameterCm)}
              </p>
            )}
          </div>

          {needsLength && (
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                Length ({useInches ? 'in' : 'cm'})
              </label>
              <input
                type="number"
                id="length"
                step="0.1"
                min="0"
                required={needsLength}
                value={getDisplayValue(lengthCm)}
                onChange={(e) => setFromDisplayValue(e.target.value, setLengthCm)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder={useInches ? 'e.g., 12' : 'e.g., 30.5'}
              />
              {lengthCm && (
                <p className="mt-1 text-xs text-gray-500">
                  = {getAlternateDisplay(lengthCm)}
                </p>
              )}
            </div>
          )}

          <div className="col-span-6 sm:col-span-2">
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">
              Height ({useInches ? 'in' : 'cm'})
            </label>
            <input
              type="number"
              id="height"
              step="0.1"
              min="0"
              required
              value={getDisplayValue(heightCm)}
              onChange={(e) => setFromDisplayValue(e.target.value, setHeightCm)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder={useInches ? 'e.g., 4' : 'e.g., 10'}
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {COMMON_HEIGHTS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQuickHeight(h)}
                  className={`px-2 py-0.5 text-xs font-medium rounded border transition ${
                    Math.abs(parseFloat(heightCm) - inchesToCm(h)) < 0.1
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-pink-300'
                  }`}
                >
                  {h}"
                </button>
              ))}
              {heightCm && (
                <span className="text-xs text-gray-500 ml-2">= {getAlternateDisplay(heightCm)}</span>
              )}
            </div>
          </div>

          <div className="col-span-6 sm:col-span-2">
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
              Servings
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="servings"
                min="1"
                required
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 24"
              />
              <button
                type="button"
                onClick={() => setShowServingCalculator(!showServingCalculator)}
                className="mt-1 px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 whitespace-nowrap"
              >
                {showServingCalculator ? 'Hide' : 'Calculate'}
              </button>
            </div>
          </div>

          {/* Volume display */}
          {currentVolume && (
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Calculated Volume
              </label>
              <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
                {currentVolume.toLocaleString()} ml
                <span className="text-xs text-gray-500 ml-2">
                  ({(currentVolume / 1000).toFixed(2)} L)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Used for recipe multiplier calculation</p>
            </div>
          )}

          {/* Serving Calculator */}
          {showServingCalculator && (
            <div className="col-span-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Serving Calculator</h4>
              <p className="text-xs text-gray-600 mb-4">
                Calculate servings based on standard slice sizes (Wilton guide).
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Slice Size</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {DEFAULT_SLICE_SIZES.map(slice => (
                    <label
                      key={slice.id}
                      className={`flex items-center p-3 rounded-md border cursor-pointer transition ${
                        selectedSliceSize === slice.id
                          ? 'border-purple-500 bg-purple-100'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sliceSize"
                        value={slice.id}
                        checked={selectedSliceSize === slice.id}
                        onChange={(e) => setSelectedSliceSize(e.target.value)}
                        className="sr-only"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{slice.name}</span>
                        <p className="text-xs text-gray-500">{slice.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedSliceSize === 'custom' && (
                  <div className="mt-3 p-3 bg-white rounded-md border border-purple-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600">Width (inches)</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          value={customSliceWidth}
                          onChange={(e) => setCustomSliceWidth(e.target.value)}
                          className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Depth (inches)</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          value={customSliceDepth}
                          onChange={(e) => setCustomSliceDepth(e.target.value)}
                          className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-white rounded-md p-3 border border-purple-200">
                <div>
                  <span className="text-sm text-gray-600">Calculated Servings: </span>
                  <span className="text-lg font-bold text-purple-600">
                    {calculatedServingsResult !== null ? calculatedServingsResult.servings : '-'}
                  </span>
                  {calculatedServingsResult !== null && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({calculatedServingsResult.source})
                    </span>
                  )}
                </div>
                {calculatedServingsResult !== null && (
                  <button
                    type="button"
                    onClick={() => setServings(calculatedServingsResult.servings.toString())}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    Use This
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assembly Time Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assembly Time</h3>
        <p className="text-sm text-gray-500 mb-4">
          Time required to fill, stack, and crumb coat this tier size. This labor cost will be automatically included when this tier is added to an order.
        </p>
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="assemblyMinutes" className="block text-sm font-medium text-gray-700">
              Assembly Time (minutes)
            </label>
            <input
              type="number"
              id="assemblyMinutes"
              min="0"
              value={assemblyMinutes}
              onChange={(e) => setAssemblyMinutes(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., 15"
            />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="assemblyRoleId" className="block text-sm font-medium text-gray-700">
              Assembly Role
            </label>
            <select
              id="assemblyRoleId"
              value={assemblyRoleId}
              onChange={(e) => setAssemblyRoleId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">Select role...</option>
              {laborRoles.map(role => (
                <option key={role.id} value={role.id}>{role.name} (${role.hourlyRate}/hr)</option>
              ))}
            </select>
          </div>

          {assemblyMinutes && assemblyRoleId && (
            <div className="col-span-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Assembly labor cost: </span>
                  ${((parseInt(assemblyMinutes) / 60) * (laborRoles.find(r => r.id === parseInt(assemblyRoleId))?.hourlyRate || 0)).toFixed(2)}
                  <span className="text-blue-600 ml-2">
                    ({assemblyMinutes} min x ${laborRoles.find(r => r.id === parseInt(assemblyRoleId))?.hourlyRate}/hr)
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <div>
          {tierSize && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Tier Size'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/tiers"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : (tierSize ? 'Update Tier Size' : 'Create Tier Size')}
          </button>
        </div>
      </div>
    </form>
  )
}
