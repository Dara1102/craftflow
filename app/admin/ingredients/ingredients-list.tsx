'use client'

import { useState } from 'react'
import { createIngredient, updateIngredient, deleteIngredient } from '@/app/actions/admin'
import BarcodeScanner from './barcode-scanner'

interface Ingredient {
  id: number
  name: string
  unit: string
  costPerUnit: any
}

interface ProductInfo {
  name: string
  brand?: string
  category?: string
}

export default function IngredientsList({ initialIngredients }: { initialIngredients: Ingredient[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: '', costPerUnit: '' })
  const [editIngredient, setEditIngredient] = useState({ name: '', unit: '', costPerUnit: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newIngredient.name || !newIngredient.unit || !newIngredient.costPerUnit) return

    await createIngredient({
      name: newIngredient.name,
      unit: newIngredient.unit,
      costPerUnit: parseFloat(newIngredient.costPerUnit)
    })

    setNewIngredient({ name: '', unit: '', costPerUnit: '' })
    setIsAdding(false)
    setScannedBarcode(null)
  }

  const handleEdit = async (id: number) => {
    if (!editIngredient.name || !editIngredient.unit || !editIngredient.costPerUnit) return

    await updateIngredient(id, {
      name: editIngredient.name,
      unit: editIngredient.unit,
      costPerUnit: parseFloat(editIngredient.costPerUnit)
    })

    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      await deleteIngredient(id)
    }
  }

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id)
    setEditIngredient({
      name: ing.name,
      unit: ing.unit,
      costPerUnit: ing.costPerUnit.toString()
    })
  }

  const handleBarcodeScan = (barcode: string, productInfo: ProductInfo | null) => {
    setScannedBarcode(barcode)
    setShowScanner(false)
    setIsAdding(true)

    if (productInfo) {
      // Auto-fill name with product info
      const name = productInfo.brand
        ? `${productInfo.brand} ${productInfo.name}`
        : productInfo.name
      setNewIngredient({
        name: name.substring(0, 100), // Limit length
        unit: 'g', // Default to grams for food products
        costPerUnit: ''
      })
    } else {
      // No product found, just start add form
      setNewIngredient({
        name: `Product (Barcode: ${barcode})`,
        unit: 'g',
        costPerUnit: ''
      })
    }
  }

  return (
    <>
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">All Ingredients</h3>
        {!isAdding && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Barcode
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
            >
              Add Ingredient
            </button>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost per Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isAdding && (
              <tr>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    placeholder="Ingredient name"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    placeholder="g, ml, piece"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    step="0.001"
                    value={newIngredient.costPerUnit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={handleAdd}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewIngredient({ name: '', unit: '', costPerUnit: '' })
                      setScannedBarcode(null)
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
            {initialIngredients.map((ing) => (
              <tr key={ing.id}>
                {editingId === ing.id ? (
                  <>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editIngredient.name}
                        onChange={(e) => setEditIngredient({ ...editIngredient, name: e.target.value })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editIngredient.unit}
                        onChange={(e) => setEditIngredient({ ...editIngredient, unit: e.target.value })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.001"
                        value={editIngredient.costPerUnit}
                        onChange={(e) => setEditIngredient({ ...editIngredient, costPerUnit: e.target.value })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleEdit(ing.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ing.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ing.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${parseFloat(ing.costPerUnit.toString()).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEdit(ing)}
                        className="text-pink-600 hover:text-pink-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Barcode Scanner Modal */}
    {showScanner && (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
    )}

    {/* Scanned barcode info display */}
    {scannedBarcode && isAdding && (
      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-800">
          Scanned barcode: <code className="bg-purple-100 px-1 rounded">{scannedBarcode}</code>
        </p>
      </div>
    )}
    </>
  )
}