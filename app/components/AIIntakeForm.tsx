'use client'

import { useState } from 'react'

export interface AIIntakeData {
  // Required parameters
  desiredServings: number
  budget?: number | null // null = no budget constraint
  cakeStructure: 'tiered' | 'sheet'
  
  // Tier preferences (only if tiered)
  tierShapes?: ('round' | 'square' | 'hex' | 'rectangle')[] // Can be mix
  
  // Optional design cues
  designCues?: string // Freeform description
  styleTags?: string[] // e.g., ["rustic", "luxury", "playful"]
  colors?: string[]
  occasion?: string
  theme?: string
}

interface AIIntakeFormProps {
  initialData?: Partial<AIIntakeData>
  onSubmit: (data: AIIntakeData) => void
  onCancel?: () => void
}

export default function AIIntakeForm({ initialData, onSubmit, onCancel }: AIIntakeFormProps) {
  // Required parameters
  const [desiredServings, setDesiredServings] = useState<string>(
    initialData?.desiredServings?.toString() || ''
  )
  const [hasBudget, setHasBudget] = useState<boolean>(initialData?.budget !== null && initialData?.budget !== undefined)
  const [budget, setBudget] = useState<string>(
    initialData?.budget?.toString() || ''
  )
  const [cakeStructure, setCakeStructure] = useState<'tiered' | 'sheet'>(
    initialData?.cakeStructure || 'tiered'
  )
  
  // Tier preferences (only if tiered)
  const [tierShapes, setTierShapes] = useState<('round' | 'square' | 'hex' | 'rectangle')[]>(
    initialData?.tierShapes || ['round']
  )
  
  // Optional design cues
  const [designCues, setDesignCues] = useState<string>(initialData?.designCues || '')
  const [styleTags, setStyleTags] = useState<string[]>(initialData?.styleTags || [])
  const [colors, setColors] = useState<string[]>(initialData?.colors || [])
  const [occasion, setOccasion] = useState<string>(initialData?.occasion || '')
  const [theme, setTheme] = useState<string>(initialData?.theme || '')

  const availableStyleTags = [
    'rustic', 'luxury', 'playful', 'elegant', 'modern',
    'vintage', 'minimalist', 'elaborate', 'garden', 'geometric',
    'classic', 'whimsical', 'sophisticated', 'casual'
  ]

  const handleTierShapeToggle = (shape: 'round' | 'square' | 'hex' | 'rectangle') => {
    if (tierShapes.includes(shape)) {
      // Don't allow removing all shapes - must have at least one
      if (tierShapes.length > 1) {
        setTierShapes(tierShapes.filter(s => s !== shape))
      }
    } else {
      setTierShapes([...tierShapes, shape])
    }
  }

  const handleStyleTagToggle = (tag: string) => {
    if (styleTags.includes(tag)) {
      setStyleTags(styleTags.filter(t => t !== tag))
    } else {
      setStyleTags([...styleTags, tag])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!desiredServings || parseInt(desiredServings) <= 0) {
      alert('Please enter desired serving size')
      return
    }

    const intakeData: AIIntakeData = {
      desiredServings: parseInt(desiredServings),
      budget: hasBudget && budget ? parseFloat(budget) : null,
      cakeStructure,
      ...(cakeStructure === 'tiered' && { tierShapes }),
      ...(designCues && { designCues }),
      ...(styleTags.length > 0 && { styleTags }),
      ...(colors.length > 0 && { colors }),
      ...(occasion && { occasion }),
      ...(theme && { theme })
    }

    onSubmit(intakeData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          AI Design Intake Form
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide basic parameters for AI to generate cake designs. All fields are optional except serving size.
        </p>

        {/* Required Parameters */}
        <div className="space-y-6">
          <div>
            <label htmlFor="desiredServings" className="block text-sm font-medium text-gray-700">
              Desired Serving Size <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="desiredServings"
              required
              min="1"
              value={desiredServings}
              onChange={(e) => setDesiredServings(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., 50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Number of servings needed for this order
            </p>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center mb-2">
              <input
                id="hasBudget"
                type="checkbox"
                checked={hasBudget}
                onChange={(e) => {
                  setHasBudget(e.target.checked)
                  if (!e.target.checked) {
                    setBudget('')
                  }
                }}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="hasBudget" className="ml-2 block text-sm font-medium text-gray-700">
                Has Budget Constraint
              </label>
            </div>
            {hasBudget && (
              <div className="ml-6">
                <input
                  type="number"
                  id="budget"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., 500.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  AI will generate designs within this budget range
                </p>
              </div>
            )}
            {!hasBudget && (
              <p className="ml-6 text-xs text-gray-500">
                No budget constraint - AI can suggest any design
              </p>
            )}
          </div>

          {/* Cake Structure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cake Structure
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cakeStructure"
                  value="tiered"
                  checked={cakeStructure === 'tiered'}
                  onChange={(e) => setCakeStructure(e.target.value as 'tiered' | 'sheet')}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Tiered Cake</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cakeStructure"
                  value="sheet"
                  checked={cakeStructure === 'sheet'}
                  onChange={(e) => setCakeStructure(e.target.value as 'tiered' | 'sheet')}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Sheet Cake</span>
              </label>
            </div>
          </div>

          {/* Tier Shape Preferences (only if tiered) */}
          {cakeStructure === 'tiered' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier Shape Preferences
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Select one or more shapes. AI can mix shapes (e.g., round bottom, square top).
              </p>
              <div className="flex flex-wrap gap-2">
                {(['round', 'square', 'hex', 'rectangle'] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => handleTierShapeToggle(shape)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      tierShapes.includes(shape)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {shape.charAt(0).toUpperCase() + shape.slice(1)}
                  </button>
                ))}
              </div>
              {tierShapes.length > 1 && (
                <p className="mt-2 text-xs text-green-600">
                  ✓ AI will consider mixing {tierShapes.join(', ')} shapes
                </p>
              )}
            </div>
          )}
        </div>

        {/* Optional Design Cues */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Optional Design Cues
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Provide design direction to help AI generate more targeted concepts
          </p>

          <div className="space-y-4">
            {/* Design Description */}
            <div>
              <label htmlFor="designCues" className="block text-sm font-medium text-gray-700">
                Design Description
              </label>
              <textarea
                id="designCues"
                rows={3}
                value={designCues}
                onChange={(e) => setDesignCues(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 'Rustic garden theme with cascading sugar flowers and gold accents'"
              />
            </div>

            {/* Style Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableStyleTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleStyleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      styleTags.includes(tag)
                        ? 'bg-pink-100 text-pink-800 border-2 border-pink-600'
                        : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <label htmlFor="occasion" className="block text-sm font-medium text-gray-700">
                Occasion
              </label>
              <input
                type="text"
                id="occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., Wedding, Birthday, Anniversary"
              />
            </div>

            {/* Theme */}
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                Theme
              </label>
              <input
                type="text"
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., Rustic Garden, Modern Minimalist, Vintage"
              />
            </div>

            {/* Colors */}
            <div>
              <label htmlFor="colors" className="block text-sm font-medium text-gray-700">
                Colors (comma-separated)
              </label>
              <input
                type="text"
                id="colors"
                value={colors.join(', ')}
                onChange={(e) => {
                  const colorList = e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                  setColors(colorList)
                }}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., ivory, sage green, gold"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            Generate AI Designs
          </button>
        </div>
      </div>
    </form>
  )
}


