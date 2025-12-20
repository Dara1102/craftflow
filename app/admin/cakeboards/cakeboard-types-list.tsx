'use client'

import { useState } from 'react'
import { createCakeboardType, updateCakeboardType, deleteCakeboardType } from '@/app/actions/admin'

interface CakeboardType {
  id: number
  name: string
  description: string | null
  vendorId: number | null
  vendorName: string | null
  availableSizes: string | null
  availableShapes: string | null
  costPerUnit: number | null
  notes: string | null
  sortOrder: number
  isActive: boolean
  tierCount: number
}

interface Vendor {
  id: number
  name: string
}

interface FormData {
  name: string
  description: string
  vendorId: string
  availableSizes: string
  availableShapes: string
  costPerUnit: string
  notes: string
  sortOrder: string
}

const emptyForm: FormData = {
  name: '',
  description: '',
  vendorId: '',
  availableSizes: '6,8,10,12,14,16',
  availableShapes: 'round,square',
  costPerUnit: '',
  notes: '',
  sortOrder: '0',
}

const defaultShapes = ['round', 'square', 'rectangle', 'heart', 'hexagon']

export default function CakeboardTypesList({
  initialTypes,
  vendors
}: {
  initialTypes: CakeboardType[]
  vendors: Vendor[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newType, setNewType] = useState<FormData>(emptyForm)
  const [editType, setEditType] = useState<FormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newType.name) {
      setError('Name is required')
      return
    }
    setError(null)

    try {
      await createCakeboardType({
        name: newType.name,
        description: newType.description || undefined,
        vendorId: newType.vendorId ? parseInt(newType.vendorId) : null,
        availableSizes: newType.availableSizes || undefined,
        availableShapes: newType.availableShapes || undefined,
        costPerUnit: newType.costPerUnit ? parseFloat(newType.costPerUnit) : null,
        notes: newType.notes || undefined,
        sortOrder: parseInt(newType.sortOrder) || 0,
      })

      setNewType(emptyForm)
      setIsAdding(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cakeboard type')
    }
  }

  const handleEdit = async (id: number) => {
    if (!editType.name) {
      setError('Name is required')
      return
    }
    setError(null)

    try {
      await updateCakeboardType(id, {
        name: editType.name,
        description: editType.description || undefined,
        vendorId: editType.vendorId ? parseInt(editType.vendorId) : null,
        availableSizes: editType.availableSizes || undefined,
        availableShapes: editType.availableShapes || undefined,
        costPerUnit: editType.costPerUnit ? parseFloat(editType.costPerUnit) : null,
        notes: editType.notes || undefined,
        sortOrder: parseInt(editType.sortOrder) || 0,
      })

      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update cakeboard type')
    }
  }

  const handleDelete = async (id: number, name: string, tierCount: number) => {
    setError(null)

    if (tierCount > 0) {
      setError(`Cannot delete "${name}" - it is assigned to ${tierCount} cake tier(s). Remove assignments first.`)
      return
    }

    if (confirm(`Are you sure you want to delete the "${name}" cakeboard type?`)) {
      try {
        await deleteCakeboardType(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete cakeboard type')
      }
    }
  }

  const startEdit = (type: CakeboardType) => {
    setEditingId(type.id)
    setEditType({
      name: type.name,
      description: type.description || '',
      vendorId: type.vendorId?.toString() || '',
      availableSizes: type.availableSizes || '',
      availableShapes: type.availableShapes || '',
      costPerUnit: type.costPerUnit?.toString() || '',
      notes: type.notes || '',
      sortOrder: type.sortOrder.toString(),
    })
  }

  const toggleShape = (form: FormData, setForm: (f: FormData) => void, shape: string) => {
    const currentShapes = form.availableShapes.split(',').filter(s => s.trim())
    const hasShape = currentShapes.includes(shape)
    const newShapes = hasShape
      ? currentShapes.filter(s => s !== shape)
      : [...currentShapes, shape]
    setForm({ ...form, availableShapes: newShapes.join(',') })
  }

  const renderFormRow = (form: FormData, setForm: (f: FormData) => void, onSave: () => void, onCancel: () => void) => {
    const selectedShapes = form.availableShapes.split(',').filter(s => s.trim())

    return (
      <div className="bg-pink-50 p-4 border-b border-pink-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              placeholder="e.g., Acrylic"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              placeholder="Optional description"
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={form.vendorId}
              onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            >
              <option value="">No vendor linked</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Available Sizes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Sizes (inches)</label>
            <input
              type="text"
              value={form.availableSizes}
              onChange={(e) => setForm({ ...form, availableSizes: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              placeholder="6,8,10,12,14,16"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated sizes</p>
          </div>

          {/* Available Shapes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Shapes</label>
            <div className="flex flex-wrap gap-2">
              {defaultShapes.map(shape => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => toggleShape(form, setForm, shape)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    selectedShapes.includes(shape)
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Per Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Cakeboard Types</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Type
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && renderFormRow(
        newType,
        setNewType,
        handleAdd,
        () => { setIsAdding(false); setNewType(emptyForm); setError(null) }
      )}

      {/* Types List */}
      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shapes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sizes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {initialTypes.map((type) => (
              editingId === type.id ? (
                <tr key={type.id}>
                  <td colSpan={7} className="p-0">
                    {renderFormRow(
                      editType,
                      setEditType,
                      () => handleEdit(type.id),
                      () => { setEditingId(null); setError(null) }
                    )}
                  </td>
                </tr>
              ) : (
                <tr key={type.id} className={!type.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{type.name}</div>
                    {type.description && (
                      <div className="text-xs text-gray-500">{type.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {type.availableShapes?.split(',').filter(s => s.trim()).map(shape => (
                        <span key={shape} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {shape.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {type.availableSizes ? (
                      <span className="text-xs">{type.availableSizes.split(',').map(s => `${s.trim()}"`).join(', ')}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {type.vendorName || <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {type.costPerUnit ? `$${type.costPerUnit.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {type.tierCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {type.tierCount} tier{type.tierCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => startEdit(type)}
                      className="text-pink-600 hover:text-pink-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(type.id, type.name, type.tierCount)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            ))}
            {initialTypes.length === 0 && !isAdding && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No cakeboard types configured. Add a type to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* How it works explanation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How cakeboard types work:</h4>
        <p className="text-sm text-gray-600 mb-3">
          Cakeboards are assigned to cake tiers during production planning. Each tier typically gets a board
          the same size as the tier, while the bottom tier also gets a drum (usually 2&quot; larger).
        </p>
        <div className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
          <p className="font-medium mb-1">Typical usage:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Drum</strong> - Thick cardboard, usually for bottom tier (under the cake)</li>
            <li><strong>Acrylic</strong> - Clear plastic, for display or between tiers</li>
            <li><strong>Masonite</strong> - Hard wood-based, very sturdy for heavy cakes</li>
            <li><strong>Cardboard</strong> - Thin, used between tiers for easy separation</li>
          </ul>
        </div>
      </div>

      {/* Suggested types helper */}
      <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested cakeboard types:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Drum</strong> - 1/2&quot; thick, foil-wrapped, sizes 6-18&quot;</li>
          <li><strong>Acrylic Disc</strong> - Clear 1/4&quot; thick, round only, 6-14&quot;</li>
          <li><strong>Masonite</strong> - Thin but sturdy, round and square, 8-16&quot;</li>
          <li><strong>Cardboard Round</strong> - Thin separator boards, 4-12&quot;</li>
          <li><strong>Square Drum</strong> - Square version of drum, 6-14&quot;</li>
        </ul>
      </div>
    </div>
  )
}
