'use client'

import { useState } from 'react'
import { createBatchTypeConfig, updateBatchTypeConfig, deleteBatchTypeConfig } from '@/app/actions/admin'

interface BatchType {
  id: number
  code: string
  name: string
  description: string | null
  dependsOn: string[]
  leadTimeDays: number
  sortOrder: number
  isBatchable: boolean
  color: string | null
  isActive: boolean
}

interface FormData {
  code: string
  name: string
  description: string
  dependsOn: string[]
  leadTimeDays: string
  sortOrder: string
  isBatchable: boolean
  color: string
}

const COLORS = [
  { value: 'orange', label: 'Orange', class: 'bg-orange-200' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-200' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-200' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-200' },
  { value: 'green', label: 'Green', class: 'bg-green-200' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-200' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-200' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-200' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-200' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-200' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-200' },
]

const emptyForm: FormData = {
  code: '',
  name: '',
  description: '',
  dependsOn: [],
  leadTimeDays: '1',
  sortOrder: '0',
  isBatchable: true,
  color: 'blue',
}

const BUILT_IN_CODES = ['BAKE', 'PREP', 'STACK', 'FROST', 'DECORATE']

export default function BatchTypesList({
  initialBatchTypes,
  allCodes
}: {
  initialBatchTypes: BatchType[]
  allCodes: string[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newType, setNewType] = useState<FormData>(emptyForm)
  const [editType, setEditType] = useState<FormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newType.code || !newType.name) return
    setError(null)

    try {
      await createBatchTypeConfig({
        code: newType.code,
        name: newType.name,
        description: newType.description || undefined,
        dependsOn: newType.dependsOn.length > 0 ? newType.dependsOn : null,
        leadTimeDays: parseInt(newType.leadTimeDays) || 1,
        sortOrder: parseInt(newType.sortOrder) || 0,
        isBatchable: newType.isBatchable,
        color: newType.color || undefined,
      })

      setNewType(emptyForm)
      setIsAdding(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create batch type')
    }
  }

  const handleEdit = async (id: number) => {
    if (!editType.name) return
    setError(null)

    try {
      await updateBatchTypeConfig(id, {
        name: editType.name,
        description: editType.description || undefined,
        dependsOn: editType.dependsOn.length > 0 ? editType.dependsOn : null,
        leadTimeDays: parseInt(editType.leadTimeDays) || 1,
        sortOrder: parseInt(editType.sortOrder) || 0,
        isBatchable: editType.isBatchable,
        color: editType.color || undefined,
      })

      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update batch type')
    }
  }

  const handleDelete = async (id: number, code: string) => {
    setError(null)

    if (BUILT_IN_CODES.includes(code)) {
      setError(`Cannot delete built-in type "${code}". You can deactivate it instead.`)
      return
    }

    if (confirm(`Are you sure you want to delete the "${code}" batch type?`)) {
      try {
        await deleteBatchTypeConfig(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete batch type')
      }
    }
  }

  const handleToggleActive = async (bt: BatchType) => {
    setError(null)
    try {
      await updateBatchTypeConfig(bt.id, {
        name: bt.name,
        description: bt.description || undefined,
        dependsOn: bt.dependsOn.length > 0 ? bt.dependsOn : null,
        leadTimeDays: bt.leadTimeDays,
        sortOrder: bt.sortOrder,
        isBatchable: bt.isBatchable,
        color: bt.color || undefined,
        isActive: !bt.isActive,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update batch type')
    }
  }

  const startEdit = (bt: BatchType) => {
    setEditingId(bt.id)
    setEditType({
      code: bt.code,
      name: bt.name,
      description: bt.description || '',
      dependsOn: bt.dependsOn,
      leadTimeDays: bt.leadTimeDays.toString(),
      sortOrder: bt.sortOrder.toString(),
      isBatchable: bt.isBatchable,
      color: bt.color || 'blue',
    })
  }

  const toggleDependency = (form: FormData, setForm: (f: FormData) => void, code: string) => {
    const deps = form.dependsOn.includes(code)
      ? form.dependsOn.filter(d => d !== code)
      : [...form.dependsOn, code]
    setForm({ ...form, dependsOn: deps })
  }

  const getColorClass = (color: string | null) => {
    const c = COLORS.find(c => c.value === color)
    return c?.class || 'bg-gray-200'
  }

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden max-w-full">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Production Workflow Steps</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Step
          </button>
        )}
      </div>

      <div className="border-t border-gray-200">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Depends On</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch?</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isAdding && (
              <tr className="bg-pink-50">
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={newType.sortOrder}
                    onChange={(e) => setNewType({ ...newType, sortOrder: e.target.value })}
                    className="block w-12 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
                    className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                    placeholder="CODE"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                    placeholder="Display Name"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={newType.leadTimeDays}
                      onChange={(e) => setNewType({ ...newType, leadTimeDays: e.target.value })}
                      className="block w-12 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                    />
                    <span className="text-xs text-gray-500">days</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {allCodes.filter(c => c !== newType.code).map(code => (
                      <button
                        key={code}
                        onClick={() => toggleDependency(newType, setNewType, code)}
                        className={`px-2 py-0.5 text-xs rounded ${
                          newType.dependsOn.includes(code)
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={newType.isBatchable}
                    onChange={(e) => setNewType({ ...newType, isBatchable: e.target.checked })}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-3 py-2 text-sm">
                  <button onClick={handleAdd} className="text-green-600 hover:text-green-900 mr-2">Save</button>
                  <button onClick={() => { setIsAdding(false); setNewType(emptyForm); setError(null) }} className="text-gray-600 hover:text-gray-900">Cancel</button>
                </td>
              </tr>
            )}

            {initialBatchTypes.map((bt) => (
              editingId === bt.id ? (
                <tr key={bt.id} className="bg-pink-50">
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={editType.sortOrder}
                      onChange={(e) => setEditType({ ...editType, sortOrder: e.target.value })}
                      className="block w-12 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${getColorClass(bt.color)}`}>
                      {bt.code}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={editType.name}
                      onChange={(e) => setEditType({ ...editType, name: e.target.value })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editType.leadTimeDays}
                        onChange={(e) => setEditType({ ...editType, leadTimeDays: e.target.value })}
                        className="block w-12 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
                      />
                      <span className="text-xs text-gray-500">days</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {allCodes.filter(c => c !== bt.code).map(code => (
                        <button
                          key={code}
                          onClick={() => toggleDependency(editType, setEditType, code)}
                          className={`px-2 py-0.5 text-xs rounded ${
                            editType.dependsOn.includes(code)
                              ? 'bg-pink-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={editType.isBatchable}
                      onChange={(e) => setEditType({ ...editType, isBatchable: e.target.checked })}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button onClick={() => handleEdit(bt.id)} className="text-green-600 hover:text-green-900 mr-2">Save</button>
                    <button onClick={() => { setEditingId(null); setError(null) }} className="text-gray-600 hover:text-gray-900">Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={bt.id} className={!bt.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-3 py-2 text-sm text-gray-500">{bt.sortOrder}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${getColorClass(bt.color)}`}>
                      {bt.code}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{bt.name}</div>
                    {bt.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{bt.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {bt.leadTimeDays} day{bt.leadTimeDays !== 1 ? 's' : ''} before
                  </td>
                  <td className="px-3 py-2">
                    {bt.dependsOn.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {bt.dependsOn.map(dep => (
                          <span key={dep} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                            {dep}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {bt.isBatchable ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <button
                      onClick={() => startEdit(bt)}
                      className="text-pink-600 hover:text-pink-900 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(bt)}
                      className={`mr-2 ${bt.isActive ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {bt.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {!BUILT_IN_CODES.includes(bt.code) && (
                      <button
                        onClick={() => handleDelete(bt.id, bt.code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )
            ))}

            {initialBatchTypes.length === 0 && !isAdding && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No batch types configured. Add a step to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Workflow explanation */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How batch dependencies work:</h4>
        <p className="text-sm text-gray-600 mb-3">
          Each step can depend on other steps completing first. When auto-scheduling, the system suggests dates based on lead times and ensures dependencies are met.
        </p>
        <div className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
          <p className="font-medium mb-1">Example workflow for Saturday event:</p>
          <p>
            BAKE (Wed, -3 days) → PREP (Thu, -2 days) → STACK (Thu, -2 days) → FROST (Fri, -1 day) → DECORATE (Fri, -1 day)
          </p>
        </div>
      </div>

      {/* Custom step example */}
      <div className="px-4 py-4 bg-blue-50 border-t border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Adding custom steps:</h4>
        <p className="text-sm text-blue-700">
          You can add custom steps like &quot;COLOR_BC&quot; (Color Buttercream) that depends on PREP and happens before FROST.
          Set appropriate lead times and dependencies to fit your workflow.
        </p>
      </div>
    </div>
  )
}
