'use client'

import { useState, useEffect } from 'react'
import { updateOrder, deleteOrder } from '@/app/actions/orders'
import { OrderStatus } from '@prisma/client'

interface TierSize {
  id: number
  name: string
  servings: number
}

interface CakeTier {
  id: number
  tierSizeId: number
  flavor: string
  filling: string
  finishType: string
  tierSize: TierSize
}

interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
}

interface Order {
  id: number
  customerId: number | null
  customerName: string | null
  customer: Customer | null
  eventDate: Date
  size: string | null
  notes: string | null
  estimatedHours: number
  status: OrderStatus
  cakeTiers: CakeTier[]
}

interface Props {
  order: Order
  tierSizes: TierSize[]
}

interface CustomerOption {
  id: number
  name: string
  email: string | null
  phone: string | null
}

export default function EditOrderForm({ order, tierSizes }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(
    order.customer || (order.customerName ? { id: 0, name: order.customerName, email: null, phone: null } : null)
  )
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  const [eventDate, setEventDate] = useState(
    new Date(order.eventDate).toISOString().split('T')[0]
  )
  const [size, setSize] = useState(order.size || '')
  const [notes, setNotes] = useState(order.notes || '')
  const [estimatedHours, setEstimatedHours] = useState(order.estimatedHours.toString())
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [tiers, setTiers] = useState(
    order.cakeTiers.map(tier => ({
      tierSizeId: tier.tierSizeId,
      flavor: tier.flavor,
      filling: tier.filling,
      finishType: tier.finishType
    }))
  )
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (customerSearch.length >= 2) {
      setSearchingCustomers(true)
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
          if (res.ok) {
            const data = await res.json()
            setCustomerResults(data)
          }
        } catch {
          console.error('Failed to search customers')
        } finally {
          setSearchingCustomers(false)
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setCustomerResults([])
    }
  }, [customerSearch])

  const addTier = () => {
    setTiers([...tiers, { tierSizeId: 0, flavor: '', filling: '', finishType: '' }])
  }

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: string, value: string | number) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer || selectedCustomer.id === 0) {
      alert('Please select a customer')
      return
    }

    const validTiers = tiers.filter(t => t.tierSizeId > 0 && t.flavor && t.filling && t.finishType)
    if (validTiers.length === 0) {
      alert('Please add at least one complete tier')
      return
    }

    await updateOrder(order.id, {
      customerId: selectedCustomer.id,
      eventDate,
      size: size || undefined,
      notes,
      estimatedHours: parseFloat(estimatedHours),
      status,
      tiers: validTiers
    })
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      setIsDeleting(true)
      await deleteOrder(order.id)
    }
  }

  const totalServings = tiers.reduce((sum, tier) => {
    const tierSize = tierSizes?.find((ts) => ts.id === tier.tierSizeId)
    return sum + (tierSize?.servings || 0)
  }, 0)

  const sizeOptions = [
    { value: '', label: 'Select size...' },
    { value: '6" round', label: '6" Round' },
    { value: '8" round', label: '8" Round' },
    { value: '10" round', label: '10" Round' },
    { value: '12" round', label: '12" Round' },
    { value: '2-tier', label: '2-Tier' },
    { value: '3-tier', label: '3-Tier' },
    { value: '4-tier', label: '4-Tier' },
    { value: 'quarter sheet', label: 'Quarter Sheet' },
    { value: 'half sheet', label: 'Half Sheet' },
    { value: 'full sheet', label: 'Full Sheet' },
    { value: 'other', label: 'Other (see notes)' },
  ]

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Cake Order</h1>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Order'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Order Details</h3>
                <p className="mt-1 text-sm text-gray-600">Basic information about the cake order.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  {/* Customer Selection */}
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer
                    </label>
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-md p-3">
                        <div>
                          <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                          {(selectedCustomer.email || selectedCustomer.phone) && (
                            <p className="text-sm text-gray-500">
                              {selectedCustomer.email}{selectedCustomer.email && selectedCustomer.phone && ' • '}{selectedCustomer.phone}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null)
                            setCustomerSearch('')
                          }}
                          className="text-pink-600 hover:text-pink-800 text-sm"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value)
                            setShowCustomerDropdown(true)
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          placeholder="Search customer by name, email, or phone..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        />
                        {showCustomerDropdown && customerSearch.length >= 2 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {searchingCustomers ? (
                              <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                            ) : customerResults.length > 0 ? (
                              customerResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(customer)
                                    setShowCustomerDropdown(false)
                                    setCustomerSearch('')
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-pink-50 border-b border-gray-100 last:border-0"
                                >
                                  <p className="font-medium text-gray-900">{customer.name}</p>
                                  {(customer.email || customer.phone) && (
                                    <p className="text-sm text-gray-500">
                                      {customer.email}{customer.email && customer.phone && ' • '}{customer.phone}
                                    </p>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                No customers found. <a href="/admin/customers/new" className="text-pink-600 hover:text-pink-800">Add new customer</a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                      Event Date
                    </label>
                    <input
                      type="date"
                      name="eventDate"
                      id="eventDate"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                      Cake Size
                    </label>
                    <select
                      id="size"
                      name="size"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      {sizeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      name="estimatedHours"
                      id="estimatedHours"
                      required
                      step="0.5"
                      min="0"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderStatus)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value={OrderStatus.DRAFT}>Draft</option>
                      <option value={OrderStatus.CONFIRMED}>Confirmed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Design details, special requests, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Cake Tiers</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure each tier of the cake.
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  Total Servings: {totalServings}
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
                {tiers.map((tier, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Tier {index + 1} (Bottom = 1)</h4>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Tier Size</label>
                        <select
                          value={tier.tierSizeId}
                          onChange={(e) => updateTier(index, 'tierSizeId', parseInt(e.target.value))}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          required
                        >
                          <option value={0}>Select size...</option>
                          {tierSizes?.map((ts) => (
                            <option key={ts.id} value={ts.id}>
                              {ts.name} ({ts.servings} servings)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Flavor</label>
                        <input
                          type="text"
                          value={tier.flavor}
                          onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Vanilla, Chocolate..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Filling</label>
                        <input
                          type="text"
                          value={tier.filling}
                          onChange={(e) => updateTier(index, 'filling', e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Strawberry, Cream..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Finish Type</label>
                        <input
                          type="text"
                          value={tier.finishType}
                          onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Buttercream, Fondant..."
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Add Tier
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="/"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
