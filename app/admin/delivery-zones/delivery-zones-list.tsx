'use client'

import { useState } from 'react'
import { createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from '@/app/actions/admin'

interface DeliveryZone {
  id: number
  name: string
  description: string | null
  minDistance: number | null
  maxDistance: number | null
  baseFee: number
  perMileFee: number | null
  sortOrder: number
  isActive: boolean
}

interface FormData {
  name: string
  description: string
  minDistance: string
  maxDistance: string
  baseFee: string
  perMileFee: string
  sortOrder: string
}

const emptyForm: FormData = {
  name: '',
  description: '',
  minDistance: '',
  maxDistance: '',
  baseFee: '',
  perMileFee: '',
  sortOrder: '0',
}

export default function DeliveryZonesList({ initialZones }: { initialZones: DeliveryZone[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newZone, setNewZone] = useState<FormData>(emptyForm)
  const [editZone, setEditZone] = useState<FormData>(emptyForm)

  const handleAdd = async () => {
    if (!newZone.name || !newZone.baseFee) return

    await createDeliveryZone({
      name: newZone.name,
      description: newZone.description || undefined,
      minDistance: newZone.minDistance ? parseFloat(newZone.minDistance) : null,
      maxDistance: newZone.maxDistance ? parseFloat(newZone.maxDistance) : null,
      baseFee: parseFloat(newZone.baseFee),
      perMileFee: newZone.perMileFee ? parseFloat(newZone.perMileFee) : null,
      sortOrder: parseInt(newZone.sortOrder) || 0,
    })

    setNewZone(emptyForm)
    setIsAdding(false)
  }

  const handleEdit = async (id: number) => {
    if (!editZone.name || !editZone.baseFee) return

    await updateDeliveryZone(id, {
      name: editZone.name,
      description: editZone.description || undefined,
      minDistance: editZone.minDistance ? parseFloat(editZone.minDistance) : null,
      maxDistance: editZone.maxDistance ? parseFloat(editZone.maxDistance) : null,
      baseFee: parseFloat(editZone.baseFee),
      perMileFee: editZone.perMileFee ? parseFloat(editZone.perMileFee) : null,
      sortOrder: parseInt(editZone.sortOrder) || 0,
    })

    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this delivery zone?')) {
      await deleteDeliveryZone(id)
    }
  }

  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id)
    setEditZone({
      name: zone.name,
      description: zone.description || '',
      minDistance: zone.minDistance?.toString() || '',
      maxDistance: zone.maxDistance?.toString() || '',
      baseFee: zone.baseFee.toString(),
      perMileFee: zone.perMileFee?.toString() || '',
      sortOrder: zone.sortOrder.toString(),
    })
  }

  const formatDistance = (zone: DeliveryZone) => {
    if (zone.minDistance !== null && zone.maxDistance !== null) {
      return `${zone.minDistance} - ${zone.maxDistance} mi`
    } else if (zone.minDistance !== null) {
      return `${zone.minDistance}+ mi`
    } else if (zone.maxDistance !== null) {
      return `0 - ${zone.maxDistance} mi`
    }
    return 'Any distance'
  }

  const renderFormRow = (form: FormData, setForm: (f: FormData) => void, onSave: () => void, onCancel: () => void) => (
    <tr className="bg-pink-50">
      <td className="px-6 py-4">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
          placeholder="Zone name (e.g., Local)"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={form.minDistance}
            onChange={(e) => setForm({ ...form, minDistance: e.target.value })}
            className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="Min"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            step="0.1"
            value={form.maxDistance}
            onChange={(e) => setForm({ ...form, maxDistance: e.target.value })}
            className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="Max"
          />
          <span className="text-gray-500 text-sm">mi</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            value={form.baseFee}
            onChange={(e) => setForm({ ...form, baseFee: e.target.value })}
            className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="0.00"
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            value={form.perMileFee}
            onChange={(e) => setForm({ ...form, perMileFee: e.target.value })}
            className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="0.00"
          />
          <span className="text-gray-500 text-sm">/mi</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          className="block w-16 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
        />
      </td>
      <td className="px-6 py-4 text-sm font-medium">
        <button
          onClick={onSave}
          className="text-green-600 hover:text-green-900 mr-3"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </td>
    </tr>
  )

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Delivery Zones</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Zone
          </button>
        )}
      </div>
      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zone Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distance Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Per Mile Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sort Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isAdding && renderFormRow(
              newZone,
              setNewZone,
              handleAdd,
              () => { setIsAdding(false); setNewZone(emptyForm) }
            )}
            {initialZones.map((zone) => (
              editingId === zone.id ? (
                <tr key={zone.id}>
                  {renderFormRow(
                    editZone,
                    setEditZone,
                    () => handleEdit(zone.id),
                    () => setEditingId(null)
                  ).props.children}
                </tr>
              ) : (
                <tr key={zone.id} className={!zone.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{zone.name}</div>
                    {zone.description && (
                      <div className="text-xs text-gray-500">{zone.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistance(zone)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${zone.baseFee.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {zone.perMileFee ? `$${zone.perMileFee.toFixed(2)}/mi` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {zone.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => startEdit(zone)}
                      className="text-pink-600 hover:text-pink-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            ))}
            {initialZones.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No delivery zones configured. Add a zone to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* How it works explanation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How delivery pricing works:</h4>
        <p className="text-sm text-gray-600 mb-3">
          <strong>Base Fee</strong> is the flat rate charged for the zone. <strong>Per Mile Fee</strong> (optional) adds extra cost based on actual distance.
        </p>
        <div className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
          <p className="font-medium mb-1">Example calculation:</p>
          <p>Zone: Extended (10-25 miles) with $25 base + $2/mile</p>
          <p>Delivery distance: 18 miles</p>
          <p className="mt-1">= $25 (base) + ($2 x 18 miles) = <strong>$61 total</strong></p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Note: Currently, only the base fee is applied. Per-mile calculation requires distance tracking which can be added in the future.
        </p>
      </div>

      {/* Suggested zones helper - always visible */}
      <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested zone structure:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Local</strong> (0-10 miles) - $15 base fee</li>
          <li><strong>Extended</strong> (10-25 miles) - $25 base fee + $1.50/mile</li>
          <li><strong>Long Distance</strong> (25-50 miles) - $40 base fee + $2.00/mile</li>
        </ul>
      </div>
    </div>
  )
}
