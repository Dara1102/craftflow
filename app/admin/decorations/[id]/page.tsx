import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { DeleteButton } from '@/components/DeleteButton'
import { DuplicateButton } from '@/components/DuplicateButton'
import { duplicateDecoration } from '@/app/actions/decorations'

const skillLevels = ['LOW', 'MEDIUM', 'HIGH'] as const
const materialGrades = ['STANDARD', 'PREMIUM', 'LUXURY'] as const
const units = ['SINGLE', 'CAKE', 'TIER', 'SET'] as const

export default async function EditDecorationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [decoration, laborRoles] = await Promise.all([
    prisma.decorationTechnique.findUnique({
      where: { id: parseInt(id) },
    }),
    prisma.laborRole.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ])

  if (!decoration) {
    notFound()
  }

  async function updateDecoration(formData: FormData) {
    'use server'

    const laborRoleIdStr = formData.get('laborRoleId') as string
    const data = {
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      subcategory: formData.get('subcategory') as string,
      skillLevel: formData.get('skillLevel') as 'LOW' | 'MEDIUM' | 'HIGH',
      description: formData.get('description') as string,
      unit: formData.get('unit') as 'SINGLE' | 'CAKE' | 'TIER' | 'SET',
      baseCakeSize: formData.get('baseCakeSize') as string,
      defaultCostPerUnit: parseFloat(formData.get('defaultCostPerUnit') as string),
      laborMinutes: parseInt(formData.get('laborMinutes') as string),
      laborRoleId: laborRoleIdStr ? parseInt(laborRoleIdStr) : null,
      wasteFactorPercent: parseInt(formData.get('wasteFactorPercent') as string),
      materialGrade: formData.get('materialGrade') as 'STANDARD' | 'PREMIUM' | 'LUXURY',
      toolsRequired: formData.get('toolsRequired') as string,
      imageReference: (formData.get('imageReference') as string) || null,
      isActive: formData.get('isActive') === 'true',
    }

    await prisma.decorationTechnique.update({
      where: { id: parseInt(id) },
      data,
    })

    revalidatePath('/admin/decorations')
    redirect('/admin/decorations')
  }

  async function deleteDecoration() {
    'use server'

    await prisma.decorationTechnique.delete({
      where: { id: parseInt(id) },
    })

    revalidatePath('/admin/decorations')
    redirect('/admin/decorations')
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/decorations"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Decorations
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Edit Decoration Technique</h1>
          <p className="mt-1 text-sm text-gray-500">SKU: {decoration.sku}</p>
        </div>

        <form action={updateDecoration} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                id="sku"
                defaultValue={decoration.sku}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={decoration.name}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                name="category"
                id="category"
                defaultValue={decoration.category}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                Subcategory
              </label>
              <input
                type="text"
                name="subcategory"
                id="subcategory"
                defaultValue={decoration.subcategory}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              defaultValue={decoration.description}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
            />
          </div>

          {/* Skill, Grade, Unit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700">
                Skill Level
              </label>
              <select
                name="skillLevel"
                id="skillLevel"
                defaultValue={decoration.skillLevel}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              >
                {skillLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Decorator experience needed</p>
            </div>

            <div>
              <label htmlFor="materialGrade" className="block text-sm font-medium text-gray-700">
                Material Grade
              </label>
              <select
                name="materialGrade"
                id="materialGrade"
                defaultValue={decoration.materialGrade}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              >
                {materialGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Quality tier of materials</p>
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                Unit Type *
              </label>
              <select
                name="unit"
                id="unit"
                defaultValue={decoration.unit}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                required
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0) + unit.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800 font-medium mb-1">Unit Type Guide:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li><strong>SINGLE:</strong> Per-item (sugar flowers, toppers) - quantity = number of items, no scaling</li>
                  <li><strong>CAKE:</strong> Whole cake surface design (fondant quilt) - covers all tiers, scales by total surface area</li>
                  <li><strong>TIER:</strong> Per-tier design (ombre on specific tiers) - quantity = number of tiers, scales by average tier size</li>
                  <li><strong>SET:</strong> Matching set (unicorn cake set) - quantity = number of sets, no scaling</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2 italic">
                  CAKE and TIER require <code>baseCakeSize</code> to be set for proper scaling.
                </p>
              </div>
            </div>
          </div>

          {/* Cost & Labor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="baseCakeSize" className="block text-sm font-medium text-gray-700">
                Base Cake Size
              </label>
              <select
                name="baseCakeSize"
                id="baseCakeSize"
                defaultValue={decoration.baseCakeSize}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              >
                <optgroup label="Round">
                  {['4" round', '5" round', '6" round', '7" round', '8" round', '9" round', '10" round', '12" round', '14" round', '16" round'].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </optgroup>
                <optgroup label="Square (uses ~25% more material)">
                  {['6" square', '8" square', '10" square', '12" square', '14" square'].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </optgroup>
                <optgroup label="Sheet/Rectangle">
                  {['1/4 sheet (9×13")', '1/2 sheet (11×15")', 'Full sheet (18×24")', '1/4 slab (12×18")'].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1 text-xs text-gray-500">Cost/labor based on this size</p>
            </div>

            <div>
              <label htmlFor="defaultCostPerUnit" className="block text-sm font-medium text-gray-700">
                Material Cost ($)
              </label>
              <input
                type="number"
                name="defaultCostPerUnit"
                id="defaultCostPerUnit"
                step="0.01"
                min="0"
                defaultValue={parseFloat(decoration.defaultCostPerUnit.toString())}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Materials only, not labor</p>
            </div>

            <div>
              <label htmlFor="wasteFactorPercent" className="block text-sm font-medium text-gray-700">
                Waste Factor (%)
              </label>
              <input
                type="number"
                name="wasteFactorPercent"
                id="wasteFactorPercent"
                min="0"
                max="100"
                defaultValue={decoration.wasteFactorPercent}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Extra material needed</p>
            </div>
          </div>

          {/* Labor Role & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="laborRoleId" className="block text-sm font-medium text-gray-700">
                Labor Role
              </label>
              <select
                name="laborRoleId"
                id="laborRoleId"
                defaultValue={decoration.laborRoleId?.toString() || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              >
                <option value="">Default (Decorator)</option>
                {laborRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} (${Number(role.hourlyRate).toFixed(2)}/hr)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Who performs this technique - affects labor cost</p>
            </div>

            <div>
              <label htmlFor="laborMinutes" className="block text-sm font-medium text-gray-700">
                Labor (minutes)
              </label>
              <input
                type="number"
                name="laborMinutes"
                id="laborMinutes"
                min="0"
                defaultValue={decoration.laborMinutes}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Time to complete technique</p>
            </div>
          </div>

          {/* Tools & Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="toolsRequired" className="block text-sm font-medium text-gray-700">
                Tools Required
              </label>
              <input
                type="text"
                name="toolsRequired"
                id="toolsRequired"
                defaultValue={decoration.toolsRequired}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated list</p>
            </div>

            <div>
              <label htmlFor="imageReference" className="block text-sm font-medium text-gray-700">
                Image Reference
              </label>
              <input
                type="text"
                name="imageReference"
                id="imageReference"
                defaultValue={decoration.imageReference || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Path to reference image</p>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              value="true"
              defaultChecked={decoration.isActive}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active (available for use in orders)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <DeleteButton
                action={deleteDecoration}
                confirmMessage="Are you sure you want to delete this decoration technique?"
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete Technique
              </DeleteButton>
              <DuplicateButton
                action={duplicateDecoration.bind(null, decoration.id)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Duplicate
              </DuplicateButton>
            </div>

            <div className="flex space-x-3">
              <Link
                href="/admin/decorations"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md hover:bg-pink-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
