'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { OrderStatus, CakeType } from '@prisma/client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Customer {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
}

interface TierSize {
  id: number
  name: string
  servings: number
  shape: string
}

interface AirtableChoice {
  id: string
  name: string
  color?: string
}

interface AirtableOptions {
  product: AirtableChoice[]
  type: AirtableChoice[]
  cakeSurface: AirtableChoice[]
  design: AirtableChoice[]
  size: AirtableChoice[]
  servingSize: AirtableChoice[]
  occasion: AirtableChoice[]
  theme: AirtableChoice[]
  colors: AirtableChoice[]
  decorations: AirtableChoice[]
  brands: AirtableChoice[]
}

interface DecorationTechnique {
  id: number
  name: string
  category: string
  subcategory: string
  defaultCostPerUnit: string
  skillLevel: string
}

interface SelectedDecoration {
  decorationTechniqueId: number
  quantity: number
  notes?: string
}

export default function NewOrder() {
  // Customer state
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // New customer form
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCompany, setNewCustomerCompany] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')

  // Order state - Basic
  const [eventDate, setEventDate] = useState('')
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.DRAFT)
  const [notes, setNotes] = useState('')

  // Cake details
  const [cakeType, setCakeType] = useState<CakeType | ''>('')
  const [size, setSize] = useState('')

  // Event details
  const [theme, setTheme] = useState('')
  const [occasion, setOccasion] = useState('')
  const [colors, setColors] = useState('')

  // Delivery details
  const [isDelivery, setIsDelivery] = useState(false)
  const [deliveryContact, setDeliveryContact] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')

  // Labor (auto-calculated but editable)
  const [estimatedHours, setEstimatedHours] = useState('0')
  const [hoursManuallySet, setHoursManuallySet] = useState(false)

  // Tiers
  const [tiers, setTiers] = useState([
    { tierSizeId: 0, flavor: '', filling: '', finishType: '' }
  ])

  // Decorations
  const [selectedDecorations, setSelectedDecorations] = useState<SelectedDecoration[]>([])
  const [decorationSearch, setDecorationSearch] = useState('')

  // Topper
  const [topperType, setTopperType] = useState('')
  const [topperText, setTopperText] = useState('')
  const [customTopperFee, setCustomTopperFee] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: tierSizes } = useSWR<TierSize[]>('/api/tier-sizes', fetcher)
  const { data: customers, mutate: mutateCustomers } = useSWR(
    customerSearch.length >= 2 ? `/api/customers?search=${encodeURIComponent(customerSearch)}` : null,
    fetcher
  )
  const { data: airtableOptions } = useSWR<AirtableOptions>('/api/airtable/options', fetcher)
  const { data: decorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-calculate size and estimated hours from tiers
  useEffect(() => {
    if (!tierSizes || tiers.length === 0) return

    const validTiers = tiers.filter(t => t.tierSizeId > 0)
    if (validTiers.length === 0) return

    // Auto-calculate size based on tiers
    if (validTiers.length === 1) {
      const tierSize = tierSizes.find(ts => ts.id === validTiers[0].tierSizeId)
      if (tierSize) {
        setSize(`${tierSize.name}`)
      }
    } else {
      setSize(`${validTiers.length}-tier`)
    }

    // Auto-calculate cake type based on tiers
    if (validTiers.length > 1) {
      setCakeType(CakeType.TIERED)
    } else if (validTiers.length === 1) {
      const tierSize = tierSizes.find(ts => ts.id === validTiers[0].tierSizeId)
      if (tierSize) {
        if (tierSize.shape === 'Sheet' || tierSize.name.toLowerCase().includes('sheet')) {
          setCakeType(CakeType.SHEET)
        } else {
          setCakeType(CakeType.ROUND)
        }
      }
    }

    // Auto-calculate estimated hours (if not manually set)
    if (!hoursManuallySet) {
      // Base hours per tier + complexity
      let hours = 0
      validTiers.forEach(tier => {
        const tierSize = tierSizes.find(ts => ts.id === tier.tierSizeId)
        if (tierSize) {
          // Base time: servings / 10 + finishing time based on type
          hours += tierSize.servings / 10
          if (tier.finishType.toLowerCase().includes('fondant')) {
            hours += 2
          } else if (tier.finishType.toLowerCase().includes('buttercream')) {
            hours += 1
          }
        }
      })
      // Minimum 2 hours, round to nearest 0.5
      hours = Math.max(2, Math.round(hours * 2) / 2)
      setEstimatedHours(hours.toString())
    }
  }, [tiers, tierSizes, hoursManuallySet])

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id)
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
    setShowNewCustomerForm(false)
    // Pre-fill delivery address from customer address
    if (customer.address && !deliveryAddress) {
      setDeliveryAddress(customer.address)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Customer name is required')
      return
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName,
          company: newCustomerCompany,
          email: newCustomerEmail,
          phone: newCustomerPhone,
          address: newCustomerAddress,
        }),
      })

      if (response.ok) {
        const customer = await response.json()
        selectCustomer(customer)
        setShowNewCustomerForm(false)
        setNewCustomerName('')
        setNewCustomerCompany('')
        setNewCustomerEmail('')
        setNewCustomerPhone('')
        setNewCustomerAddress('')
        mutateCustomers()
      } else {
        alert('Failed to create customer')
      }
    } catch {
      alert('Failed to create customer')
    }
  }

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

  // Decoration helpers
  const addDecoration = (decorationId: number) => {
    if (selectedDecorations.find(d => d.decorationTechniqueId === decorationId)) {
      return // Already added
    }
    setSelectedDecorations([...selectedDecorations, { decorationTechniqueId: decorationId, quantity: 1 }])
    setDecorationSearch('')
  }

  const removeDecoration = (decorationId: number) => {
    setSelectedDecorations(selectedDecorations.filter(d => d.decorationTechniqueId !== decorationId))
  }

  const updateDecorationQuantity = (decorationId: number, quantity: number) => {
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === decorationId ? { ...d, quantity } : d
    ))
  }

  const filteredDecorations = decorations?.filter(d =>
    decorationSearch.length >= 2 &&
    (d.name.toLowerCase().includes(decorationSearch.toLowerCase()) ||
     d.category.toLowerCase().includes(decorationSearch.toLowerCase()) ||
     d.subcategory.toLowerCase().includes(decorationSearch.toLowerCase()))
  ) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId) {
      alert('Please select or create a customer')
      return
    }

    const validTiers = tiers.filter(t => t.tierSizeId > 0 && t.flavor && t.filling && t.finishType)
    if (validTiers.length === 0) {
      alert('Please add at least one complete tier')
      return
    }

    await createOrder({
      customerId,
      eventDate,
      cakeType: cakeType || undefined,
      size,
      theme: theme || undefined,
      occasion: occasion || undefined,
      colors: colors || undefined,
      isDelivery,
      deliveryContact: isDelivery ? deliveryContact : undefined,
      deliveryPhone: isDelivery ? deliveryPhone : undefined,
      deliveryTime: isDelivery && deliveryTime ? deliveryTime : undefined,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      estimatedHours: parseFloat(estimatedHours),
      topperType: topperType || undefined,
      topperText: topperText || undefined,
      customTopperFee: customTopperFee ? parseFloat(customTopperFee) : undefined,
      notes,
      status,
      tiers: validTiers.map(t => ({
        ...t,
        tierSizeId: parseInt(t.tierSizeId.toString())
      })),
      decorations: selectedDecorations
    })
  }

  const totalServings = tiers.reduce((sum, tier) => {
    const tierSize = tierSizes?.find((ts) => ts.id === parseInt(tier.tierSizeId.toString()))
    return sum + (tierSize?.servings || 0)
  }, 0)

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-600">Orders</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">New Order</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Cake Order</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Section */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Customer</h3>
                <p className="mt-1 text-sm text-gray-600">Search for an existing customer or add a new one.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                {/* Customer Search */}
                <div className="relative" ref={dropdownRef}>
                  <label htmlFor="customerSearch" className="block text-sm font-medium text-gray-700">
                    Search Customer
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="customerSearch"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerDropdown(e.target.value.length >= 2)
                        if (e.target.value !== selectedCustomer?.name) {
                          setCustomerId(null)
                          setSelectedCustomer(null)
                        }
                      }}
                      onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                      placeholder="Type to search customers..."
                      className="focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    {selectedCustomer && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {customers && customers.length > 0 ? (
                        customers.map((customer: Customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full text-left px-4 py-2 hover:bg-pink-50 focus:bg-pink-50"
                          >
                            <div className="font-medium text-gray-900">
                              {customer.name}
                              {customer.company && <span className="text-gray-500 font-normal"> - {customer.company}</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {[customer.email, customer.phone].filter(Boolean).join(' • ')}
                            </div>
                          </button>
                        ))
                      ) : customerSearch.length >= 2 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No customers found
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCustomerForm(true)
                          setShowCustomerDropdown(false)
                          setNewCustomerName(customerSearch)
                        }}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 border-t text-pink-600 font-medium"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  )}
                </div>

                {/* Selected Customer Details */}
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                        {selectedCustomer.company && <p className="text-sm text-gray-600">{selectedCustomer.company}</p>}
                        {selectedCustomer.email && <p className="text-sm text-gray-500">{selectedCustomer.email}</p>}
                        {selectedCustomer.phone && <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId(null)
                          setSelectedCustomer(null)
                          setCustomerSearch('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* New Customer Form */}
                {showNewCustomerForm && (
                  <div className="mt-4 p-4 border border-pink-200 rounded-md bg-pink-50">
                    <h4 className="font-medium text-gray-900 mb-3">New Customer</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                          type="text"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company</label>
                        <input
                          type="text"
                          value={newCustomerCompany}
                          onChange={(e) => setNewCustomerCompany(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input
                          type="text"
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerForm(false)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        className="px-3 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md"
                      >
                        Save Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Event Details</h3>
                <p className="mt-1 text-sm text-gray-600">Information about the event and design.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                      Event Date *
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
                    <label htmlFor="occasion" className="block text-sm font-medium text-gray-700">
                      Occasion
                    </label>
                    <select
                      id="occasion"
                      name="occasion"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select occasion...</option>
                      {airtableOptions?.occasion?.map(opt => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                      Theme
                    </label>
                    <select
                      id="theme"
                      name="theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select theme...</option>
                      {airtableOptions?.theme?.map(opt => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colors
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {airtableOptions?.colors?.map(color => {
                        const selectedColors = colors.split(',').map(c => c.trim()).filter(Boolean)
                        const isSelected = selectedColors.includes(color.name)
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setColors(selectedColors.filter(c => c !== color.name).join(', '))
                              } else {
                                setColors([...selectedColors, color.name].join(', '))
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded-full border transition ${
                              isSelected
                                ? 'bg-pink-100 border-pink-500 text-pink-700'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-pink-300'
                            }`}
                          >
                            {color.name}
                          </button>
                        )
                      })}
                    </div>
                    {colors && (
                      <p className="mt-1 text-xs text-gray-500">Selected: {colors}</p>
                    )}
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
                      <option value={OrderStatus.IN_PROGRESS}>In Progress</option>
                      <option value={OrderStatus.COMPLETED}>Completed</option>
                      <option value={OrderStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Section */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Delivery</h3>
                <p className="mt-1 text-sm text-gray-600">Delivery information if applicable.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="isDelivery"
                      name="isDelivery"
                      type="checkbox"
                      checked={isDelivery}
                      onChange={(e) => setIsDelivery(e.target.checked)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDelivery" className="ml-2 block text-sm text-gray-900">
                      This order requires delivery
                    </label>
                  </div>

                  {isDelivery && (
                    <div className="grid grid-cols-6 gap-4 pt-4 border-t border-gray-200">
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="deliveryContact" className="block text-sm font-medium text-gray-700">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          name="deliveryContact"
                          id="deliveryContact"
                          value={deliveryContact}
                          onChange={(e) => setDeliveryContact(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="deliveryPhone" className="block text-sm font-medium text-gray-700">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          name="deliveryPhone"
                          id="deliveryPhone"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="deliveryTime" className="block text-sm font-medium text-gray-700">
                          Delivery Time
                        </label>
                        <input
                          type="datetime-local"
                          name="deliveryTime"
                          id="deliveryTime"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>

                      <div className="col-span-6">
                        <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700">
                          Delivery Address
                        </label>
                        <textarea
                          name="deliveryAddress"
                          id="deliveryAddress"
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cake Tiers */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Cake Tiers</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure each tier of the cake.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Total Servings: <span className="text-pink-600">{totalServings}</span>
                  </p>
                  {size && (
                    <p className="text-sm font-medium text-gray-700">
                      Size: <span className="text-pink-600">{size}</span>
                    </p>
                  )}
                  {cakeType && (
                    <p className="text-sm font-medium text-gray-700">
                      Type: <span className="text-pink-600">{cakeType}</span>
                    </p>
                  )}
                </div>
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
                        <select
                          value={tier.finishType}
                          onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          required
                        >
                          <option value="">Select finish...</option>
                          {airtableOptions?.cakeSurface?.map(opt => (
                            <option key={opt.id} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
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

          {/* Decorations */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Decorations</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Add decorations to your order. Sculpted characters and complex designs add significantly to the cost.
                </p>
                <Link
                  href="/admin/decorations"
                  target="_blank"
                  className="mt-2 inline-flex items-center text-sm text-pink-600 hover:text-pink-700"
                >
                  Manage decorations
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
                {/* Search decorations */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Search Decorations</label>
                  <input
                    type="text"
                    value={decorationSearch}
                    onChange={(e) => setDecorationSearch(e.target.value)}
                    placeholder="Type to search (e.g., drip, fondant, flowers...)"
                    className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                  {filteredDecorations.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {filteredDecorations.slice(0, 10).map((dec) => (
                        <button
                          key={dec.id}
                          type="button"
                          onClick={() => addDecoration(dec.id)}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50 focus:bg-pink-50"
                        >
                          <div className="font-medium text-gray-900">{dec.name}</div>
                          <div className="text-sm text-gray-500">
                            {dec.category} &bull; {dec.subcategory} &bull; ${dec.defaultCostPerUnit}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected decorations */}
                {selectedDecorations.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Selected Decorations</label>
                    {selectedDecorations.map((sd) => {
                      const dec = decorations?.find(d => d.id === sd.decorationTechniqueId)
                      if (!dec) return null
                      return (
                        <div key={sd.decorationTechniqueId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{dec.name}</p>
                            <p className="text-sm text-gray-500">${dec.defaultCostPerUnit}/unit</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              <label className="sr-only">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={sd.quantity}
                                onChange={(e) => updateDecorationQuantity(sd.decorationTechniqueId, parseInt(e.target.value) || 1)}
                                className="w-16 text-center border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDecoration(sd.decorationTechniqueId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <p className="text-sm text-gray-600 text-right">
                      Est. Decoration Cost: <span className="font-medium text-pink-600">
                        ${selectedDecorations.reduce((sum, sd) => {
                          const dec = decorations?.find(d => d.id === sd.decorationTechniqueId)
                          return sum + (parseFloat(dec?.defaultCostPerUnit || '0') * sd.quantity)
                        }, 0).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Topper */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Topper</h3>
                <p className="mt-1 text-sm text-gray-600">Standard toppers or custom options.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="topperType" className="block text-sm font-medium text-gray-700">
                      Topper Type
                    </label>
                    <select
                      id="topperType"
                      name="topperType"
                      value={topperType}
                      onChange={(e) => setTopperType(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">None</option>
                      <option value="age">Age Number</option>
                      <option value="happy_birthday">Happy Birthday</option>
                      <option value="its_a_boy">It&apos;s a Boy</option>
                      <option value="its_a_girl">It&apos;s a Girl</option>
                      <option value="initials">Initials</option>
                      <option value="congratulations">Congratulations</option>
                      <option value="custom">Custom Topper</option>
                    </select>
                  </div>

                  {(topperType === 'age' || topperType === 'initials' || topperType === 'custom') && (
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="topperText" className="block text-sm font-medium text-gray-700">
                        {topperType === 'age' ? 'Age' : topperType === 'initials' ? 'Initials' : 'Custom Text'}
                      </label>
                      <input
                        type="text"
                        id="topperText"
                        name="topperText"
                        value={topperText}
                        onChange={(e) => setTopperText(e.target.value)}
                        placeholder={topperType === 'age' ? 'e.g., 30' : topperType === 'initials' ? 'e.g., J&M' : 'Enter custom text...'}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  )}

                  {topperType === 'custom' && (
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="customTopperFee" className="block text-sm font-medium text-gray-700">
                        Custom Topper Fee ($)
                      </label>
                      <input
                        type="number"
                        id="customTopperFee"
                        name="customTopperFee"
                        step="0.01"
                        min="0"
                        value={customTopperFee}
                        onChange={(e) => setCustomTopperFee(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Labor & Notes */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Labor & Notes</h3>
                <p className="mt-1 text-sm text-gray-600">Estimated time and additional notes.</p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
                      Estimated Hours
                      <span className="text-xs text-gray-500 ml-1">(auto-calculated)</span>
                    </label>
                    <input
                      type="number"
                      name="estimatedHours"
                      id="estimatedHours"
                      required
                      step="0.5"
                      min="0"
                      value={estimatedHours}
                      onChange={(e) => {
                        setEstimatedHours(e.target.value)
                        setHoursManuallySet(true)
                      }}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    {hoursManuallySet && (
                      <button
                        type="button"
                        onClick={() => setHoursManuallySet(false)}
                        className="mt-1 text-xs text-pink-600 hover:text-pink-800"
                      >
                        Reset to auto-calculate
                      </button>
                    )}
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

          <div className="flex justify-end">
            <Link
              href="/"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!customerId}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
