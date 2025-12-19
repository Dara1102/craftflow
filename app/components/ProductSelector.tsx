'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface MenuItem {
  id: number
  name: string
  description: string | null
  menuPrice: number
  yieldsPerRecipe: number | null
  laborMinutes: number | null
  decorationLevel: string | null
  productType: {
    id: number
    name: string
    category: string
    baseUnit: string
  }
  defaultPackaging: {
    id: number
    name: string
    costPerUnit: number
  } | null
}

interface ProductType {
  id: number
  name: string
  category: string
  baseUnit: string
  _count: { menuItems: number }
}

interface Packaging {
  id: number
  name: string
  type: string
  costPerUnit: number
  capacity: number | null
  sizeFit: string | null
}

export interface PackagingSelection {
  packagingId: number
  quantity: number
}

export interface SelectedProduct {
  menuItemId: number
  quantity: number
  packagingSelections: PackagingSelection[]
  // Legacy fields for backwards compatibility
  packagingId?: number
  packagingQty?: number
  notes?: string
}

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[]
  onProductsChange: (products: SelectedProduct[]) => void
  showPackaging?: boolean
}

export default function ProductSelector({
  selectedProducts,
  onProductsChange,
  showPackaging = true
}: ProductSelectorProps) {
  const [selectedProductType, setSelectedProductType] = useState<number | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: productTypes } = useSWR<ProductType[]>('/api/product-types', fetcher)
  const { data: menuItems } = useSWR<MenuItem[]>('/api/menu-items', fetcher)
  const { data: packaging } = useSWR<Packaging[]>('/api/packaging', fetcher)

  // Filter menu items
  const filteredMenuItems = menuItems?.filter(item => {
    const matchesType = !selectedProductType || item.productType.id === selectedProductType
    const matchesSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productType.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  }) || []

  // Get menu item details by ID
  const getMenuItem = (id: number) => menuItems?.find(m => m.id === id)

  // Add a product
  const addProduct = (menuItemId: number) => {
    if (selectedProducts.find(p => p.menuItemId === menuItemId)) {
      return // Already added
    }
    const menuItem = getMenuItem(menuItemId)
    // Initialize with default packaging if available
    const initialPackaging: PackagingSelection[] = menuItem?.defaultPackaging
      ? [{ packagingId: menuItem.defaultPackaging.id, quantity: 1 }]
      : []
    onProductsChange([
      ...selectedProducts,
      {
        menuItemId,
        quantity: 1,
        packagingSelections: initialPackaging
      }
    ])
    setShowProductModal(false)
    setSearchTerm('')
  }

  // Remove a product
  const removeProduct = (menuItemId: number) => {
    onProductsChange(selectedProducts.filter(p => p.menuItemId !== menuItemId))
  }

  // Update product quantity
  const updateQuantity = (menuItemId: number, quantity: number) => {
    onProductsChange(selectedProducts.map(p =>
      p.menuItemId === menuItemId ? { ...p, quantity: Math.max(1, quantity) } : p
    ))
  }

  // Add packaging to a product
  const addPackaging = (menuItemId: number, packagingId: number) => {
    onProductsChange(selectedProducts.map(p => {
      if (p.menuItemId !== menuItemId) return p
      // Check if this packaging is already added
      if (p.packagingSelections.some(ps => ps.packagingId === packagingId)) return p
      return {
        ...p,
        packagingSelections: [...p.packagingSelections, { packagingId, quantity: 1 }]
      }
    }))
  }

  // Remove packaging from a product
  const removePackaging = (menuItemId: number, packagingId: number) => {
    onProductsChange(selectedProducts.map(p => {
      if (p.menuItemId !== menuItemId) return p
      return {
        ...p,
        packagingSelections: p.packagingSelections.filter(ps => ps.packagingId !== packagingId)
      }
    }))
  }

  // Update packaging quantity
  const updatePackagingQty = (menuItemId: number, packagingId: number, quantity: number) => {
    onProductsChange(selectedProducts.map(p => {
      if (p.menuItemId !== menuItemId) return p
      return {
        ...p,
        packagingSelections: p.packagingSelections.map(ps =>
          ps.packagingId === packagingId ? { ...ps, quantity: Math.max(1, quantity) } : ps
        )
      }
    }))
  }

  // Update notes
  const updateNotes = (menuItemId: number, notes: string) => {
    onProductsChange(selectedProducts.map(p =>
      p.menuItemId === menuItemId ? { ...p, notes: notes || undefined } : p
    ))
  }

  // Calculate subtotal for products
  const productsSubtotal = selectedProducts.reduce((sum, product) => {
    const menuItem = getMenuItem(product.menuItemId)
    const itemTotal = menuItem ? Number(menuItem.menuPrice) * product.quantity : 0
    // Sum all packaging selections
    const packagingTotal = product.packagingSelections.reduce((pkgSum, ps) => {
      const packagingItem = packaging?.find(p => p.id === ps.packagingId)
      return pkgSum + (packagingItem ? Number(packagingItem.costPerUnit) * ps.quantity : 0)
    }, 0)
    return sum + itemTotal + packagingTotal
  }, 0)

  return (
    <div className="space-y-4">
      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          {selectedProducts.map(product => {
            const menuItem = getMenuItem(product.menuItemId)
            if (!menuItem) return null

            const itemSubtotal = Number(menuItem.menuPrice) * product.quantity
            // Calculate total for all packaging selections
            const packagingSubtotal = product.packagingSelections.reduce((sum, ps) => {
              const pkg = packaging?.find(p => p.id === ps.packagingId)
              return sum + (pkg ? Number(pkg.costPerUnit) * ps.quantity : 0)
            }, 0)
            // Get available packaging (not already selected)
            const availablePackaging = packaging?.filter(
              pkg => !product.packagingSelections.some(ps => ps.packagingId === pkg.id)
            ) || []

            return (
              <div key={product.menuItemId} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{menuItem.name}</h4>
                    <p className="text-sm text-gray-500">{menuItem.productType.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.menuItemId)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => updateQuantity(product.menuItemId, parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Unit Price
                    </label>
                    <div className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                      ${Number(menuItem.menuPrice).toFixed(2)}
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Subtotal
                    </label>
                    <div className="px-2 py-1 bg-pink-50 text-pink-700 rounded-md text-sm font-medium">
                      ${(itemSubtotal + packagingSubtotal).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Packaging Section */}
                {showPackaging && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Packaging
                      </label>
                      {availablePackaging.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addPackaging(product.menuItemId, parseInt(e.target.value))
                            }
                          }}
                          className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">+ Add packaging...</option>
                          {availablePackaging.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} (${Number(pkg.costPerUnit).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {product.packagingSelections.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No packaging selected</p>
                    ) : (
                      <div className="space-y-2">
                        {product.packagingSelections.map(ps => {
                          const pkg = packaging?.find(p => p.id === ps.packagingId)
                          if (!pkg) return null
                          const pkgTotal = Number(pkg.costPerUnit) * ps.quantity
                          return (
                            <div key={ps.packagingId} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <div className="flex-1">
                                <span className="text-sm font-medium">{pkg.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ${Number(pkg.costPerUnit).toFixed(2)}/ea
                                  {pkg.capacity && ` • holds ${pkg.capacity}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={ps.quantity}
                                  onChange={(e) => updatePackagingQty(
                                    product.menuItemId,
                                    ps.packagingId,
                                    parseInt(e.target.value) || 1
                                  )}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-pink-500 focus:border-pink-500"
                                />
                                <span className="text-sm text-gray-600 w-16 text-right">
                                  ${pkgTotal.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removePackaging(product.menuItemId, ps.packagingId)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="Remove packaging"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={product.notes || ''}
                    onChange={(e) => updateNotes(product.menuItemId, e.target.value)}
                    placeholder="e.g., specific colors, decorations..."
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>
            )
          })}

          {/* Products Subtotal */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium text-gray-700">Products Subtotal</span>
            <span className="text-lg font-bold text-pink-600">
              ${productsSubtotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Add Product Button */}
      <button
        type="button"
        onClick={() => setShowProductModal(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-400 hover:text-pink-600 transition flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Product (Cupcakes, Cake Pops, etc.)
      </button>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Add Products</h3>
                <button
                  type="button"
                  onClick={() => { setShowProductModal(false); setSearchTerm(''); setSelectedProductType(null) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                />

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedProductType(null)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      selectedProductType === null
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {productTypes?.filter(pt => pt._count.menuItems > 0).map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setSelectedProductType(pt.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                        selectedProductType === pt.id
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pt.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="p-4 overflow-y-auto max-h-96">
              {filteredMenuItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No products found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMenuItems.map(item => {
                    const isSelected = selectedProducts.some(p => p.menuItemId === item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => !isSelected && addProduct(item.id)}
                        disabled={isSelected}
                        className={`text-left p-3 rounded-lg border transition ${
                          isSelected
                            ? 'bg-green-50 border-green-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-pink-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.productType.name}</p>
                          </div>
                          <span className="font-bold text-pink-600">
                            ${Number(item.menuPrice).toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                        )}
                        {isSelected && (
                          <span className="inline-block mt-2 text-xs text-green-600 font-medium">
                            Added
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
