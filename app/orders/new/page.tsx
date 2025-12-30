'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { OrderStatus, CakeType, DiscountType } from '@prisma/client'
import useSWR from 'swr'
import ProductSelector from '@/app/components/ProductSelector'

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

interface DeliveryZone {
  id: number
  name: string
  description: string | null
  minDistance: number | null
  maxDistance: number | null
  baseFee: number
  perMileFee: number | null
}

interface DeliveryStartPoint {
  id: number
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  isDefault: boolean
}

interface PlaceResult {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface Settings {
  LaborRatePerHour: string
  MarkupPercent: string
  [key: string]: string
}

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string | null
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
  const [isRush, setIsRush] = useState(false)
  const [rushSkipBatchTypes, setRushSkipBatchTypes] = useState<string[]>([])

  // Batch types that can be skipped for rush orders
  const batchTypeOptions = [
    { code: 'BAKE', name: 'Bake', description: 'Skip if using stock cake layers' },
    { code: 'PREP', name: 'Prep (Frosting)', description: 'Skip if using stock frosting' },
    { code: 'STACK', name: 'Stack & Fill', description: 'Skip if using pre-stacked cakes' },
    { code: 'ASSEMBLE', name: 'Assemble', description: 'Skip if cake is pre-assembled' },
    { code: 'DECORATE', name: 'Decorate', description: 'Skip if minimal decoration needed' },
  ]

  // Calculate if order qualifies as rush (event date is today or tomorrow)
  const isRushEligible = (() => {
    if (!eventDate) return false
    const event = new Date(eventDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    return event >= today && event < dayAfterTomorrow
  })()

  // Toggle a batch type in the skip list
  const toggleSkipBatchType = (code: string) => {
    setRushSkipBatchTypes(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  // Cake details
  const [cakeType, setCakeType] = useState<CakeType | ''>('')
  const [size, setSize] = useState('')
  const [desiredServings, setDesiredServings] = useState('')

  // Event details
  const [theme, setTheme] = useState('')
  const [occasion, setOccasion] = useState('')
  const [colors, setColors] = useState('')
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [accentColors, setAccentColors] = useState('')
  const [showAccentColorDropdown, setShowAccentColorDropdown] = useState(false)

  // Delivery details
  const [isDelivery, setIsDelivery] = useState(false)
  const [deliveryZoneId, setDeliveryZoneId] = useState<number | null>(null)
  const [deliveryDistance, setDeliveryDistance] = useState('')
  const [deliveryStartPointId, setDeliveryStartPointId] = useState<number | null>(null)
  const [deliveryContact, setDeliveryContact] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<PlaceResult[]>([])
  const [showVenueDropdown, setShowVenueDropdown] = useState(false)
  const [selectedVenueCoords, setSelectedVenueCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Labor (auto-calculated but editable)
  const [estimatedHours, setEstimatedHours] = useState('0')
  const [hoursManuallySet, setHoursManuallySet] = useState(false)

  // Tiers
  const [tiers, setTiers] = useState([
    { tierSizeId: 0, batterRecipeId: null as number | null, fillingRecipeId: null as number | null, frostingRecipeId: null as number | null, flavor: '', filling: '', finishType: '', frostingComplexity: 2 }
  ])

  // Decorations
  const [selectedDecorations, setSelectedDecorations] = useState<SelectedDecoration[]>([])
  const [decorationSearch, setDecorationSearch] = useState('')

  // Products (menu items like cupcakes, cake pops)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    menuItemId: number
    quantity: number
    packagingId?: number
    packagingQty?: number
    notes?: string
  }>>([])

  // Topper
  const [topperType, setTopperType] = useState('')
  const [topperText, setTopperText] = useState('')
  const [customTopperFee, setCustomTopperFee] = useState('')

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType | ''>('')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const accentColorDropdownRef = useRef<HTMLDivElement>(null)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  const { data: tierSizes } = useSWR<TierSize[]>('/api/tier-sizes', fetcher)
  const { data: customers, mutate: mutateCustomers } = useSWR(
    customerSearch.length >= 2 ? `/api/customers?search=${encodeURIComponent(customerSearch)}` : null,
    fetcher
  )
  const { data: fieldOptions } = useSWR<FieldOptions>('/api/field-options', fetcher)
  const { data: decorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)
  const { data: deliveryZones } = useSWR<DeliveryZone[]>('/api/delivery-zones', fetcher)
  const { data: deliveryStartPoints } = useSWR<DeliveryStartPoint[]>('/api/delivery-start-points', fetcher)
  const { data: settings } = useSWR<Settings>('/api/settings', fetcher)
  const { data: batterRecipes } = useSWR<Recipe[]>('/api/recipes?type=BATTER', fetcher)
  const { data: fillingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FILLING', fetcher)
  const { data: frostingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FROSTING', fetcher)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setShowColorDropdown(false)
      }
      if (accentColorDropdownRef.current && !accentColorDropdownRef.current.contains(event.target as Node)) {
        setShowAccentColorDropdown(false)
      }
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target as Node)) {
        setShowVenueDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Set default start point when loaded
  useEffect(() => {
    if (deliveryStartPoints && deliveryStartPoints.length > 0 && !deliveryStartPointId) {
      const defaultPoint = deliveryStartPoints.find(sp => sp.isDefault) || deliveryStartPoints[0]
      setDeliveryStartPointId(defaultPoint.id)
    }
  }, [deliveryStartPoints, deliveryStartPointId])

  // Venue search
  useEffect(() => {
    if (venueSearch.length < 3) {
      setVenueResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?query=${encodeURIComponent(venueSearch)}`)
        if (res.ok) {
          const data = await res.json()
          setVenueResults(data)
          setShowVenueDropdown(true)
        }
      } catch (error) {
        console.error('Failed to search venues:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [venueSearch])

  // Calculate distance when venue is selected
  const calculateDeliveryDistance = async (destLat: number, destLng: number) => {
    const startPoint = deliveryStartPoints?.find(sp => sp.id === deliveryStartPointId)
    if (!startPoint?.latitude || !startPoint?.longitude) {
      console.warn('No start point coordinates available')
      return
    }

    setIsCalculatingDistance(true)
    try {
      const res = await fetch(
        `/api/places/distance?originLat=${startPoint.latitude}&originLng=${startPoint.longitude}&destLat=${destLat}&destLng=${destLng}`
      )
      if (res.ok) {
        const data = await res.json()
        setDeliveryDistance(data.distanceMiles.toString())
      }
    } catch (error) {
      console.error('Failed to calculate distance:', error)
    } finally {
      setIsCalculatingDistance(false)
    }
  }

  const handleVenueSelect = async (place: PlaceResult) => {
    setVenueSearch(place.mainText)
    setShowVenueDropdown(false)

    try {
      const res = await fetch(`/api/places/details?placeId=${place.placeId}`)
      if (res.ok) {
        const data = await res.json()
        setDeliveryAddress(data.address)
        if (data.latitude && data.longitude) {
          setSelectedVenueCoords({ lat: data.latitude, lng: data.longitude })
          await calculateDeliveryDistance(data.latitude, data.longitude)
        }
      }
    } catch (error) {
      console.error('Failed to get place details:', error)
      setDeliveryAddress(place.description)
    }
  }

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
    setTiers([...tiers, { tierSizeId: 0, batterRecipeId: null, fillingRecipeId: null, frostingRecipeId: null, flavor: '', filling: '', finishType: '', frostingComplexity: 2 }])
  }

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: string, value: string | number | null) => {
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

    // Valid tiers have either recipe IDs or legacy fields filled
    const validTiers = tiers.filter(t =>
      t.tierSizeId > 0 &&
      (t.batterRecipeId || t.flavor) &&
      (t.fillingRecipeId || t.filling) &&
      (t.frostingRecipeId || t.finishType)
    )

    // Require at least a tier or a product
    if (validTiers.length === 0 && selectedProducts.length === 0) {
      alert('Please add at least one tier or product to the order')
      return
    }

    await createOrder({
      customerId,
      eventDate,
      cakeType: cakeType || undefined,
      size,
      desiredServings: desiredServings ? parseInt(desiredServings) : undefined,
      theme: theme || undefined,
      occasion: occasion || undefined,
      colors: colors || undefined,
      accentColors: accentColors || undefined,
      isDelivery,
      deliveryZoneId: isDelivery ? deliveryZoneId : null,
      deliveryDistance: isDelivery && deliveryDistance ? parseFloat(deliveryDistance) : null,
      deliveryContact: isDelivery ? deliveryContact : undefined,
      deliveryPhone: isDelivery ? deliveryPhone : undefined,
      deliveryTime: isDelivery && deliveryTime ? deliveryTime : undefined,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      estimatedHours: parseFloat(estimatedHours),
      topperType: topperType || undefined,
      topperText: topperText || undefined,
      customTopperFee: customTopperFee ? parseFloat(customTopperFee) : undefined,
      discountType: discountType || undefined,
      discountValue: discountValue ? parseFloat(discountValue) : undefined,
      discountReason: discountReason || undefined,
      notes,
      status,
      isRush,
      rushSkipBatchTypes: isRush && rushSkipBatchTypes.length > 0 ? rushSkipBatchTypes : undefined,
      tiers: validTiers.map(t => ({
        tierSizeId: parseInt(t.tierSizeId.toString()),
        batterRecipeId: t.batterRecipeId || null,
        fillingRecipeId: t.fillingRecipeId || null,
        frostingRecipeId: t.frostingRecipeId || null,
        flavor: t.flavor || null,
        filling: t.filling || null,
        finishType: t.finishType || null,
        frostingComplexity: t.frostingComplexity || 2
      })),
      decorations: selectedDecorations,
      products: selectedProducts.map(p => ({
        menuItemId: p.menuItemId,
        quantity: p.quantity,
        packagingId: p.packagingId || null,
        packagingQty: p.packagingQty || null,
        notes: p.notes || null
      }))
    })
  }

  const totalServings = tiers.reduce((sum, tier) => {
    const tierSize = tierSizes?.find((ts) => ts.id === parseInt(tier.tierSizeId.toString()))
    return sum + (tierSize?.servings || 0)
  }, 0)

  // Generate cake description summary
  const getCakeDescription = () => {
    const validTiers = tiers.filter(t => t.tierSizeId > 0)
    if (validTiers.length === 0) return ''

    const parts: string[] = []

    // Tier count
    if (validTiers.length > 1) {
      parts.push(`${validTiers.length}-tier`)
    }

    // First tier flavor (assuming main flavor)
    const mainFlavor = validTiers[0]?.flavor
    if (mainFlavor) {
      parts.push(mainFlavor.toLowerCase())
    }

    parts.push('cake')

    // Finish type
    const mainFinish = validTiers[0]?.finishType
    if (mainFinish) {
      parts.push(`with ${mainFinish.toLowerCase()} finish`)
    }

    // Decorations summary
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

  // Calculate price estimate
  const calculateEstimate = () => {
    let materialsCost = 0
    let laborMinutes = 0

    // Get settings values (same defaults as lib/costing.ts)
    const hourlyRate = settings ? parseFloat(settings.LaborRatePerHour) : 20
    const markupPercent = settings ? parseFloat(settings.MarkupPercent) : 0.7

    // Decoration costs
    selectedDecorations.forEach(sd => {
      const dec = decorations?.find(d => d.id === sd.decorationTechniqueId)
      if (dec) {
        materialsCost += parseFloat(dec.defaultCostPerUnit) * sd.quantity
      }
    })

    // Custom topper fee
    if (customTopperFee) {
      materialsCost += parseFloat(customTopperFee)
    }

    // Labor hours (from estimate)
    const hours = parseFloat(estimatedHours) || 0
    laborMinutes = hours * 60

    // Labor cost using settings rate
    const laborCost = hours * hourlyRate

    // Calculate suggested price using same formula as costing report:
    // (materialsCost + laborCost) * (1 + markupPercent)
    const totalCost = materialsCost + laborCost
    const suggestedPrice = totalCost * (1 + markupPercent)

    return {
      materialsCost,
      laborCost,
      laborMinutes,
      hourlyRate,
      markupPercent,
      total: suggestedPrice
    }
  }

  const estimate = calculateEstimate()
  const cakeDescription = getCakeDescription()

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

                  {/* Rush Order Banner */}
                  {isRushEligible && (
                    <div className="col-span-6">
                      <div className={`rounded-lg p-4 ${isRush ? 'bg-red-50 border-2 border-red-300' : 'bg-yellow-50 border border-yellow-300'}`}>
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className={`h-6 w-6 ${isRush ? 'text-red-500' : 'text-yellow-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className={`text-sm font-semibold ${isRush ? 'text-red-800' : 'text-yellow-800'}`}>
                              {isRush ? 'Rush Order Enabled' : 'Short Lead Time Detected'}
                            </h3>
                            <p className={`mt-1 text-sm ${isRush ? 'text-red-700' : 'text-yellow-700'}`}>
                              {isRush
                                ? 'Select which production steps to skip (use stock inventory for those steps).'
                                : 'Event date is today or tomorrow. Enable Rush Order to customize production steps.'}
                            </p>
                            <div className="mt-3">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isRush}
                                  onChange={(e) => {
                                    setIsRush(e.target.checked)
                                    if (!e.target.checked) {
                                      setRushSkipBatchTypes([])
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                <span className={`ml-3 text-sm font-medium ${isRush ? 'text-red-700' : 'text-gray-700'}`}>
                                  Rush Order
                                </span>
                              </label>
                            </div>

                            {/* Batch step selection when rush is enabled */}
                            {isRush && (
                              <div className="mt-4 pt-4 border-t border-red-200">
                                <p className="text-sm font-medium text-red-800 mb-3">
                                  Select steps to SKIP (will use stock instead):
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {batchTypeOptions.map(opt => (
                                    <label
                                      key={opt.code}
                                      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        rushSkipBatchTypes.includes(opt.code)
                                          ? 'bg-red-100 border-red-400'
                                          : 'bg-white border-gray-200 hover:border-red-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={rushSkipBatchTypes.includes(opt.code)}
                                        onChange={() => toggleSkipBatchType(opt.code)}
                                        className="mt-0.5 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                      />
                                      <div className="ml-2">
                                        <span className={`text-sm font-medium ${
                                          rushSkipBatchTypes.includes(opt.code) ? 'text-red-800' : 'text-gray-700'
                                        }`}>
                                          {opt.name}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                {rushSkipBatchTypes.length === 0 && (
                                  <p className="mt-3 text-xs text-red-600">
                                    No steps selected to skip. Order will go through normal batching for all steps.
                                  </p>
                                )}
                                {rushSkipBatchTypes.length > 0 && (
                                  <p className="mt-3 text-xs text-red-700 font-medium">
                                    Skipping: {rushSkipBatchTypes.join(', ')} — will use stock inventory
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="desiredServings" className="block text-sm font-medium text-gray-700">
                      Desired Servings
                    </label>
                    <input
                      type="number"
                      name="desiredServings"
                      id="desiredServings"
                      min="1"
                      value={desiredServings}
                      onChange={(e) => setDesiredServings(e.target.value)}
                      placeholder="e.g., 50"
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    <p className="mt-1 text-xs text-gray-500">Target number of servings for this order</p>
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
                      {/* Selected colors display */}
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

                      {/* Color dropdown */}
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

                  <div className="col-span-6 sm:col-span-3" ref={accentColorDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accent Colors
                    </label>
                    <div className="relative">
                      {/* Selected accent colors display */}
                      <div
                        onClick={() => setShowAccentColorDropdown(!showAccentColorDropdown)}
                        className="min-h-[38px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                      >
                        {accentColors ? (
                          <div className="flex flex-wrap gap-1">
                            {accentColors.split(',').map(c => c.trim()).filter(Boolean).map((colorName, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {colorName}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const selectedAccentColors = accentColors.split(',').map(c => c.trim()).filter(Boolean)
                                    setAccentColors(selectedAccentColors.filter(c => c !== colorName).join(', '))
                                  }}
                                  className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Click to select accent colors...</span>
                        )}
                      </div>

                      {/* Accent Color dropdown */}
                      {showAccentColorDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                          {fieldOptions?.color?.map(colorOpt => {
                            const selectedAccentColors = accentColors.split(',').map(c => c.trim()).filter(Boolean)
                            const isSelected = selectedAccentColors.includes(colorOpt.name)
                            return (
                              <button
                                key={colorOpt.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setAccentColors(selectedAccentColors.filter(c => c !== colorOpt.name).join(', '))
                                  } else {
                                    setAccentColors([...selectedAccentColors, colorOpt.name].join(', '))
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex items-center justify-between ${
                                  isSelected ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                                }`}
                              >
                                <span>{colorOpt.name}</span>
                                {isSelected && (
                                  <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
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
                      {/* Delivery Zone */}
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="deliveryZoneId" className="block text-sm font-medium text-gray-700">
                          Delivery Zone
                        </label>
                        <select
                          id="deliveryZoneId"
                          value={deliveryZoneId || ''}
                          onChange={(e) => setDeliveryZoneId(e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">Select zone...</option>
                          {deliveryZones?.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name} - ${zone.baseFee.toFixed(2)}
                              {zone.perMileFee ? ` + $${zone.perMileFee.toFixed(2)}/mi` : ''}
                            </option>
                          ))}
                        </select>
                        {deliveryZoneId && deliveryZones && (
                          <p className="mt-1 text-xs text-gray-500">
                            {deliveryZones.find(z => z.id === deliveryZoneId)?.description}
                          </p>
                        )}
                      </div>

                      {/* Start Point */}
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="deliveryStartPointId" className="block text-sm font-medium text-gray-700">
                          Starting From
                        </label>
                        <select
                          id="deliveryStartPointId"
                          value={deliveryStartPointId || ''}
                          onChange={(e) => {
                            setDeliveryStartPointId(e.target.value ? parseInt(e.target.value) : null)
                            // Recalculate distance if we have venue coords
                            if (selectedVenueCoords && e.target.value) {
                              const newStartPoint = deliveryStartPoints?.find(sp => sp.id === parseInt(e.target.value))
                              if (newStartPoint?.latitude && newStartPoint?.longitude) {
                                calculateDeliveryDistance(selectedVenueCoords.lat, selectedVenueCoords.lng)
                              }
                            }
                          }}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">Select start point...</option>
                          {deliveryStartPoints?.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name} {sp.isDefault ? '(Default)' : ''}
                            </option>
                          ))}
                        </select>
                        {deliveryStartPointId && deliveryStartPoints && (
                          <p className="mt-1 text-xs text-gray-500">
                            {deliveryStartPoints.find(sp => sp.id === deliveryStartPointId)?.address}
                          </p>
                        )}
                      </div>

                      {/* Venue Search */}
                      <div className="col-span-6" ref={venueDropdownRef}>
                        <label htmlFor="venueSearch" className="block text-sm font-medium text-gray-700">
                          Search Venue/Location
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            id="venueSearch"
                            value={venueSearch}
                            onChange={(e) => setVenueSearch(e.target.value)}
                            placeholder="Search for venue, restaurant, address..."
                            className="focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                          {showVenueDropdown && venueResults.length > 0 && (
                            <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                              {venueResults.map((place) => (
                                <li
                                  key={place.placeId}
                                  onClick={() => handleVenueSelect(place)}
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-pink-50"
                                >
                                  <div className="font-medium text-gray-900">{place.mainText}</div>
                                  <div className="text-gray-500 text-xs">{place.secondaryText}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Type a venue name to auto-fill address and calculate distance
                        </p>
                      </div>

                      {/* Delivery Address */}
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
                          placeholder="Full delivery address"
                        />
                      </div>

                      {/* Distance */}
                      <div className="col-span-6 sm:col-span-2">
                        <label htmlFor="deliveryDistance" className="block text-sm font-medium text-gray-700">
                          Distance (miles)
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            id="deliveryDistance"
                            value={deliveryDistance}
                            onChange={(e) => setDeliveryDistance(e.target.value)}
                            className="focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-12"
                            placeholder="0.0"
                          />
                          {isCalculatingDistance && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                              <svg className="animate-spin h-4 w-4 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Name */}
                      <div className="col-span-6 sm:col-span-2">
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

                      {/* Contact Phone */}
                      <div className="col-span-6 sm:col-span-2">
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

                      {/* Delivery Time */}
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

                      {/* Delivery Fee Preview */}
                      {deliveryZoneId && deliveryZones && (
                        <div className="col-span-6 bg-gray-50 rounded-md p-3">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Estimated Delivery Fee: </span>
                            {(() => {
                              const zone = deliveryZones.find(z => z.id === deliveryZoneId)
                              if (!zone) return '$0.00'
                              let fee = zone.baseFee
                              if (zone.perMileFee && deliveryDistance) {
                                fee += zone.perMileFee * parseFloat(deliveryDistance)
                              }
                              return `$${fee.toFixed(2)}`
                            })()}
                            {deliveryDistance && (
                              <span className="text-gray-500 ml-2">
                                ({deliveryDistance} miles)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
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
                        <label className="block text-xs font-medium text-gray-700">Tier Size *</label>
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
                        <label className="block text-xs font-medium text-gray-700">Batter Recipe</label>
                        <select
                          value={tier.batterRecipeId || ''}
                          onChange={(e) => updateTier(index, 'batterRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">Select recipe...</option>
                          {batterRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.batterRecipeId && (
                          <select
                            value={tier.flavor}
                            onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                            className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          >
                            <option value="">Or select flavor...</option>
                            {fieldOptions?.flavor?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Filling Recipe</label>
                        <select
                          value={tier.fillingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'fillingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">Select recipe...</option>
                          {fillingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.fillingRecipeId && (
                          <select
                            value={tier.filling}
                            onChange={(e) => updateTier(index, 'filling', e.target.value)}
                            className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          >
                            <option value="">Or select filling...</option>
                            {fieldOptions?.filling?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Frosting Recipe</label>
                        <select
                          value={tier.frostingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'frostingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value="">Select recipe...</option>
                          {frostingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.frostingRecipeId && (
                          <select
                            value={tier.finishType}
                            onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                            className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          >
                            <option value="">Or select finish...</option>
                            {fieldOptions?.cakeSurface?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Frosting Thickness</label>
                        <select
                          value={tier.frostingComplexity}
                          onChange={(e) => updateTier(index, 'frostingComplexity', parseInt(e.target.value))}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        >
                          <option value={1}>Light (thin coat)</option>
                          <option value={2}>Medium (standard)</option>
                          <option value={3}>Heavy (rosettes, thick texture)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Affects buttercream quantity for batch planning</p>
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

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Selecting recipes ensures accurate ingredient and labor costing.
                    If a recipe isn&apos;t available, use the flavor/filling/finish dropdowns as fallback.
                  </p>
                </div>
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

          {/* Products (Cupcakes, Cake Pops, etc.) */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Additional Products</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Add cupcakes, cake pops, cookies, and other products to this order.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <ProductSelector
                  selectedProducts={selectedProducts}
                  onProductsChange={setSelectedProducts}
                  showPackaging={true}
                />
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

                {/* Price Estimate */}
                <div className="bg-white rounded-lg p-4 border border-pink-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Price Estimate</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Decoration Materials</span>
                      <span className="text-gray-900">${estimate.materialsCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor ({estimatedHours}h @ ${estimate.hourlyRate}/hr)</span>
                      <span className="text-gray-900">${estimate.laborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal (before markup)</span>
                      <span>${(estimate.materialsCost + estimate.laborCost).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Markup ({(estimate.markupPercent * 100).toFixed(0)}%)</span>
                      <span>+${((estimate.materialsCost + estimate.laborCost) * estimate.markupPercent).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-gray-900">Suggested Price</span>
                        <span className="text-pink-600">${estimate.total.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        * Does not include tier ingredient costs or delivery. View full costing after order creation.
                      </p>
                    </div>
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
