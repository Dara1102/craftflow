'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { updateOrder, deleteOrder } from '@/app/actions/orders'
import { OrderStatus, CakeType, DiscountType } from '@prisma/client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface TierSize {
  id: number
  name: string
  servings: number
  shape?: string
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
  company?: string | null
  email: string | null
  phone: string | null
  address?: string | null
}

interface DecorationTechnique {
  id: number
  name: string
  category: string
  subcategory: string
  defaultCostPerUnit: number
  skillLevel: string
}

interface OrderDecoration {
  id: number
  decorationTechniqueId: number
  quantity: number
  notes: string | null
  decorationTechnique: DecorationTechnique
}

interface FieldOption {
  id: number
  name: string
}

interface FieldOptions {
  occasion: FieldOption[]
  theme: FieldOption[]
  color: FieldOption[]
  cakeSurface: FieldOption[]
  flavor: FieldOption[]
  filling: FieldOption[]
}

interface DeliveryZone {
  id: number
  name: string
  description: string | null
  minDistance: number | null
  maxDistance: number | null
  baseFee: number
  perMileFee: number | null
}

interface Settings {
  LaborRatePerHour: string
  MarkupPercent: string
  [key: string]: string
}

interface TierCost {
  tierSizeId: number
  name: string
  servings: number
  batterCost: number
  frostingCost: number
  totalIngredientCost: number
}

interface LaborRole {
  id: number
  name: string
  hourlyRate: number
}

interface Order {
  id: number
  customerId: number | null
  customerName: string | null
  customer: Customer | null
  eventDate: Date
  cakeType: CakeType | null
  size: string | null
  servingsTarget: number | null
  theme: string | null
  occasion: string | null
  colors: string | null
  isDelivery: boolean
  deliveryZoneId: number | null
  deliveryDistance: number | null
  deliveryContact: string | null
  deliveryPhone: string | null
  deliveryTime: Date | null
  deliveryAddress: string | null
  estimatedHours: number
  bakerHours: number | null
  assistantHours: number | null
  topperType: string | null
  topperText: string | null
  customTopperFee: number | null
  discountType: DiscountType | null
  discountValue: number | null
  discountReason: string | null
  notes: string | null
  status: OrderStatus
  cakeTiers: CakeTier[]
  orderDecorations: OrderDecoration[]
}

interface Props {
  order: Order
  tierSizes: TierSize[]
}

interface CustomerOption {
  id: number
  name: string
  company?: string | null
  email: string | null
  phone: string | null
  address?: string | null
}

interface SelectedDecoration {
  decorationTechniqueId: number
  quantity: number
  notes?: string
}

export default function EditOrderForm({ order, tierSizes }: Props) {
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(
    order.customer || (order.customerName ? { id: 0, name: order.customerName, email: null, phone: null } : null)
  )
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  // Order state - Basic
  const [eventDate, setEventDate] = useState(
    new Date(order.eventDate).toISOString().split('T')[0]
  )
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [notes, setNotes] = useState(order.notes || '')

  // Cake details
  const [cakeType, setCakeType] = useState<CakeType | ''>(order.cakeType || '')
  const [size, setSize] = useState(order.size || '')

  // Event details
  const [theme, setTheme] = useState(order.theme || '')
  const [occasion, setOccasion] = useState(order.occasion || '')
  const [colors, setColors] = useState(order.colors || '')
  const [showColorDropdown, setShowColorDropdown] = useState(false)

  // Delivery details
  const [isDelivery, setIsDelivery] = useState(order.isDelivery)
  const [deliveryZoneId, setDeliveryZoneId] = useState<number | null>(order.deliveryZoneId)
  const [deliveryDistance, setDeliveryDistance] = useState(order.deliveryDistance?.toString() || '')
  const [deliveryContact, setDeliveryContact] = useState(order.deliveryContact || '')
  const [deliveryPhone, setDeliveryPhone] = useState(order.deliveryPhone || '')
  const [deliveryTime, setDeliveryTime] = useState(
    order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : ''
  )
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '')

  // Labor
  const [estimatedHours, setEstimatedHours] = useState(order.estimatedHours.toString())
  const [bakerHours, setBakerHours] = useState(order.bakerHours?.toString() || '')
  const [assistantHours, setAssistantHours] = useState(order.assistantHours?.toString() || '')
  const [hoursManuallySet, setHoursManuallySet] = useState(true) // Start true for edit mode

  // Tiers
  const [tiers, setTiers] = useState(
    order.cakeTiers.map(tier => ({
      tierSizeId: tier.tierSizeId,
      flavor: tier.flavor,
      filling: tier.filling,
      finishType: tier.finishType
    }))
  )

  // Decorations
  const [selectedDecorations, setSelectedDecorations] = useState<SelectedDecoration[]>(
    order.orderDecorations.map(dec => ({
      decorationTechniqueId: dec.decorationTechniqueId,
      quantity: dec.quantity,
      notes: dec.notes || undefined
    }))
  )
  const [decorationSearch, setDecorationSearch] = useState('')

  // Topper
  const [topperType, setTopperType] = useState(order.topperType || '')
  const [topperText, setTopperText] = useState(order.topperText || '')
  const [customTopperFee, setCustomTopperFee] = useState(
    order.customTopperFee ? order.customTopperFee.toString() : ''
  )

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType | ''>(order.discountType || '')
  const [discountValue, setDiscountValue] = useState(
    order.discountValue ? order.discountValue.toString() : ''
  )
  const [discountReason, setDiscountReason] = useState(order.discountReason || '')

  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch field options, decorations list, and delivery zones
  const { data: fieldOptions } = useSWR<FieldOptions>('/api/field-options', fetcher)
  const { data: decorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)
  const { data: deliveryZones } = useSWR<DeliveryZone[]>('/api/delivery-zones', fetcher)
  const { data: settings } = useSWR<Settings>('/api/settings', fetcher)
  const { data: tierCosts } = useSWR<TierCost[]>('/api/tier-costs', fetcher)
  const { data: laborRoles } = useSWR<LaborRole[]>('/api/labor-roles', fetcher)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setShowColorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Customer search
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
      let hours = 0
      validTiers.forEach(tier => {
        const tierSize = tierSizes.find(ts => ts.id === tier.tierSizeId)
        if (tierSize) {
          hours += tierSize.servings / 10
          if (tier.finishType.toLowerCase().includes('fondant')) {
            hours += 2
          } else if (tier.finishType.toLowerCase().includes('buttercream')) {
            hours += 1
          }
        }
      })
      hours = Math.max(2, Math.round(hours * 2) / 2)
      setEstimatedHours(hours.toString())
    }
  }, [tiers, tierSizes, hoursManuallySet])

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
      return
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

    if (!selectedCustomer || selectedCustomer.id === 0) {
      alert('Please select a customer')
      return
    }

    const validTiers = tiers.filter(t => t.tierSizeId > 0 && t.flavor && t.filling && t.finishType)
    if (validTiers.length === 0) {
      alert('Please add at least one complete tier')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await updateOrder(order.id, {
        customerId: selectedCustomer.id,
        eventDate,
        cakeType: cakeType || undefined,
        size,
        theme: theme || undefined,
        occasion: occasion || undefined,
        colors: colors || undefined,
        isDelivery,
        deliveryZoneId: isDelivery ? deliveryZoneId : null,
        deliveryDistance: isDelivery && deliveryDistance ? parseFloat(deliveryDistance) : null,
        deliveryContact: isDelivery ? deliveryContact : undefined,
        deliveryPhone: isDelivery ? deliveryPhone : undefined,
        deliveryTime: isDelivery && deliveryTime ? deliveryTime : undefined,
        deliveryAddress: isDelivery ? deliveryAddress : undefined,
        estimatedHours: parseFloat(estimatedHours),
        bakerHours: bakerHours ? parseFloat(bakerHours) : undefined,
        assistantHours: assistantHours ? parseFloat(assistantHours) : undefined,
        topperType: topperType || undefined,
        topperText: topperText || undefined,
        customTopperFee: customTopperFee ? parseFloat(customTopperFee) : undefined,
        discountType: discountType || undefined,
        discountValue: discountValue ? parseFloat(discountValue) : undefined,
        discountReason: discountReason || undefined,
        notes,
        status,
        tiers: validTiers.map(t => ({
          ...t,
          tierSizeId: parseInt(t.tierSizeId.toString())
        })),
        decorations: selectedDecorations
      })
      setSaveMessage('Order saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage('Failed to save order. Please try again.')
    } finally {
      setIsSaving(false)
    }
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

  // Generate cake description summary
  const getCakeDescription = () => {
    const validTiers = tiers.filter(t => t.tierSizeId > 0)
    if (validTiers.length === 0) return ''

    const parts: string[] = []

    if (validTiers.length > 1) {
      parts.push(`${validTiers.length}-tier`)
    }

    const mainFlavor = validTiers[0]?.flavor
    if (mainFlavor) {
      parts.push(mainFlavor.toLowerCase())
    }

    parts.push('cake')

    const mainFinish = validTiers[0]?.finishType
    if (mainFinish) {
      parts.push(`with ${mainFinish.toLowerCase()} finish`)
    }

    if (selectedDecorations.length > 0) {
      const decNames = selectedDecorations
        .map(sd => decorations?.find(d => d.id === sd.decorationTechniqueId)?.name)
        .filter(Boolean)
        .slice(0, 2)
      if (decNames.length > 0) {
        parts.push(`+ ${decNames.join(', ')}`)
        if (selectedDecorations.length > 2) {
          parts.push(`+${selectedDecorations.length - 2} more`)
        }
      }
    }

    return parts.join(' ')
  }

  // Calculate price estimate (matches lib/costing.ts formula)
  const calculateEstimate = () => {
    // Get settings values (same defaults as lib/costing.ts)
    const hourlyRate = settings ? parseFloat(settings.LaborRatePerHour) : 20
    const markupPercent = settings ? parseFloat(settings.MarkupPercent) : 0.7

    // Calculate tier ingredient costs
    let ingredientCost = 0
    const tierCount = tiers.filter(t => t.tierSizeId > 0).length
    tiers.forEach(tier => {
      if (tier.tierSizeId > 0) {
        const tierCost = tierCosts?.find(tc => tc.tierSizeId === tier.tierSizeId)
        if (tierCost) {
          ingredientCost += tierCost.totalIngredientCost
        }
      }
    })

    // Calculate decoration costs
    let decorationMaterialCost = 0
    selectedDecorations.forEach(sd => {
      const dec = decorations?.find(d => d.id === sd.decorationTechniqueId)
      if (dec) {
        // Multiply by tier count for TIER-based decorations (simplified - full logic in costing.ts)
        decorationMaterialCost += dec.defaultCostPerUnit * sd.quantity
      }
    })

    // Calculate topper cost (same logic as lib/costing.ts)
    let topperCost = 0
    const standardTopperCost = 5 // Base cost for standard toppers
    if (topperType === 'custom' && customTopperFee) {
      topperCost = parseFloat(customTopperFee)
    } else if (topperType && topperType !== 'none' && topperType !== '') {
      topperCost = standardTopperCost
    }

    // Calculate labor cost
    const hours = parseFloat(estimatedHours) || 0
    const laborCost = hours * hourlyRate

    // Calculate delivery cost (not marked up - pass-through cost)
    let deliveryFee = 0
    if (isDelivery && deliveryZoneId) {
      const zone = deliveryZones?.find(z => z.id === deliveryZoneId)
      if (zone) {
        deliveryFee = zone.baseFee
        if (zone.perMileFee && deliveryDistance) {
          deliveryFee += zone.perMileFee * (parseFloat(deliveryDistance) || 0)
        }
      }
    }

    // Calculate suggested price using same formula as costing report:
    // (ingredientCost + decorationMaterialCost + topperCost + laborCost) * (1 + markupPercent) + deliveryFee
    const totalCostBeforeMarkup = ingredientCost + decorationMaterialCost + topperCost + laborCost
    const suggestedPrice = totalCostBeforeMarkup * (1 + markupPercent)

    // Calculate discount
    let discountAmount = 0
    if (discountType && discountValue) {
      const discountVal = parseFloat(discountValue)
      if (discountType === 'PERCENT') {
        discountAmount = suggestedPrice * (discountVal / 100)
      } else {
        discountAmount = discountVal
      }
    }

    // Final price = suggested price - discount + delivery (delivery not discounted)
    const finalPrice = suggestedPrice - discountAmount + deliveryFee

    return {
      ingredientCost,
      decorationMaterialCost,
      topperCost,
      laborCost,
      laborMinutes: hours * 60,
      hourlyRate,
      markupPercent,
      suggestedPrice,
      discountAmount,
      deliveryFee,
      totalCostBeforeMarkup,
      total: finalPrice
    }
  }

  const estimate = calculateEstimate()
  const cakeDescription = getCakeDescription()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Customer</h3>
            <p className="mt-1 text-sm text-gray-600">Customer for this order.</p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
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
              <div className="relative" ref={dropdownRef}>
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
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Order Details</h3>
            <p className="mt-1 text-sm text-gray-600">Date, occasion, theme, and colors.</p>
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
                  {fieldOptions?.occasion?.map(opt => (
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
                  {fieldOptions?.theme?.map(opt => (
                    <option key={opt.id} value={opt.name}>{opt.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3" ref={colorDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colors
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowColorDropdown(!showColorDropdown)}
                    className="min-h-[38px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  >
                    {colors ? (
                      <div className="flex flex-wrap gap-1">
                        {colors.split(',').map(c => c.trim()).filter(Boolean).map((colorName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                          >
                            {colorName}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const selectedColors = colors.split(',').map(c => c.trim()).filter(Boolean)
                                setColors(selectedColors.filter(c => c !== colorName).join(', '))
                              }}
                              className="ml-1 text-pink-600 hover:text-pink-800"
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Click to select colors...</span>
                    )}
                  </div>

                  {showColorDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {fieldOptions?.color?.map(colorOpt => {
                        const selectedColors = colors.split(',').map(c => c.trim()).filter(Boolean)
                        const isSelected = selectedColors.includes(colorOpt.name)
                        return (
                          <button
                            key={colorOpt.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setColors(selectedColors.filter(c => c !== colorOpt.name).join(', '))
                              } else {
                                setColors([...selectedColors, colorOpt.name].join(', '))
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-pink-50 flex items-center justify-between ${
                              isSelected ? 'bg-pink-50 text-pink-700' : 'text-gray-700'
                            }`}
                          >
                            <span>{colorOpt.name}</span>
                            {isSelected && (
                              <svg className="h-4 w-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                  <option value={OrderStatus.DRAFT}>Quote</option>
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
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="deliveryZone" className="block text-sm font-medium text-gray-700">
                      Delivery Zone
                    </label>
                    <select
                      id="deliveryZone"
                      name="deliveryZone"
                      value={deliveryZoneId || ''}
                      onChange={(e) => setDeliveryZoneId(e.target.value ? parseInt(e.target.value) : null)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select delivery zone...</option>
                      {deliveryZones?.map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} - ${zone.baseFee.toFixed(2)}
                          {zone.perMileFee ? ` + $${zone.perMileFee.toFixed(2)}/mi` : ''}
                        </option>
                      ))}
                    </select>
                    {(!deliveryZones || deliveryZones.length === 0) && (
                      <p className="mt-1 text-sm text-gray-500">
                        No delivery zones configured.{' '}
                        <a href="/admin/delivery-zones" target="_blank" className="text-pink-600 hover:text-pink-800">
                          Add zones in Admin
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label htmlFor="deliveryDistance" className="block text-sm font-medium text-gray-700">
                      Distance (miles)
                    </label>
                    <input
                      type="number"
                      name="deliveryDistance"
                      id="deliveryDistance"
                      step="0.1"
                      min="0"
                      value={deliveryDistance}
                      onChange={(e) => setDeliveryDistance(e.target.value)}
                      placeholder="e.g., 8.5"
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    {deliveryZoneId && deliveryDistance && (() => {
                      const zone = deliveryZones?.find(z => z.id === deliveryZoneId)
                      if (zone?.perMileFee) {
                        const dist = parseFloat(deliveryDistance) || 0
                        const totalFee = zone.baseFee + (zone.perMileFee * dist)
                        return (
                          <p className="mt-1 text-xs text-gray-500">
                            Est. fee: ${totalFee.toFixed(2)}
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>

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
                    <select
                      value={tier.flavor}
                      onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      required
                    >
                      <option value="">Select flavor...</option>
                      {fieldOptions?.flavor?.map(opt => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Filling</label>
                    <select
                      value={tier.filling}
                      onChange={(e) => updateTier(index, 'filling', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      required
                    >
                      <option value="">Select filling...</option>
                      {fieldOptions?.filling?.map(opt => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
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
                      {fieldOptions?.cakeSurface?.map(opt => (
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
              Add decorations to your order.
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
                      return sum + ((dec?.defaultCostPerUnit || 0) * sd.quantity)
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

      {/* Discount Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Discount</h3>
            <p className="mt-1 text-sm text-gray-600">Apply a discount for this customer.</p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="discountType" className="block text-sm font-medium text-gray-700">
                  Discount Type
                </label>
                <select
                  id="discountType"
                  name="discountType"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                >
                  <option value="">No Discount</option>
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount ($)</option>
                </select>
              </div>

              {discountType && (
                <div className="col-span-6 sm:col-span-2">
                  <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700">
                    {discountType === 'PERCENT' ? 'Discount (%)' : 'Discount ($)'}
                  </label>
                  <input
                    type="number"
                    id="discountValue"
                    name="discountValue"
                    step={discountType === 'PERCENT' ? '1' : '0.01'}
                    min="0"
                    max={discountType === 'PERCENT' ? '100' : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'PERCENT' ? 'e.g., 10' : 'e.g., 50.00'}
                    className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              )}

              {discountType && (
                <div className="col-span-6 sm:col-span-2">
                  <label htmlFor="discountReason" className="block text-sm font-medium text-gray-700">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    id="discountReason"
                    name="discountReason"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g., Repeat customer"
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
            <p className="mt-1 text-sm text-gray-600">Estimated time by role and additional notes.</p>
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Break down labor by role for accurate costing. Decoration labor is calculated automatically from techniques.
              </p>
            </div>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Role-based hours */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="bakerHours" className="block text-sm font-medium text-gray-700">
                  Baker Hours
                  <span className="text-xs text-gray-500 ml-1">
                    (${laborRoles?.find(r => r.name === 'Baker')?.hourlyRate || 21}/hr)
                  </span>
                </label>
                <input
                  type="number"
                  name="bakerHours"
                  id="bakerHours"
                  step="0.5"
                  min="0"
                  value={bakerHours}
                  onChange={(e) => setBakerHours(e.target.value)}
                  placeholder="0"
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">Baking, assembly, frosting</p>
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="assistantHours" className="block text-sm font-medium text-gray-700">
                  Assistant Hours
                  <span className="text-xs text-gray-500 ml-1">
                    (${laborRoles?.find(r => r.name === 'Bakery Assistant')?.hourlyRate || 18}/hr)
                  </span>
                </label>
                <input
                  type="number"
                  name="assistantHours"
                  id="assistantHours"
                  step="0.5"
                  min="0"
                  value={assistantHours}
                  onChange={(e) => setAssistantHours(e.target.value)}
                  placeholder="0"
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">Packaging, stacking, simple tasks</p>
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
                  Total Est. Hours
                  <span className="text-xs text-gray-500 ml-1">(legacy)</span>
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
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <strong>Note:</strong> Decorator labor is calculated from decoration techniques. If Baker/Assistant hours are set, they are used instead of the legacy Total Est. Hours field.
                </p>
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

      {/* Order Summary & Estimate */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 shadow px-4 py-5 sm:rounded-lg sm:p-6 border-2 border-pink-200">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Order Summary</h3>
            <p className="mt-1 text-sm text-gray-600">Review your order and estimate.</p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            {/* Cake Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cake Description</label>
              <p className="text-lg font-medium text-gray-900 capitalize">
                {cakeDescription || <span className="text-gray-400 italic">Add tiers to see description...</span>}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-pink-600">{totalServings}</p>
                <p className="text-xs text-gray-500">Servings</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-pink-600">{tiers.filter(t => t.tierSizeId > 0).length}</p>
                <p className="text-xs text-gray-500">Tier{tiers.filter(t => t.tierSizeId > 0).length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-pink-600">{estimatedHours}h</p>
                <p className="text-xs text-gray-500">Est. Labor</p>
              </div>
            </div>

            {/* Costing Breakdown */}
            <div className="bg-white rounded-lg p-4 border border-pink-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Costing Breakdown</h4>
              <div className="space-y-2 text-sm">
                {/* Costs Section */}
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Costs</div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tier Ingredients (batter/frosting)</span>
                  <span className="text-gray-900">${estimate.ingredientCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Decoration Materials</span>
                  <span className="text-gray-900">${estimate.decorationMaterialCost.toFixed(2)}</span>
                </div>
                {estimate.topperCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Topper</span>
                    <span className="text-gray-900">${estimate.topperCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor ({estimatedHours}h @ ${estimate.hourlyRate}/hr)</span>
                  <span className="text-gray-900">${estimate.laborCost.toFixed(2)}</span>
                </div>

                {/* Subtotal */}
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Subtotal (cost)</span>
                    <span className="text-gray-900">${estimate.totalCostBeforeMarkup.toFixed(2)}</span>
                  </div>
                </div>

                {/* Markup */}
                <div className="flex justify-between text-gray-500">
                  <span>Markup ({(estimate.markupPercent * 100).toFixed(0)}%)</span>
                  <span>+${(estimate.totalCostBeforeMarkup * estimate.markupPercent).toFixed(2)}</span>
                </div>

                {/* Suggested Price (before discount) */}
                <div className="flex justify-between font-medium">
                  <span className="text-gray-700">Suggested Price</span>
                  <span className="text-gray-900">${estimate.suggestedPrice.toFixed(2)}</span>
                </div>

                {/* Discount */}
                {estimate.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount
                      {discountType === 'PERCENT' && ` (${discountValue}%)`}
                      {discountReason && <span className="text-xs text-gray-500 ml-1">- {discountReason}</span>}
                    </span>
                    <span>-${estimate.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Delivery (pass-through, not marked up or discounted) */}
                {estimate.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Delivery
                      {deliveryDistance && ` (${deliveryDistance} mi)`}
                    </span>
                    <span className="text-gray-900">+${estimate.deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                {/* Final Price */}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Final Price</span>
                    <span className="text-pink-600">${estimate.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`rounded-md p-4 ${
          saveMessage.includes('success') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            {saveMessage.includes('success') ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`ml-3 text-sm font-medium ${
              saveMessage.includes('success') ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveMessage}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Order'}
        </button>
        <div className="flex gap-3">
          <Link
            href="/"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
