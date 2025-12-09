'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTierSize, updateTierSize, deleteTierSize } from '@/app/actions/admin'

interface Recipe {
  id: number
  name: string
  type: string
}

interface TierSize {
  id: number
  name: string
  shape: string
  diameterCm: number
  lengthCm: number | null
  heightCm: number
  servings: number
  batterRecipeId: number
  batterMultiplier: number
  frostingRecipeId: number | null
  frostingMultiplier: number | null
}

interface Props {
  tierSize: TierSize | null
  batterRecipes: Recipe[]
  frostingRecipes: Recipe[]
}

const SHAPES = ['Round', 'Square', 'Heart', 'Hexagon', 'Oval', 'Rectangle']

// Unit conversion helpers
const inchesToCm = (inches: number) => inches * 2.54
const cmToInches = (cm: number) => cm / 2.54

// Common cake sizes in inches for quick selection
const COMMON_SIZES_ROUND = [4, 6, 8, 9, 10, 12, 14, 16]
const COMMON_SIZES_SQUARE = [6, 8, 10, 12, 14, 16]
const COMMON_HEIGHTS = [3, 4, 5, 6]

// Standard cake slice sizes based on Wilton Cake Serving Guide
// Wedding: 1" x 2" slices, Party: 1.5" x 2" slices
const DEFAULT_SLICE_SIZES = [
  { id: 'wedding', name: 'Wedding (1" × 2")', widthCm: 2.54, depthCm: 5.08, description: 'Thin slices - weddings & formal events' },
  { id: 'party', name: 'Party (1.5" × 2")', widthCm: 3.81, depthCm: 5.08, description: 'Standard party/birthday slices' },
  { id: 'generous', name: 'Generous (2" × 2")', widthCm: 5.08, depthCm: 5.08, description: 'Larger dessert portions' },
  { id: 'custom', name: 'Custom', widthCm: 0, depthCm: 0, description: 'Define your own slice size' },
]

// Wilton serving guide reference data for round cakes (4" high / two-layer)
// Used to validate calculations and provide accurate estimates
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

export default function TierForm({ tierSize, batterRecipes, frostingRecipes }: Props) {
  const router = useRouter()
  const [name, setName] = useState(tierSize?.name || '')
  const [shape, setShape] = useState(tierSize?.shape || 'Round')

  // Unit preference - default to inches for US market
  const [useInches, setUseInches] = useState(true)

  // Store dimensions in cm internally, display in preferred unit
  const [diameterCm, setDiameterCm] = useState(tierSize?.diameterCm?.toString() || '')
  const [lengthCm, setLengthCm] = useState(tierSize?.lengthCm?.toString() || '')
  const [heightCm, setHeightCm] = useState(tierSize?.heightCm?.toString() || '')
  const [servings, setServings] = useState(tierSize?.servings?.toString() || '')
  const [batterRecipeId, setBatterRecipeId] = useState(tierSize?.batterRecipeId?.toString() || '')
  const [batterMultiplier, setBatterMultiplier] = useState(tierSize?.batterMultiplier?.toString() || '1')
  const [frostingRecipeId, setFrostingRecipeId] = useState(tierSize?.frostingRecipeId?.toString() || '')
  const [frostingMultiplier, setFrostingMultiplier] = useState(tierSize?.frostingMultiplier?.toString() || '1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Multiplier calculator state
  const [showCalculator, setShowCalculator] = useState(false)
  const [baseShape, setBaseShape] = useState('Round')
  const [baseDiameter, setBaseDiameter] = useState('')
  const [baseLength, setBaseLength] = useState('')
  const [baseHeight, setBaseHeight] = useState('10')

  // Serving calculator state
  const [showServingCalculator, setShowServingCalculator] = useState(false)
  const [selectedSliceSize, setSelectedSliceSize] = useState('party')
  const [customSliceWidth, setCustomSliceWidth] = useState('1.5') // inches
  const [customSliceDepth, setCustomSliceDepth] = useState('2') // inches

  const needsLength = shape === 'Rectangle' || shape === 'Oval'
  const baseNeedsLength = baseShape === 'Rectangle' || baseShape === 'Oval'

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

  // Calculate volume based on shape
  const calculateVolume = (shapeType: string, diameter: number, length: number | null, height: number): number => {
    switch (shapeType) {
      case 'Round':
        return Math.PI * Math.pow(diameter / 2, 2) * height
      case 'Square':
        return Math.pow(diameter, 2) * height
      case 'Rectangle':
        return diameter * (length || diameter) * height
      case 'Oval':
        // Approximate oval as ellipse: π × a × b × height
        return Math.PI * (diameter / 2) * ((length || diameter) / 2) * height
      case 'Heart':
        // Approximate heart shape as ~80% of square
        return Math.pow(diameter, 2) * height * 0.8
      case 'Hexagon':
        // Regular hexagon: (3√3/2) × s² × height, where s is side length
        // If diameter is across flats, s = diameter / √3
        const side = diameter / Math.sqrt(3)
        return (3 * Math.sqrt(3) / 2) * Math.pow(side, 2) * height
      default:
        return Math.PI * Math.pow(diameter / 2, 2) * height
    }
  }

  // Calculate serving based on Wilton serving guide or interpolation
  const calculateServings = (): { servings: number; isExact: boolean; source: string } | null => {
    const d = parseFloat(diameterCm)
    const h = parseFloat(heightCm)
    const l = needsLength ? parseFloat(lengthCm) : null

    if (!d || !h) return null
    if (needsLength && !l) return null

    // Convert cm to inches for Wilton lookup
    const diameterInches = d / 2.54
    const heightInches = h / 2.54

    // Determine which slice type key to use
    const sliceKey = selectedSliceSize === 'wedding' ? 'wedding' : 'party'

    // For round cakes, try to use Wilton data
    if (shape === 'Round') {
      // Check for exact match in Wilton data
      const roundedDiameter = Math.round(diameterInches)
      if (WILTON_ROUND_SERVINGS[roundedDiameter] && Math.abs(diameterInches - roundedDiameter) < 0.5) {
        let servings = WILTON_ROUND_SERVINGS[roundedDiameter][sliceKey]

        // Adjust for generous slices (roughly 75% of party servings)
        if (selectedSliceSize === 'generous') {
          servings = Math.round(servings * 0.75)
        }

        // Adjust for height if significantly different from standard 4"
        // Servings are the same for 3-6" cakes, half for under 3"
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

    // For square cakes, try to use Wilton data
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

      // Interpolate for square
      const sizes = Object.keys(WILTON_SQUARE_SERVINGS).map(Number).sort((a, b) => a - b)
      const lower = sizes.filter(s => s <= diameterInches).pop()
      const upper = sizes.filter(s => s > diameterInches)[0]

      if (lower && upper) {
        const lowerServings = WILTON_SQUARE_SERVINGS[lower][sliceKey]
        const upperServings = WILTON_SQUARE_SERVINGS[upper][sliceKey]
        const ratio = (diameterInches - lower) / (upper - lower)
        let servings = Math.round(lowerServings + (upperServings - lowerServings) * ratio)

        if (selectedSliceSize === 'generous') {
          servings = Math.round(servings * 0.75)
        }
        if (heightInches < 3) {
          servings = Math.round(servings * 0.5)
        }

        return { servings, isExact: false, source: `Interpolated ${diameterInches.toFixed(1)}" square` }
      }
    }

    // For custom slice size or other shapes, calculate from surface area
    let sliceWidthCm: number
    let sliceDepthCm: number

    if (selectedSliceSize === 'custom') {
      const customWidth = parseFloat(customSliceWidth)
      const customDepth = parseFloat(customSliceDepth)
      if (!customWidth || !customDepth || customWidth <= 0 || customDepth <= 0) {
        return null
      }
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
        surfaceArea = d * (l || d)
        break
      case 'Oval':
        surfaceArea = Math.PI * (d / 2) * ((l || d) / 2)
        break
      case 'Heart':
        // Heart is roughly 80% of a square of the same width
        surfaceArea = Math.pow(d, 2) * 0.8
        break
      case 'Hexagon':
        // Regular hexagon inscribed in circle
        const side = d / Math.sqrt(3)
        surfaceArea = (3 * Math.sqrt(3) / 2) * Math.pow(side, 2)
        break
      default:
        surfaceArea = Math.PI * Math.pow(d / 2, 2)
    }

    // Use slice area calculation
    const sliceArea = sliceWidthCm * sliceDepthCm
    let servings = Math.floor(surfaceArea / sliceArea)

    if (heightInches < 3) {
      servings = Math.round(servings * 0.5)
    }

    const sliceSizeLabel = selectedSliceSize === 'custom'
      ? `Custom ${customSliceWidth}" × ${customSliceDepth}" slices`
      : `${shape.toLowerCase()} area`

    return { servings, isExact: false, source: `Estimated from ${sliceSizeLabel}` }
  }

  const calculatedServingsResult = calculateServings()

  // Calculate suggested multiplier
  const calculateMultiplier = (): string | null => {
    const d = parseFloat(diameterCm)
    const h = parseFloat(heightCm)
    const l = needsLength ? parseFloat(lengthCm) : null
    const bd = parseFloat(baseDiameter)
    const bh = parseFloat(baseHeight)
    const bl = baseNeedsLength ? parseFloat(baseLength) : null

    if (!d || !h || !bd || !bh) return null
    if (needsLength && !l) return null
    if (baseNeedsLength && !bl) return null

    const newVolume = calculateVolume(shape, d, l, h)
    const baseVolume = calculateVolume(baseShape, bd, bl, bh)

    if (baseVolume === 0) return null

    const multiplier = newVolume / baseVolume
    return multiplier.toFixed(2)
  }

  const suggestedMultiplier = calculateMultiplier()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const data = {
      name,
      shape,
      diameterCm: parseFloat(diameterCm),
      lengthCm: needsLength && lengthCm ? parseFloat(lengthCm) : null,
      heightCm: parseFloat(heightCm),
      servings: parseInt(servings),
      batterRecipeId: parseInt(batterRecipeId),
      batterMultiplier: parseFloat(batterMultiplier),
      frostingRecipeId: frostingRecipeId ? parseInt(frostingRecipeId) : undefined,
      frostingMultiplier: frostingRecipeId && frostingMultiplier ? parseFloat(frostingMultiplier) : undefined
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
              placeholder="e.g., 8-inch Round"
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
          <div className={`col-span-6 ${needsLength ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
            <label htmlFor="diameter" className="block text-sm font-medium text-gray-700">
              {shape === 'Rectangle' ? `Width (${useInches ? 'in' : 'cm'})` : shape === 'Oval' ? `Width (${useInches ? 'in' : 'cm'})` : shape === 'Square' ? `Side (${useInches ? 'in' : 'cm'})` : `Diameter (${useInches ? 'in' : 'cm'})`}
            </label>
            <input
              type="number"
              id="diameter"
              step="0.1"
              min="0"
              required
              value={getDisplayValue(diameterCm)}
              onChange={(e) => setFromDisplayValue(e.target.value, setDiameterCm)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder={useInches ? 'e.g., 8' : 'e.g., 20.3'}
            />
            {diameterCm && (
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
            <div className="flex gap-2">
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
            </div>
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
            <p className="mt-1 text-xs text-gray-500">How many people this tier feeds</p>
          </div>

          {/* Serving Calculator */}
          {showServingCalculator && (
            <div className="col-span-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Serving Calculator</h4>
              <p className="text-xs text-gray-600 mb-4">
                Calculate servings based on standard slice sizes. Enter dimensions above first.
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
                        {slice.id !== 'custom' && (
                          <p className="text-xs text-purple-600 mt-1">
                            {(slice.widthCm / 2.54).toFixed(1)}" × {(slice.depthCm / 2.54).toFixed(1)}" slice
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom slice size inputs */}
                {selectedSliceSize === 'custom' && (
                  <div className="mt-3 p-3 bg-white rounded-md border border-purple-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Custom Slice Dimensions (inches)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600">Width</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          value={customSliceWidth}
                          onChange={(e) => setCustomSliceWidth(e.target.value)}
                          className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          placeholder="1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Depth</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          value={customSliceDepth}
                          onChange={(e) => setCustomSliceDepth(e.target.value)}
                          className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          placeholder="2"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Slice area: {(parseFloat(customSliceWidth) * parseFloat(customSliceDepth)).toFixed(2)} sq inches
                      ({(parseFloat(customSliceWidth) * 2.54 * parseFloat(customSliceDepth) * 2.54).toFixed(1)} cm²)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-white rounded-md p-3 border border-purple-200">
                <div>
                  <span className="text-sm text-gray-600">Calculated Servings: </span>
                  <span className="text-lg font-bold text-purple-600">
                    {calculatedServingsResult !== null ? calculatedServingsResult.servings : '—'}
                  </span>
                  {calculatedServingsResult !== null && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({calculatedServingsResult.source})
                      {calculatedServingsResult.isExact && (
                        <span className="ml-1 text-green-600">✓</span>
                      )}
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

              {calculatedServingsResult === null && diameterCm && (
                <p className="mt-2 text-xs text-amber-600">
                  Enter the tier dimensions above to calculate servings.
                </p>
              )}

              <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Slice size reference (Wilton guide):</strong><br />
                  • Wedding: 1" × 2" (2.54cm × 5.08cm) - tall, thin slices<br />
                  • Party: 1.5" × 2" (3.81cm × 5.08cm) - standard dessert<br />
                  • Generous: 2" × 2" (5.08cm × 5.08cm) - larger portions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recipe Assignments</h3>
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="batterRecipeId" className="block text-sm font-medium text-gray-700">
              Batter Recipe
            </label>
            <select
              id="batterRecipeId"
              required
              value={batterRecipeId}
              onChange={(e) => setBatterRecipeId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">Select batter recipe...</option>
              {batterRecipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="batterMultiplier" className="block text-sm font-medium text-gray-700">
              Batter Multiplier
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="batterMultiplier"
                step="0.1"
                min="0.1"
                required
                value={batterMultiplier}
                onChange={(e) => setBatterMultiplier(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 1.5"
              />
              <button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                className="mt-1 px-3 py-2 text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 whitespace-nowrap"
              >
                {showCalculator ? 'Hide' : 'Calculate'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">How many batches of the base recipe</p>
          </div>

          {showCalculator && (
            <div className="col-span-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Multiplier Calculator</h4>
              <p className="text-xs text-gray-500 mb-4">
                Enter the dimensions of the tier size your base recipe makes. The calculator will suggest a multiplier based on volume comparison.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Base Shape</label>
                  <select
                    value={baseShape}
                    onChange={(e) => setBaseShape(e.target.value)}
                    className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    {SHAPES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    {baseShape === 'Rectangle' || baseShape === 'Oval' ? 'Base Width (cm)' : baseShape === 'Square' ? 'Base Side (cm)' : 'Base Diameter (cm)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={baseDiameter}
                    onChange={(e) => setBaseDiameter(e.target.value)}
                    placeholder="e.g., 15.2"
                    className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                {baseNeedsLength && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Base Length (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={baseLength}
                      onChange={(e) => setBaseLength(e.target.value)}
                      placeholder="e.g., 20.3"
                      className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Base Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baseHeight}
                    onChange={(e) => setBaseHeight(e.target.value)}
                    placeholder="e.g., 10"
                    className="mt-1 block w-full py-1.5 px-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-white rounded-md p-3 border border-gray-200">
                <div>
                  <span className="text-sm text-gray-600">Suggested Multiplier: </span>
                  <span className="text-lg font-bold text-pink-600">
                    {suggestedMultiplier ? `${suggestedMultiplier}×` : '—'}
                  </span>
                  {suggestedMultiplier && (
                    <span className="text-xs text-gray-500 ml-2">
                      (based on volume ratio)
                    </span>
                  )}
                </div>
                {suggestedMultiplier && (
                  <button
                    type="button"
                    onClick={() => {
                      setBatterMultiplier(suggestedMultiplier)
                      setFrostingMultiplier(suggestedMultiplier)
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700"
                  >
                    Use This
                  </button>
                )}
              </div>

              {!suggestedMultiplier && diameterCm && heightCm && (
                <p className="mt-2 text-xs text-amber-600">
                  Enter the base recipe dimensions above to calculate a suggested multiplier.
                </p>
              )}
            </div>
          )}

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="frostingRecipeId" className="block text-sm font-medium text-gray-700">
              Frosting Recipe (optional)
            </label>
            <select
              id="frostingRecipeId"
              value={frostingRecipeId}
              onChange={(e) => setFrostingRecipeId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">No frosting / manual</option>
              {frostingRecipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="frostingMultiplier" className="block text-sm font-medium text-gray-700">
              Frosting Multiplier
            </label>
            <input
              type="number"
              id="frostingMultiplier"
              step="0.1"
              min="0.1"
              disabled={!frostingRecipeId}
              value={frostingMultiplier}
              onChange={(e) => setFrostingMultiplier(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100"
              placeholder="e.g., 1.0"
            />
            <p className="mt-1 text-xs text-gray-500">How many batches of frosting needed</p>
          </div>
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
