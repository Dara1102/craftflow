'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRecipe, updateRecipe, deleteRecipe, createTierSize } from '@/app/actions/admin'

interface Ingredient {
  id: number
  name: string
  unit: string
  costPerUnit: number
}

interface RecipeIngredient {
  id: number
  ingredientId: number
  quantity: number
  ingredient: Ingredient
}

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string
  recipeIngredients: RecipeIngredient[]
}

interface TierSize {
  id: number
  name: string
  servings: number
}

interface Props {
  recipe: Recipe | null
  ingredients: Ingredient[]
  tierSizes: TierSize[]
  batterRecipes?: { id: number; name: string }[]
  frostingRecipes?: { id: number; name: string }[]
}

const SHAPES = ['Round', 'Square', 'Heart', 'Hexagon', 'Oval', 'Rectangle']

// Standard sheet pan sizes used in commercial baking
const SHEET_PAN_SIZES = [
  // Cottage/Home Baker (fits standard home ovens)
  { id: 'quarter', name: 'Quarter Sheet (9×13")', category: 'Cottage Baker', widthCm: 23, lengthCm: 33, servings: 12 },
  { id: 'half', name: 'Half Sheet (13×18")', category: 'Cottage Baker', widthCm: 33, lengthCm: 46, servings: 24 },

  // Commercial/Bakery Standard
  { id: 'two-thirds', name: 'Two-Thirds Sheet (15×21")', category: 'Commercial', widthCm: 38, lengthCm: 53, servings: 35 },
  { id: 'full', name: 'Full Sheet (18×26")', category: 'Commercial', widthCm: 46, lengthCm: 66, servings: 48 },

  // Industrial/Wholesale
  { id: 'full-plus', name: 'Full Sheet+ (18×28")', category: 'Industrial', widthCm: 46, lengthCm: 71, servings: 54 },
  { id: 'double', name: 'Double Sheet (26×36")', category: 'Industrial', widthCm: 66, lengthCm: 91, servings: 96 },
]

// Yield type options
const YIELD_TYPES = [
  { id: 'tier', name: 'Cake Tier' },
  { id: 'sheet', name: 'Sheet Pan' },
  { id: 'servings', name: 'Servings Only' },
]

export default function RecipeForm({ recipe, ingredients, tierSizes: initialTierSizes, batterRecipes = [], frostingRecipes = [] }: Props) {
  const router = useRouter()
  const [tierSizes, setTierSizes] = useState(initialTierSizes)
  const [name, setName] = useState(recipe?.name || '')
  const [type, setType] = useState(recipe?.type || 'BATTER')

  // Determine initial yield type from existing description
  const [yieldType, setYieldType] = useState(() => {
    if (recipe?.yieldDescription) {
      if (recipe.yieldDescription.toLowerCase().includes('sheet')) return 'sheet'
      if (recipe.yieldDescription.match(/\d+[- ]?inch/i)) return 'tier'
    }
    return 'tier'
  })

  const [yieldTierSize, setYieldTierSize] = useState(() => {
    if (recipe?.yieldDescription) {
      const match = recipe.yieldDescription.match(/(\d+)[- ]?inch/i)
      if (match) {
        const inches = match[1]
        const tier = initialTierSizes.find(t => t.name.toLowerCase().includes(inches))
        return tier?.id.toString() || ''
      }
    }
    return ''
  })

  const [yieldSheetSize, setYieldSheetSize] = useState(() => {
    if (recipe?.yieldDescription) {
      const sheet = SHEET_PAN_SIZES.find(s =>
        recipe.yieldDescription.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
      )
      return sheet?.id || ''
    }
    return ''
  })

  const [yieldSheetCount, setYieldSheetCount] = useState('1')

  const [yieldServings, setYieldServings] = useState(() => {
    if (recipe?.yieldDescription) {
      const match = recipe.yieldDescription.match(/(\d+)\s*servings?/i)
      if (match) return match[1]
    }
    return ''
  })
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId: number; quantity: number }[]>(
    recipe?.recipeIngredients.map(ri => ({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity
    })) || []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // New tier modal state
  const [showNewTierModal, setShowNewTierModal] = useState(false)
  const [newTierName, setNewTierName] = useState('')
  const [newTierShape, setNewTierShape] = useState('Round')
  const [newTierDiameter, setNewTierDiameter] = useState('')
  const [newTierLength, setNewTierLength] = useState('')
  const [newTierHeight, setNewTierHeight] = useState('10')
  const [newTierServings, setNewTierServings] = useState('')
  const [newTierBatterRecipeId, setNewTierBatterRecipeId] = useState('')
  const [newTierBatterMultiplier, setNewTierBatterMultiplier] = useState('1')
  const [newTierFrostingRecipeId, setNewTierFrostingRecipeId] = useState('')
  const [newTierFrostingMultiplier, setNewTierFrostingMultiplier] = useState('1')
  const [isCreatingTier, setIsCreatingTier] = useState(false)

  const newTierNeedsLength = newTierShape === 'Rectangle' || newTierShape === 'Oval'

  const handleTierSelectChange = (value: string) => {
    if (value === 'new') {
      setShowNewTierModal(true)
    } else {
      setYieldTierSize(value)
    }
  }

  const handleCreateTier = async () => {
    if (!newTierName || !newTierDiameter || !newTierServings || !newTierBatterRecipeId) {
      alert('Please fill in all required fields')
      return
    }
    if (newTierNeedsLength && !newTierLength) {
      alert('Please enter a length for rectangle/oval shapes')
      return
    }

    setIsCreatingTier(true)
    try {
      await createTierSize({
        name: newTierName,
        shape: newTierShape,
        diameterCm: parseFloat(newTierDiameter),
        lengthCm: newTierNeedsLength && newTierLength ? parseFloat(newTierLength) : undefined,
        heightCm: parseFloat(newTierHeight),
        servings: parseInt(newTierServings),
        batterRecipeId: parseInt(newTierBatterRecipeId),
        batterMultiplier: parseFloat(newTierBatterMultiplier),
        frostingRecipeId: newTierFrostingRecipeId ? parseInt(newTierFrostingRecipeId) : undefined,
        frostingMultiplier: newTierFrostingRecipeId && newTierFrostingMultiplier ? parseFloat(newTierFrostingMultiplier) : undefined
      })

      // Fetch updated tier sizes
      const response = await fetch('/api/tier-sizes')
      const updatedTiers = await response.json()
      setTierSizes(updatedTiers.map((t: { id: number; name: string; servings: number }) => ({
        id: t.id,
        name: t.name,
        servings: t.servings
      })))

      // Find the newly created tier and select it
      const newTier = updatedTiers.find((t: { name: string }) => t.name === newTierName)
      if (newTier) {
        setYieldTierSize(newTier.id.toString())
      }

      // Reset modal state
      setShowNewTierModal(false)
      setNewTierName('')
      setNewTierShape('Round')
      setNewTierDiameter('')
      setNewTierLength('')
      setNewTierHeight('10')
      setNewTierServings('')
      setNewTierBatterRecipeId('')
      setNewTierBatterMultiplier('1')
      setNewTierFrostingRecipeId('')
      setNewTierFrostingMultiplier('1')
    } catch (error) {
      console.error('Error creating tier:', error)
      alert('Error creating tier size')
    } finally {
      setIsCreatingTier(false)
    }
  }

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredientId: 0, quantity: 0 }])
  }

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: number) => {
    const updated = [...recipeIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipeIngredients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validIngredients = recipeIngredients.filter(ri => ri.ingredientId > 0 && ri.quantity > 0)

    // Build yield description based on yield type
    let yieldDescription = 'Base recipe'

    if (yieldType === 'tier') {
      const selectedTier = tierSizes.find(t => t.id.toString() === yieldTierSize)
      if (selectedTier) {
        yieldDescription = `For one ${selectedTier.name}`
        if (yieldServings) {
          yieldDescription += ` (${yieldServings} servings)`
        }
      } else if (yieldServings) {
        yieldDescription = `For ${yieldServings} servings`
      }
    } else if (yieldType === 'sheet') {
      const selectedSheet = SHEET_PAN_SIZES.find(s => s.id === yieldSheetSize)
      if (selectedSheet) {
        const count = parseInt(yieldSheetCount) || 1
        const totalServings = selectedSheet.servings * count
        if (count === 1) {
          yieldDescription = `For one ${selectedSheet.name} (~${totalServings} servings)`
        } else {
          yieldDescription = `For ${count} × ${selectedSheet.name} (~${totalServings} servings)`
        }
      }
    } else if (yieldType === 'servings') {
      if (yieldServings) {
        yieldDescription = `For ${yieldServings} servings`
      }
    }

    try {
      if (recipe) {
        await updateRecipe(recipe.id, {
          name,
          type,
          yieldDescription,
          ingredients: validIngredients
        })
      } else {
        await createRecipe({
          name,
          type,
          yieldDescription,
          ingredients: validIngredients
        })
      }
      router.push('/admin/recipes')
      router.refresh()
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Error saving recipe')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!recipe) return
    if (!confirm('Are you sure you want to delete this recipe? This may affect tier sizes that use it.')) return

    setIsDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      router.push('/admin/recipes')
      router.refresh()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Error deleting recipe. It may be in use by tier sizes.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Recipe Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., Vanilla Sponge Batter"
            />
          </div>

          <div className="col-span-6 sm:col-span-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="BATTER">Batter</option>
              <option value="FILLING">Filling</option>
              <option value="FROSTING">Frosting</option>
            </select>
          </div>

          {/* Yield Type Selection */}
          <div className="col-span-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yield Type
            </label>
            <div className="flex gap-4">
              {YIELD_TYPES.map(yt => (
                <label key={yt.id} className="flex items-center">
                  <input
                    type="radio"
                    name="yieldType"
                    value={yt.id}
                    checked={yieldType === yt.id}
                    onChange={(e) => setYieldType(e.target.value)}
                    className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{yt.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tier Size Selection - shown when yieldType is 'tier' */}
          {yieldType === 'tier' && (
            <>
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="yieldTierSize" className="block text-sm font-medium text-gray-700">
                  Tier Size
                </label>
                <select
                  id="yieldTierSize"
                  value={yieldTierSize}
                  onChange={(e) => handleTierSelectChange(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                >
                  <option value="">Select tier size...</option>
                  {tierSizes.map(tier => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} ({tier.servings} servings)
                    </option>
                  ))}
                  <option value="new" className="text-pink-600 font-medium">+ Add new tier size...</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">What size cake does this recipe make?</p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="yieldServings" className="block text-sm font-medium text-gray-700">
                  Servings (optional override)
                </label>
                <input
                  type="number"
                  id="yieldServings"
                  min="1"
                  value={yieldServings}
                  onChange={(e) => setYieldServings(e.target.value)}
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., 12"
                />
                <p className="mt-1 text-xs text-gray-500">Override if different from tier default</p>
              </div>
            </>
          )}

          {/* Sheet Pan Selection - shown when yieldType is 'sheet' */}
          {yieldType === 'sheet' && (
            <>
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="yieldSheetSize" className="block text-sm font-medium text-gray-700">
                  Sheet Pan Size
                </label>
                <select
                  id="yieldSheetSize"
                  value={yieldSheetSize}
                  onChange={(e) => setYieldSheetSize(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                >
                  <option value="">Select sheet size...</option>
                  {['Cottage Baker', 'Commercial', 'Industrial'].map(category => (
                    <optgroup key={category} label={category}>
                      {SHEET_PAN_SIZES.filter(s => s.category === category).map(sheet => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name} (~{sheet.servings} servings)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Standard commercial baking sheet sizes</p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="yieldSheetCount" className="block text-sm font-medium text-gray-700">
                  Number of Sheets
                </label>
                <input
                  type="number"
                  id="yieldSheetCount"
                  min="1"
                  value={yieldSheetCount}
                  onChange={(e) => setYieldSheetCount(e.target.value)}
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="1"
                />
                <p className="mt-1 text-xs text-gray-500">How many sheet pans does this recipe fill?</p>
              </div>

              {yieldSheetSize && (
                <div className="col-span-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <p className="text-sm text-purple-800">
                      {(() => {
                        const sheet = SHEET_PAN_SIZES.find(s => s.id === yieldSheetSize)
                        if (!sheet) return ''
                        const count = parseInt(yieldSheetCount) || 1
                        const totalServings = sheet.servings * count
                        return `${count} × ${sheet.name} = ~${totalServings} servings (${sheet.widthCm}cm × ${sheet.lengthCm}cm per sheet)`
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Servings Only - shown when yieldType is 'servings' */}
          {yieldType === 'servings' && (
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="yieldServingsOnly" className="block text-sm font-medium text-gray-700">
                Servings
              </label>
              <input
                type="number"
                id="yieldServingsOnly"
                min="1"
                value={yieldServings}
                onChange={(e) => setYieldServings(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 24"
              />
              <p className="mt-1 text-xs text-gray-500">For fillings, frostings, or recipes without a specific pan size</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recipe Ingredients</h3>
          <a
            href="/admin/ingredients"
            target="_blank"
            className="text-sm text-pink-600 hover:text-pink-800"
          >
            Manage Ingredients →
          </a>
        </div>

        <div className="space-y-3">
          {recipeIngredients.map((ri, index) => (
            <div key={index} className="flex items-center gap-3">
              <select
                value={ri.ingredientId}
                onChange={(e) => updateIngredient(index, 'ingredientId', parseInt(e.target.value))}
                className="flex-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              >
                <option value={0}>Select ingredient...</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={ri.quantity || ''}
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                placeholder="Quantity"
                className="w-32 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addIngredient}
          className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Add Ingredient
        </button>
      </div>

      <div className="flex justify-between">
        <div>
          {recipe && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Recipe'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/recipes"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : (recipe ? 'Update Recipe' : 'Create Recipe')}
          </button>
        </div>
      </div>

      {/* New Tier Modal */}
      {showNewTierModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Tier Size</h3>
              <p className="mt-1 text-sm text-gray-500">Create a new tier size to use in recipes</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    placeholder="e.g., 10-inch Square"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shape</label>
                  <select
                    value={newTierShape}
                    onChange={(e) => setNewTierShape(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  >
                    {SHAPES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`grid gap-4 ${newTierNeedsLength ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {newTierShape === 'Rectangle' ? 'Width (cm) *' : newTierShape === 'Oval' ? 'Width (cm) *' : newTierShape === 'Square' ? 'Side (cm) *' : 'Diameter (cm) *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTierDiameter}
                    onChange={(e) => setNewTierDiameter(e.target.value)}
                    placeholder="e.g., 25.4"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
                {newTierNeedsLength && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Length (cm) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTierLength}
                      onChange={(e) => setNewTierLength(e.target.value)}
                      placeholder="e.g., 35.5"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Height (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTierHeight}
                    onChange={(e) => setNewTierHeight(e.target.value)}
                    placeholder="e.g., 10"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Servings *</label>
                  <input
                    type="number"
                    value={newTierServings}
                    onChange={(e) => setNewTierServings(e.target.value)}
                    placeholder="e.g., 30"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recipe Assignments</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batter Recipe *</label>
                    <select
                      value={newTierBatterRecipeId}
                      onChange={(e) => setNewTierBatterRecipeId(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select batter...</option>
                      {batterRecipes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batter Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={newTierBatterMultiplier}
                      onChange={(e) => setNewTierBatterMultiplier(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frosting Recipe</label>
                    <select
                      value={newTierFrostingRecipeId}
                      onChange={(e) => setNewTierFrostingRecipeId(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">No frosting</option>
                      {frostingRecipes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frosting Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      disabled={!newTierFrostingRecipeId}
                      value={newTierFrostingMultiplier}
                      onChange={(e) => setNewTierFrostingMultiplier(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewTierModal(false)}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTier}
                disabled={isCreatingTier}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50"
              >
                {isCreatingTier ? 'Creating...' : 'Create Tier Size'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}