'use client'

import { useState, useEffect } from 'react'
import { createIngredient, updateIngredient, deleteIngredient } from '@/app/actions/admin'
import BarcodeScanner from './barcode-scanner'

interface IngredientVendor {
  id: number
  vendorId: number
  vendorName: string
  vendorSku: string | null
  vendorProductName: string | null
  packSize: number
  packUnit: string
  pricePerPack: number
  costPerIngredientUnit: number | null
  reorderUrl: string | null
  isPreferred: boolean
  notes: string | null
}

interface Vendor {
  id: number
  name: string
}

interface Ingredient {
  id: number
  name: string
  unit: string
  costPerUnit: any
  ingredientVendors?: IngredientVendor[]
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

  // Vendor management state
  const [vendorModalIngredient, setVendorModalIngredient] = useState<Ingredient | null>(null)
  const [ingredientVendors, setIngredientVendors] = useState<IngredientVendor[]>([])
  const [allVendors, setAllVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [addingVendor, setAddingVendor] = useState(false)
  const [newVendorLink, setNewVendorLink] = useState({
    vendorId: '',
    vendorSku: '',
    vendorProductName: '',
    packSize: '',
    packUnit: '',
    pricePerPack: '',
    reorderUrl: '',
    isPreferred: false,
    notes: ''
  })

  // Load vendors for an ingredient
  const openVendorModal = async (ing: Ingredient) => {
    setVendorModalIngredient(ing)
    setLoadingVendors(true)
    try {
      const [vendorsRes, ivRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch(`/api/ingredients/${ing.id}/vendors`)
      ])
      const vendors = await vendorsRes.json()
      const ivs = await ivRes.json()
      setAllVendors(vendors)
      setIngredientVendors(ivs)
    } catch (error) {
      console.error('Failed to load vendor data:', error)
    } finally {
      setLoadingVendors(false)
    }
  }

  const closeVendorModal = () => {
    setVendorModalIngredient(null)
    setIngredientVendors([])
    setAddingVendor(false)
    setNewVendorLink({
      vendorId: '',
      vendorSku: '',
      vendorProductName: '',
      packSize: '',
      packUnit: '',
      pricePerPack: '',
      reorderUrl: '',
      isPreferred: false,
      notes: ''
    })
  }

  const handleAddVendorLink = async () => {
    if (!vendorModalIngredient || !newVendorLink.vendorId || !newVendorLink.packSize || !newVendorLink.packUnit || !newVendorLink.pricePerPack) return

    try {
      const res = await fetch(`/api/ingredients/${vendorModalIngredient.id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: parseInt(newVendorLink.vendorId),
          vendorSku: newVendorLink.vendorSku || null,
          vendorProductName: newVendorLink.vendorProductName || null,
          packSize: parseFloat(newVendorLink.packSize),
          packUnit: newVendorLink.packUnit,
          pricePerPack: parseFloat(newVendorLink.pricePerPack),
          reorderUrl: newVendorLink.reorderUrl || null,
          isPreferred: newVendorLink.isPreferred,
          notes: newVendorLink.notes || null
        })
      })

      if (res.ok) {
        const newIv = await res.json()
        setIngredientVendors([...ingredientVendors, newIv])
        setAddingVendor(false)
        setNewVendorLink({
          vendorId: '',
          vendorSku: '',
          vendorProductName: '',
          packSize: '',
          packUnit: '',
          pricePerPack: '',
          reorderUrl: '',
          isPreferred: false,
          notes: ''
        })
      }
    } catch (error) {
      console.error('Failed to add vendor link:', error)
    }
  }

  const handleRemoveVendorLink = async (vendorId: number) => {
    if (!vendorModalIngredient) return
    if (!confirm('Remove this vendor link?')) return

    try {
      const res = await fetch(`/api/ingredients/${vendorModalIngredient.id}/vendors?vendorId=${vendorId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setIngredientVendors(ingredientVendors.filter(iv => iv.vendorId !== vendorId))
      }
    } catch (error) {
      console.error('Failed to remove vendor link:', error)
    }
  }

  const handleSetPreferred = async (vendorId: number) => {
    if (!vendorModalIngredient) return

    try {
      const res = await fetch(`/api/ingredients/${vendorModalIngredient.id}/vendors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, isPreferred: true })
      })

      if (res.ok) {
        setIngredientVendors(ingredientVendors.map(iv => ({
          ...iv,
          isPreferred: iv.vendorId === vendorId
        })))
      }
    } catch (error) {
      console.error('Failed to set preferred vendor:', error)
    }
  }

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
                        onClick={() => openVendorModal(ing)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Vendors
                      </button>
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

    {/* Vendor Management Modal */}
    {vendorModalIngredient && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Manage Vendors for {vendorModalIngredient.name}
              </h3>
              <p className="text-sm text-gray-500">
                Unit: {vendorModalIngredient.unit} | Current cost: ${parseFloat(vendorModalIngredient.costPerUnit.toString()).toFixed(4)}/{vendorModalIngredient.unit}
              </p>
            </div>
            <button
              onClick={closeVendorModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loadingVendors ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading vendors...</p>
              </div>
            ) : (
              <>
                {/* Existing vendor links */}
                {ingredientVendors.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Linked Vendors</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pack</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {ingredientVendors.map(iv => (
                            <tr key={iv.vendorId} className={iv.isPreferred ? 'bg-green-50' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900">{iv.vendorName}</span>
                                  {iv.isPreferred && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Preferred
                                    </span>
                                  )}
                                </div>
                                {iv.vendorProductName && (
                                  <div className="text-xs text-gray-500">{iv.vendorProductName}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {iv.vendorSku || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {iv.packSize} {iv.packUnit}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                ${iv.pricePerPack.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {iv.costPerIngredientUnit ? `$${iv.costPerIngredientUnit.toFixed(4)}` : '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {!iv.isPreferred && (
                                  <button
                                    onClick={() => handleSetPreferred(iv.vendorId)}
                                    className="text-green-600 hover:text-green-800 mr-2"
                                    title="Set as preferred vendor"
                                  >
                                    Set Preferred
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveVendorLink(iv.vendorId)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No vendors linked to this ingredient yet.</p>
                  </div>
                )}

                {/* Add new vendor link */}
                {addingVendor ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add Vendor Link</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Vendor *</label>
                        <select
                          value={newVendorLink.vendorId}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, vendorId: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select vendor...</option>
                          {allVendors
                            .filter(v => !ingredientVendors.some(iv => iv.vendorId === v.id))
                            .map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                        <input
                          type="text"
                          value={newVendorLink.vendorSku}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, vendorSku: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={newVendorLink.vendorProductName}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, vendorProductName: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Vendor's name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pack Size *</label>
                        <input
                          type="number"
                          step="0.001"
                          value={newVendorLink.packSize}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, packSize: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="e.g., 50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pack Unit *</label>
                        <input
                          type="text"
                          value={newVendorLink.packUnit}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, packUnit: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="e.g., lb, oz, each"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Price/Pack *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newVendorLink.pricePerPack}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, pricePerPack: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="$0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reorder URL</label>
                        <input
                          type="url"
                          value={newVendorLink.reorderUrl}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, reorderUrl: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center mt-5">
                          <input
                            type="checkbox"
                            checked={newVendorLink.isPreferred}
                            onChange={(e) => setNewVendorLink({ ...newVendorLink, isPreferred: e.target.checked })}
                            className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Set as preferred vendor</span>
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={newVendorLink.notes}
                          onChange={(e) => setNewVendorLink({ ...newVendorLink, notes: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Any notes..."
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setAddingVendor(false)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddVendorLink}
                        className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
                      >
                        Add Vendor Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingVendor(true)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-400 hover:text-pink-600 transition"
                  >
                    + Add Vendor Link
                  </button>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={closeVendorModal}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}