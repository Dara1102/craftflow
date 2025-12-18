'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface DecorationTechnique {
  id: number
  sku: string
  name: string
  category: string
  subcategory: string
  skillLevel: string
  description: string
  unit: string
  defaultCostPerUnit: string
  laborMinutes: number
  materialGrade: string
}

interface OrderDecoration {
  id: number
  decorationTechniqueId: number
  quantity: number
  notes: string | null
  decorationTechnique: DecorationTechnique
}

interface Order {
  id: number
  customerName: string
  orderDecorations: OrderDecoration[]
}

const skillLevelColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
}

export default function OrderDecorationsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = parseInt(params.id as string)

  const [order, setOrder] = useState<Order | null>(null)
  const [allTechniques, setAllTechniques] = useState<DecorationTechnique[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [orderRes, techniquesRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch('/api/decorations')
      ])

      if (orderRes.ok) {
        setOrder(await orderRes.json())
      }
      if (techniquesRes.ok) {
        setAllTechniques(await techniquesRes.json())
      }
      setLoading(false)
    }
    loadData()
  }, [orderId])

  const categories = [...new Set(allTechniques.map(t => t.category))].sort()

  const filteredTechniques = allTechniques.filter(t => {
    const matchesSearch = searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === '' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addedTechniqueIds = new Set(order?.orderDecorations.map(od => od.decorationTechniqueId) || [])

  async function addDecoration(techniqueId: number) {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/decorations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decorationTechniqueId: techniqueId, quantity: 1 })
      })
      if (res.ok) {
        const updatedOrder = await fetch(`/api/orders/${orderId}`).then(r => r.json())
        setOrder(updatedOrder)
      }
    })
  }

  async function updateQuantity(decorationId: number, quantity: number) {
    if (quantity < 1) return
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/decorations/${decorationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      if (res.ok) {
        const updatedOrder = await fetch(`/api/orders/${orderId}`).then(r => r.json())
        setOrder(updatedOrder)
      }
    })
  }

  async function removeDecoration(decorationId: number) {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/decorations/${decorationId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        const updatedOrder = await fetch(`/api/orders/${orderId}`).then(r => r.json())
        setOrder(updatedOrder)
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4">
        <p>Order not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-pink-600">Orders</Link>
        <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/orders/${order.id}`} className="hover:text-pink-600">{order.customerName}</Link>
        <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">Decorations</span>
      </nav>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id} Decorations</h1>
          <p className="text-sm text-gray-500">Select decoration techniques for {order.customerName}</p>
        </div>
        <Link
          href={`/orders/${order.id}/costing`}
          className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 text-sm font-medium"
        >
          View Costing
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Decorations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Selected Techniques ({order.orderDecorations.length})
          </h2>

          {order.orderDecorations.length === 0 ? (
            <p className="text-gray-500 text-sm">No decorations added yet. Select from the list on the right.</p>
          ) : (
            <div className="space-y-3">
              {order.orderDecorations.map((od) => (
                <div key={od.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{od.decorationTechnique.name}</div>
                      <div className="text-xs text-gray-500">{od.decorationTechnique.category} &bull; {od.decorationTechnique.subcategory}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ${parseFloat(od.decorationTechnique.defaultCostPerUnit).toFixed(2)} &bull; {od.decorationTechnique.laborMinutes} min
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(od.id, od.quantity - 1)}
                        disabled={od.quantity <= 1 || isPending}
                        className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{od.quantity}</span>
                      <button
                        onClick={() => updateQuantity(od.id, od.quantity + 1)}
                        disabled={isPending}
                        className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeDecoration(od.id)}
                        disabled={isPending}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {order.orderDecorations.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Material Cost:</span>
                <span className="font-medium">
                  ${order.orderDecorations.reduce((sum, od) =>
                    sum + parseFloat(od.decorationTechnique.defaultCostPerUnit) * od.quantity, 0
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Total Labor:</span>
                <span className="font-medium">
                  {order.orderDecorations.reduce((sum, od) =>
                    sum + od.decorationTechnique.laborMinutes * od.quantity, 0
                  )} min
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Available Techniques */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Techniques</h2>

          {/* Filters */}
          <div className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Search techniques..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Technique List */}
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {filteredTechniques.map((technique) => {
              const isAdded = addedTechniqueIds.has(technique.id)
              return (
                <div
                  key={technique.id}
                  className={`border rounded-lg p-3 ${isAdded ? 'bg-pink-50 border-pink-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{technique.name}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${skillLevelColors[technique.skillLevel]}`}>
                          {technique.skillLevel}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{technique.category} &bull; {technique.subcategory}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ${parseFloat(technique.defaultCostPerUnit).toFixed(2)} / {technique.unit.toLowerCase()} &bull; {technique.laborMinutes} min
                      </div>
                    </div>
                    <button
                      onClick={() => addDecoration(technique.id)}
                      disabled={isAdded || isPending}
                      className={`px-3 py-1 text-sm rounded-md ${
                        isAdded
                          ? 'bg-pink-100 text-pink-800 cursor-not-allowed'
                          : 'bg-pink-600 text-white hover:bg-pink-700'
                      }`}
                    >
                      {isAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
