'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRecipe, updateRecipe, deleteRecipe } from '@/app/actions/admin'

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

interface LaborRole {
  id: number
  name: string
  hourlyRate: number
}

interface InstructionStep {
  step: number
  description: string
  minutes: number
  type: 'prep' | 'bake' | 'cool' | 'other'
}

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string
  yieldVolumeMl: number | null
  instructions: string | null
  prepMinutes: number | null
  bakeMinutes: number | null
  coolMinutes: number | null
  laborMinutes: number | null
  laborRoleId: number | null
  recipeIngredients: RecipeIngredient[]
}

interface TierSize {
  id: number
  name: string
  servings: number
  volumeMl: number | null
}

interface Props {
  recipe: Recipe | null
  ingredients: Ingredient[]
  tierSizes: TierSize[]
  laborRoles: LaborRole[]
}

const STEP_TYPES = [
  { id: 'prep', name: 'Prep', color: 'bg-blue-100 text-blue-800' },
  { id: 'bake', name: 'Bake', color: 'bg-orange-100 text-orange-800' },
  { id: 'cool', name: 'Cool', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' },
]

// Default batch volumes by recipe type (in ml)
const DEFAULT_BATCH_VOLUMES: Record<string, number> = {
  'BATTER': 3295,    // Enough for one 8-inch round cake
  'FROSTING': 1200,  // Enough to frost one 8-inch round cake
  'FILLING': 400,    // Enough filling for one 8-inch round cake
}

export default function RecipeForm({ recipe, ingredients, tierSizes, laborRoles }: Props) {
  const router = useRouter()
  const [name, setName] = useState(recipe?.name || '')
  const [type, setType] = useState(recipe?.type || 'BATTER')
  const [yieldVolumeMl, setYieldVolumeMl] = useState(recipe?.yieldVolumeMl?.toString() || '')
  const [laborRoleId, setLaborRoleId] = useState(recipe?.laborRoleId?.toString() || '')

  // Helper for calculating volume from tier
  const [selectedHelperTier, setSelectedHelperTier] = useState('')

  // Time fields
  const [prepMinutes, setPrepMinutes] = useState(recipe?.prepMinutes?.toString() || '')
  const [bakeMinutes, setBakeMinutes] = useState(recipe?.bakeMinutes?.toString() || '')
  const [coolMinutes, setCoolMinutes] = useState(recipe?.coolMinutes?.toString() || '')

  // Parse existing instructions or start with empty array
  const parseInstructions = (jsonStr: string | null): InstructionStep[] => {
    if (!jsonStr) return []
    try {
      return JSON.parse(jsonStr)
    } catch {
      return []
    }
  }

  const [instructionSteps, setInstructionSteps] = useState<InstructionStep[]>(
    parseInstructions(recipe?.instructions || null)
  )

  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId: number; quantity: number }[]>(
    recipe?.recipeIngredients.map(ri => ({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity
    })) || []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Set default volume when type changes (only for new recipes)
  useEffect(() => {
    if (!recipe && !yieldVolumeMl) {
      setYieldVolumeMl(DEFAULT_BATCH_VOLUMES[type]?.toString() || '')
    }
  }, [type, recipe, yieldVolumeMl])

  // Calculate total labor minutes from instructions
  const totalInstructionMinutes = instructionSteps.reduce((sum, step) => sum + (step.minutes || 0), 0)

  // Calculate time by type
  const prepMinutesFromSteps = instructionSteps.filter(s => s.type === 'prep').reduce((sum, s) => sum + s.minutes, 0)
  const bakeMinutesFromSteps = instructionSteps.filter(s => s.type === 'bake').reduce((sum, s) => sum + s.minutes, 0)
  const coolMinutesFromSteps = instructionSteps.filter(s => s.type === 'cool').reduce((sum, s) => sum + s.minutes, 0)

  // Handle tier helper selection - auto-fill volume based on tier and recipe type
  const handleTierHelperChange = (tierId: string) => {
    setSelectedHelperTier(tierId)
    if (tierId) {
      const tier = tierSizes.find(t => t.id.toString() === tierId)
      if (tier?.volumeMl) {
        // Calculate appropriate volume based on recipe type
        let volume = tier.volumeMl
        if (type === 'FROSTING') {
          volume = Math.round(tier.volumeMl * 0.36) // Surface coverage
        } else if (type === 'FILLING') {
          volume = Math.round(tier.volumeMl * 0.12) // Thin layer
        }
        setYieldVolumeMl(volume.toString())
      }
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

  // Instruction step handlers
  const addInstructionStep = () => {
    const nextStep = instructionSteps.length + 1
    setInstructionSteps([...instructionSteps, { step: nextStep, description: '', minutes: 0, type: 'prep' }])
  }

  const removeInstructionStep = (index: number) => {
    const updated = instructionSteps.filter((_, i) => i !== index)
    // Renumber steps
    updated.forEach((step, i) => { step.step = i + 1 })
    setInstructionSteps(updated)
  }

  const updateInstructionStep = (index: number, field: keyof InstructionStep, value: string | number) => {
    const updated = [...instructionSteps]
    if (field === 'minutes') {
      updated[index] = { ...updated[index], [field]: parseInt(value as string) || 0 }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setInstructionSteps(updated)
  }

  // Generate yield description from volume
  const getYieldDescription = (): string => {
    const volume = parseInt(yieldVolumeMl)
    if (!volume) return 'Standard batch'

    // Find closest tier match
    const closestTier = tierSizes.find(t => {
      if (!t.volumeMl) return false
      let targetVolume = t.volumeMl
      if (type === 'FROSTING') targetVolume = Math.round(t.volumeMl * 0.36)
      if (type === 'FILLING') targetVolume = Math.round(t.volumeMl * 0.12)
      return Math.abs(targetVolume - volume) < 100 // Within 100ml
    })

    if (closestTier) {
      return `For one ${closestTier.name}`
    }
    return `${volume}ml batch`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validIngredients = recipeIngredients.filter(ri => ri.ingredientId > 0 && ri.quantity > 0)

    // Calculate total labor from instructions or use manual override
    const calculatedLaborMinutes = instructionSteps.length > 0 ? totalInstructionMinutes : undefined
    const finalPrepMinutes = instructionSteps.length > 0 ? prepMinutesFromSteps : (prepMinutes ? parseInt(prepMinutes) : undefined)
    const finalBakeMinutes = instructionSteps.length > 0 ? bakeMinutesFromSteps : (bakeMinutes ? parseInt(bakeMinutes) : undefined)
    const finalCoolMinutes = instructionSteps.length > 0 ? coolMinutesFromSteps : (coolMinutes ? parseInt(coolMinutes) : undefined)

    try {
      if (recipe) {
        await updateRecipe(recipe.id, {
          name,
          type,
          yieldDescription: getYieldDescription(),
          yieldVolumeMl: yieldVolumeMl ? parseInt(yieldVolumeMl) : undefined,
          instructions: instructionSteps.length > 0 ? JSON.stringify(instructionSteps) : undefined,
          prepMinutes: finalPrepMinutes,
          bakeMinutes: finalBakeMinutes,
          coolMinutes: finalCoolMinutes,
          laborMinutes: calculatedLaborMinutes,
          laborRoleId: laborRoleId ? parseInt(laborRoleId) : undefined,
          ingredients: validIngredients
        })
      } else {
        await createRecipe({
          name,
          type,
          yieldDescription: getYieldDescription(),
          yieldVolumeMl: yieldVolumeMl ? parseInt(yieldVolumeMl) : undefined,
          instructions: instructionSteps.length > 0 ? JSON.stringify(instructionSteps) : undefined,
          prepMinutes: finalPrepMinutes,
          bakeMinutes: finalBakeMinutes,
          coolMinutes: finalCoolMinutes,
          laborMinutes: calculatedLaborMinutes,
          laborRoleId: laborRoleId ? parseInt(laborRoleId) : undefined,
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
    if (!confirm('Are you sure you want to delete this recipe? This may affect orders that use it.')) return

    setIsDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      router.push('/admin/recipes')
      router.refresh()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Error deleting recipe. It may be in use by orders.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate estimated ingredient cost
  const estimatedIngredientCost = recipeIngredients.reduce((total, ri) => {
    const ing = ingredients.find(i => i.id === ri.ingredientId)
    if (ing) {
      return total + (ri.quantity * ing.costPerUnit)
    }
    return total
  }, 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
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
        </div>
      </div>

      {/* Batch Yield Section - Simplified */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Batch Yield</h3>
        <p className="text-sm text-gray-500 mb-4">
          Define how much this recipe produces. The ingredients below are for ONE batch at this volume.
          When orders are placed, the system automatically calculates how many batches are needed.
        </p>

        <div className="grid grid-cols-6 gap-6">
          {/* Volume Input */}
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="yieldVolumeMl" className="block text-sm font-medium text-gray-700">
              Batch Volume (ml) *
            </label>
            <input
              type="number"
              id="yieldVolumeMl"
              min="1"
              required
              value={yieldVolumeMl}
              onChange={(e) => setYieldVolumeMl(e.target.value)}
              className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., 3295"
            />
            <p className="mt-1 text-xs text-gray-500">
              Total volume this recipe yields (used to calculate multipliers for orders)
            </p>
          </div>

          {/* Helper dropdown */}
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="helperTier" className="block text-sm font-medium text-gray-700">
              Calculate from tier size (helper)
            </label>
            <select
              id="helperTier"
              value={selectedHelperTier}
              onChange={(e) => handleTierHelperChange(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">Select a tier to auto-calculate volume...</option>
              {tierSizes.filter(t => t.volumeMl).map(tier => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} ({tier.volumeMl}ml, {tier.servings} servings)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a tier to auto-fill the volume (adjusted for {type.toLowerCase()})
            </p>
          </div>

          {/* Preview */}
          {yieldVolumeMl && (
            <div className="col-span-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">How scaling works:</p>
                    <p className="mt-1">
                      This recipe yields <strong>{parseInt(yieldVolumeMl).toLocaleString()}ml</strong> per batch.
                      {(() => {
                        const vol = parseInt(yieldVolumeMl)
                        const eightInch = tierSizes.find(t => t.name.includes('8 inch round'))
                        const tenInch = tierSizes.find(t => t.name.includes('10 inch round'))

                        if (type === 'BATTER' && eightInch?.volumeMl && tenInch?.volumeMl) {
                          const mult8 = (eightInch.volumeMl / vol).toFixed(2)
                          const mult10 = (tenInch.volumeMl / vol).toFixed(2)
                          return ` An 8" round (${eightInch.volumeMl}ml) needs ${mult8}x batches. A 10" round (${tenInch.volumeMl}ml) needs ${mult10}x batches.`
                        }
                        return ''
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Recipe Ingredients</h3>
            <p className="text-sm text-gray-500">Quantities for ONE batch ({yieldVolumeMl || '?'}ml)</p>
          </div>
          <a
            href="/admin/ingredients"
            target="_blank"
            className="text-sm text-pink-600 hover:text-pink-800"
          >
            Manage Ingredients →
          </a>
        </div>

        <div className="space-y-3">
          {recipeIngredients.map((ri, index) => {
            const ing = ingredients.find(i => i.id === ri.ingredientId)
            const lineCost = ing ? ri.quantity * ing.costPerUnit : 0
            return (
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
                  placeholder="Qty"
                  className="w-24 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
                <span className="w-20 text-sm text-gray-500 text-right">
                  ${lineCost.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addIngredient}
          className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          + Add Ingredient
        </button>

        {recipeIngredients.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Ingredient Cost per Batch:</span>
            <span className="text-lg font-semibold text-gray-900">${estimatedIngredientCost.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Step-by-Step Instructions */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Step-by-Step Instructions</h3>
        <p className="text-sm text-gray-500 mb-4">
          Add detailed steps with time estimates. Time is automatically totaled for labor cost calculation.
        </p>

        <div className="space-y-3">
          {instructionSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-700 font-medium text-sm">
                {step.step}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={step.description}
                  onChange={(e) => updateInstructionStep(index, 'description', e.target.value)}
                  placeholder="Describe this step..."
                  rows={2}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Type:</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateInstructionStep(index, 'type', e.target.value)}
                      className="py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-sm"
                    >
                      {STEP_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Time:</label>
                    <input
                      type="number"
                      min="0"
                      value={step.minutes || ''}
                      onChange={(e) => updateInstructionStep(index, 'minutes', e.target.value)}
                      placeholder="min"
                      className="w-20 py-1 px-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-sm"
                    />
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeInstructionStep(index)}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addInstructionStep}
          className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          + Add Step
        </button>

        {instructionSteps.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Prep</span>
                <span className="text-green-800">{prepMinutesFromSteps} min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Bake</span>
                <span className="text-green-800">{bakeMinutesFromSteps} min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800">Cool</span>
                <span className="text-green-800">{coolMinutesFromSteps} min</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="text-green-800">Total: {totalInstructionMinutes} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Labor Time - only show if no instructions */}
      {instructionSteps.length === 0 && (
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Labor Time (Manual Entry)</h3>
          <p className="text-sm text-gray-500 mb-4">
            If you prefer not to add step-by-step instructions, enter the time manually here.
          </p>
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="prepMinutes" className="block text-sm font-medium text-gray-700">
                Prep Time (min)
              </label>
              <input
                type="number"
                id="prepMinutes"
                min="0"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 30"
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="bakeMinutes" className="block text-sm font-medium text-gray-700">
                Bake Time (min)
              </label>
              <input
                type="number"
                id="bakeMinutes"
                min="0"
                value={bakeMinutes}
                onChange={(e) => setBakeMinutes(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 45"
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="coolMinutes" className="block text-sm font-medium text-gray-700">
                Cool Time (min)
              </label>
              <input
                type="number"
                id="coolMinutes"
                min="0"
                value={coolMinutes}
                onChange={(e) => setCoolMinutes(e.target.value)}
                className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., 60"
              />
            </div>
          </div>
        </div>
      )}

      {/* Labor Role */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Labor Role</h3>
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="laborRoleId" className="block text-sm font-medium text-gray-700">
              Who prepares this recipe?
            </label>
            <select
              id="laborRoleId"
              value={laborRoleId}
              onChange={(e) => setLaborRoleId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">Default (Baker)</option>
              {laborRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name} (${role.hourlyRate.toFixed(2)}/hr)
                </option>
              ))}
            </select>
          </div>

          {(instructionSteps.length > 0 || prepMinutes || bakeMinutes || coolMinutes) && (
            <div className="col-span-6 sm:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-6">
                <p className="text-sm text-blue-800">
                  {(() => {
                    const mins = instructionSteps.length > 0
                      ? totalInstructionMinutes
                      : (parseInt(prepMinutes || '0') + parseInt(bakeMinutes || '0') + parseInt(coolMinutes || '0'))
                    const role = laborRoles.find(r => r.id.toString() === laborRoleId)
                    const rate = role?.hourlyRate || laborRoles.find(r => r.name === 'Baker')?.hourlyRate || 21
                    const cost = (mins / 60) * rate
                    return `Labor cost per batch: ${mins} min × $${rate.toFixed(2)}/hr = $${cost.toFixed(2)}`
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Summary */}
      {(recipeIngredients.length > 0 || instructionSteps.length > 0) && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Cost Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">Ingredients</p>
              <p className="text-2xl font-bold text-gray-900">${estimatedIngredientCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">Labor</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(() => {
                  const mins = instructionSteps.length > 0
                    ? totalInstructionMinutes
                    : (parseInt(prepMinutes || '0') + parseInt(bakeMinutes || '0') + parseInt(coolMinutes || '0'))
                  const role = laborRoles.find(r => r.id.toString() === laborRoleId)
                  const rate = role?.hourlyRate || laborRoles.find(r => r.name === 'Baker')?.hourlyRate || 21
                  return ((mins / 60) * rate).toFixed(2)
                })()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total per Batch</p>
              <p className="text-2xl font-bold text-pink-600">
                ${(() => {
                  const mins = instructionSteps.length > 0
                    ? totalInstructionMinutes
                    : (parseInt(prepMinutes || '0') + parseInt(bakeMinutes || '0') + parseInt(coolMinutes || '0'))
                  const role = laborRoles.find(r => r.id.toString() === laborRoleId)
                  const rate = role?.hourlyRate || laborRoles.find(r => r.name === 'Baker')?.hourlyRate || 21
                  const laborCost = (mins / 60) * rate
                  return (estimatedIngredientCost + laborCost).toFixed(2)
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

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
    </form>
  )
}
