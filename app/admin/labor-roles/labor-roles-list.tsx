'use client'

import { useState } from 'react'
import { createLaborRole, updateLaborRole, deleteLaborRole } from '@/app/actions/admin'

interface LaborRole {
  id: number
  name: string
  description: string | null
  hourlyRate: number
  sortOrder: number
  isActive: boolean
  techniqueCount: number
}

interface FormData {
  name: string
  description: string
  hourlyRate: string
  sortOrder: string
}

const emptyForm: FormData = {
  name: '',
  description: '',
  hourlyRate: '',
  sortOrder: '0',
}

export default function LaborRolesList({ initialRoles }: { initialRoles: LaborRole[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newRole, setNewRole] = useState<FormData>(emptyForm)
  const [editRole, setEditRole] = useState<FormData>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newRole.name || !newRole.hourlyRate) return
    setError(null)

    try {
      await createLaborRole({
        name: newRole.name,
        description: newRole.description || undefined,
        hourlyRate: parseFloat(newRole.hourlyRate),
        sortOrder: parseInt(newRole.sortOrder) || 0,
      })

      setNewRole(emptyForm)
      setIsAdding(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create role')
    }
  }

  const handleEdit = async (id: number) => {
    if (!editRole.name || !editRole.hourlyRate) return
    setError(null)

    try {
      await updateLaborRole(id, {
        name: editRole.name,
        description: editRole.description || undefined,
        hourlyRate: parseFloat(editRole.hourlyRate),
        sortOrder: parseInt(editRole.sortOrder) || 0,
      })

      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    }
  }

  const handleDelete = async (id: number, name: string, techniqueCount: number) => {
    setError(null)

    if (techniqueCount > 0) {
      setError(`Cannot delete "${name}" - it is assigned to ${techniqueCount} decoration technique(s). Reassign those techniques first.`)
      return
    }

    if (confirm(`Are you sure you want to delete the "${name}" role?`)) {
      try {
        await deleteLaborRole(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete role')
      }
    }
  }

  const startEdit = (role: LaborRole) => {
    setEditingId(role.id)
    setEditRole({
      name: role.name,
      description: role.description || '',
      hourlyRate: role.hourlyRate.toString(),
      sortOrder: role.sortOrder.toString(),
    })
  }

  const renderFormRow = (form: FormData, setForm: (f: FormData) => void, onSave: () => void, onCancel: () => void) => (
    <tr className="bg-pink-50">
      <td className="px-3 py-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
          placeholder="Role name"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
          placeholder="Description"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={form.hourlyRate}
          onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
          className="block w-14 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
          placeholder="$/hr"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          className="block w-10 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-sm"
        />
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">-</td>
      <td className="px-3 py-2 text-sm">
        <button onClick={onSave} className="text-green-600 hover:text-green-900 mr-2">Save</button>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-900">Cancel</button>
      </td>
    </tr>
  )

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden max-w-full">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Labor Roles</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Role
          </button>
        )}
      </div>
      <div className="border-t border-gray-200 overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Rate
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Tech
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isAdding && renderFormRow(
              newRole,
              setNewRole,
              handleAdd,
              () => { setIsAdding(false); setNewRole(emptyForm); setError(null) }
            )}
            {initialRoles.map((role) => (
              editingId === role.id ? (
                <tr key={role.id}>
                  {renderFormRow(
                    editRole,
                    setEditRole,
                    () => handleEdit(role.id),
                    () => { setEditingId(null); setError(null) }
                  ).props.children}
                </tr>
              ) : (
                <tr key={role.id} className={!role.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm text-gray-500 max-w-[200px] truncate">
                      {role.description || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    ${role.hourlyRate.toFixed(0)}/hr
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {role.sortOrder}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {role.techniqueCount > 0 ? (
                      <span className="text-blue-600">{role.techniqueCount}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <button
                      onClick={() => startEdit(role)}
                      className="text-pink-600 hover:text-pink-900 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(role.id, role.name, role.techniqueCount)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              )
            ))}
            {initialRoles.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No labor roles configured. Add a role to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* How it works explanation */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How labor roles work:</h4>
        <p className="text-sm text-gray-600 mb-3">
          Each decoration technique can be assigned a labor role. When calculating costs, the technique&apos;s labor minutes are multiplied by the role&apos;s hourly rate.
        </p>
        <div className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
          <p className="font-medium mb-1">Example:</p>
          <p>Fondant Roses (45 min) x Decorator ($30/hr) = <strong>$22.50</strong></p>
        </div>
      </div>

      {/* Suggested roles helper */}
      <div className="px-4 py-4 bg-blue-50 border-t border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested roles:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Decorator</strong> ($25-35/hr) - Fondant, piping, sugar flowers</li>
          <li><strong>Baker</strong> ($20-22/hr) - Batter prep, baking, frosting</li>
          <li><strong>Assistant</strong> ($17-19/hr) - Cupcakes, stacking, packaging</li>
        </ul>
      </div>
    </div>
  )
}
