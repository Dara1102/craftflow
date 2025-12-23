'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import ProductSelector from '@/app/components/ProductSelector'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Customer {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
}

interface TierSize {
  id: number
  name: string
  servings: number
  shape: string
}

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string
}

interface FieldOption {
  id: number
  name: string
}

interface FieldOptions {
  flavor: FieldOption[]
  filling: FieldOption[]
  cakeSurface: FieldOption[] // This is finishType
  occasion: FieldOption[]
  theme: FieldOption[]
  color: FieldOption[]
}

interface DecorationTechnique {
  id: number
  name: string
  category: string
  subcategory: string
  defaultCostPerUnit: string
  unit: string // 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
  imageReference?: string | null
}

interface CustomDecoration {
  name: string
  materialCost: number
  laborHours: number
  notes?: string
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

interface CostingResult {
  totalServings: number
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  topperCost: number
  deliveryCost: number
  totalLaborCost: number
  totalCost: number
  markupPercent: number
  suggestedPrice: number
  discountAmount: number
  finalPrice: number
  costPerServing: number
  suggestedPricePerServing: number
  laborBreakdown: Array<{
    role: string
    hours: number
    rate: number
    cost: number
  }>
}

export default function NewQuote() {
  const router = useRouter()
  
  // Customer state
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
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
  
  // Quote basics
  const [eventDate, setEventDate] = useState('')
  const [markupPercent, setMarkupPercent] = useState<number | null>(null)

  // Event/Customer Intake fields
  const [desiredServings, setDesiredServings] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [occasion, setOccasion] = useState('')
  const [theme, setTheme] = useState('')
  const [colors, setColors] = useState('')
  const [accentColors, setAccentColors] = useState('')
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [showAccentColorDropdown, setShowAccentColorDropdown] = useState(false)
  
  // Tiers - with recipe selection
  const [tiers, setTiers] = useState<Array<{
    tierIndex: number
    tierSizeId: number
    batterRecipeId?: number | null
    fillingRecipeId?: number | null
    frostingRecipeId?: number | null
    flavor?: string // Fallback if no recipe selected
    filling?: string
    finishType?: string
  }>>([{ tierIndex: 1, tierSizeId: 0 }])
  
  // Products (menu items like cupcakes, cake pops)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    menuItemId: number
    quantity: number
    packagingId?: number
    packagingQty?: number
    notes?: string
  }>>([])

  // Decorations
  const [selectedDecorations, setSelectedDecorations] = useState<Array<{
    decorationTechniqueId: number
    quantity: number
    unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' // Optional override of decoration's default unit
    tierIndices?: number[] // For TIER unit: which tier indices this decoration applies to (e.g., [1, 2])
  }>>([])
  const [customDecorations, setCustomDecorations] = useState<CustomDecoration[]>([])
  const [decorationSearch, setDecorationSearch] = useState('')
  const [decorationCategoryFilter, setDecorationCategoryFilter] = useState<string>('all')
  const [showDecorationModal, setShowDecorationModal] = useState(false)
  const [showCustomDecorationForm, setShowCustomDecorationForm] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const accentColorDropdownRef = useRef<HTMLDivElement>(null)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  // Delivery/Pickup
  const [isDelivery, setIsDelivery] = useState(false)
  const [pickupTime, setPickupTime] = useState('')
  const [deliveryZoneId, setDeliveryZoneId] = useState<number | null>(null)
  const [deliveryDistance, setDeliveryDistance] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryContact, setDeliveryContact] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryStartPointId, setDeliveryStartPointId] = useState<number | null>(null)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<PlaceResult[]>([])
  const [showVenueDropdown, setShowVenueDropdown] = useState(false)
  const [selectedVenueCoords, setSelectedVenueCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Topper
  const [topperType, setTopperType] = useState('')
  const [topperText, setTopperText] = useState('')
  
  // Discount
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED' | ''>('')
  const [discountValue, setDiscountValue] = useState('')

  // Deposit
  const [depositOption, setDepositOption] = useState<'default' | 'custom' | 'full'>('default')
  const [customDepositPercent, setCustomDepositPercent] = useState<number>(50)

  // Costing
  const [costing, setCosting] = useState<CostingResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Data fetching
  const { data: tierSizes } = useSWR<TierSize[]>('/api/tier-sizes', fetcher)
  const { data: customers, mutate: mutateCustomers } = useSWR(
    customerSearch.length >= 2 ? `/api/customers?search=${encodeURIComponent(customerSearch)}` : null,
    fetcher
  )
  const { data: allDecorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)
  const { data: deliveryZones } = useSWR('/api/delivery-zones', fetcher)
  const { data: deliveryStartPoints } = useSWR<DeliveryStartPoint[]>('/api/delivery-start-points', fetcher)
  const { data: settings } = useSWR('/api/settings', fetcher)
  const { data: fieldOptions } = useSWR<FieldOptions>('/api/field-options', fetcher)
  const { data: batterRecipes } = useSWR<Recipe[]>('/api/recipes?type=BATTER', fetcher)
  const { data: fillingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FILLING', fetcher)
  const { data: frostingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FROSTING', fetcher)
  
  // Filter decorations
  const filteredDecorations = allDecorations?.filter(dec => {
    const matchesSearch = !decorationSearch || 
      dec.name.toLowerCase().includes(decorationSearch.toLowerCase()) ||
      dec.category.toLowerCase().includes(decorationSearch.toLowerCase()) ||
      dec.subcategory.toLowerCase().includes(decorationSearch.toLowerCase())
    const matchesCategory = decorationCategoryFilter === 'all' || 
      dec.category.toLowerCase().includes(decorationCategoryFilter.toLowerCase())
    return matchesSearch && matchesCategory
  }) || []
  
  const decorationCategories = Array.from(new Set(allDecorations?.map(d => d.category) || []))
  
  // Set default markup from settings
  useEffect(() => {
    if (settings?.MarkupPercent && !markupPercent) {
      setMarkupPercent(parseFloat(settings.MarkupPercent))
    }
  }, [settings, markupPercent])
  
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

  // Set default delivery start point when loaded
  useEffect(() => {
    if (deliveryStartPoints && deliveryStartPoints.length > 0 && !deliveryStartPointId) {
      const defaultPoint = deliveryStartPoints.find(sp => sp.isDefault) || deliveryStartPoints[0]
      setDeliveryStartPointId(defaultPoint.id)
    }
  }, [deliveryStartPoints, deliveryStartPointId])

  // Venue search with debounce
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
  
  // Real-time cost calculation
  useEffect(() => {
    const finalCustomerName = selectedCustomer?.name || customerName.trim()
    if (!finalCustomerName || !eventDate || tiers.length === 0 || tiers.every(t => t.tierSizeId === 0)) {
      setCosting(null)
      return
    }
    
    const calculateCost = async () => {
      setIsCalculating(true)
      try {
        const response = await fetch('/api/quotes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: selectedCustomer?.id || customerId || null,
            customerName: finalCustomerName,
            eventDate,
            tiers: tiers.map(t => ({
              tierSizeId: t.tierSizeId,
              tierIndex: t.tierIndex,
              batterRecipeId: t.batterRecipeId || null,
              fillingRecipeId: t.fillingRecipeId || null,
              frostingRecipeId: t.frostingRecipeId || null,
              flavor: t.flavor || null,
              filling: t.filling || null,
              finishType: t.finishType || null
            })),
            decorations: selectedDecorations.map(dec => ({
              decorationTechniqueId: dec.decorationTechniqueId,
              quantity: dec.quantity,
              unitOverride: dec.unitOverride || undefined,
              tierIndices: dec.tierIndices && dec.tierIndices.length > 0 ? dec.tierIndices : undefined
            })),
            isDelivery,
            deliveryZoneId,
            deliveryDistance: deliveryDistance ? parseFloat(deliveryDistance) : null,
            topperType: topperType || null,
            topperText: topperText || null,
            markupPercent: markupPercent || undefined,
            discountType: discountType || null,
            discountValue: discountValue ? parseFloat(discountValue) : null
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setCosting(data)
        }
      } catch (error) {
        console.error('Failed to calculate cost:', error)
      } finally {
        setIsCalculating(false)
      }
    }
    
    // Debounce calculation
    const timer = setTimeout(calculateCost, 500)
    return () => clearTimeout(timer)
  }, [
    customerId, selectedCustomer, customerName, eventDate, tiers, selectedDecorations,
    isDelivery, deliveryZoneId, deliveryDistance, topperType, topperText,
    markupPercent, discountType, discountValue
  ])
  
  const addTier = () => {
    const newTierIndex = tiers.length + 1
    setTiers([...tiers, { tierIndex: newTierIndex, tierSizeId: 0 }])
    // Update decorations with TIER unit to include the new tier
    setSelectedDecorations(selectedDecorations.map(dec => {
      const effectiveUnit = dec.unitOverride || allDecorations?.find(d => d.id === dec.decorationTechniqueId)?.unit
      if (effectiveUnit === 'TIER') {
        // If tierIndices exists, add new tier; otherwise initialize with all tiers
        const currentTierIndices = dec.tierIndices || []
        return { ...dec, tierIndices: [...currentTierIndices, newTierIndex] }
      }
      return dec
    }))
  }
  
  const removeTier = (index: number) => {
    const removedTierIndex = tiers[index].tierIndex
    const newTiers = tiers.filter((_, i) => i !== index).map((t, i) => ({ ...t, tierIndex: i + 1 }))
    setTiers(newTiers)
    // Update decorations with TIER unit to remove the deleted tier and reindex
    setSelectedDecorations(selectedDecorations.map(dec => {
      const effectiveUnit = dec.unitOverride || allDecorations?.find(d => d.id === dec.decorationTechniqueId)?.unit
      if (effectiveUnit === 'TIER' && dec.tierIndices) {
        // Map old tier indices to new tier indices after removal
        const updatedIndices = dec.tierIndices
          .map(oldTierIndex => {
            // Find the old position of this tier
            const oldPosition = tiers.findIndex(t => t.tierIndex === oldTierIndex)
            if (oldPosition === -1) return null // Tier doesn't exist anymore
            if (oldPosition === index) return null // This is the removed tier
            if (oldPosition < index) return oldTierIndex // Before removed tier, keep same index
            // After removed tier: old tier 3 (position 2) becomes new tier 2 (position 1)
            // The new tierIndex is based on new position: oldPosition - 1 + 1 = oldPosition
            // But we need the actual new tierIndex value
            const newPosition = oldPosition - 1
            return newPosition + 1 // New tierIndex
          })
          .filter((ti): ti is number => ti !== null)
        return { ...dec, tierIndices: updatedIndices.length > 0 ? updatedIndices : undefined }
      }
      return dec
    }))
  }
  
  const updateTier = (index: number, field: string, value: any) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }
  
  const addDecoration = (decorationId: number) => {
    if (selectedDecorations.find(d => d.decorationTechniqueId === decorationId)) {
      return
    }
    // Get the decoration's default unit
    const decoration = allDecorations?.find(d => d.id === decorationId)
    const defaultUnit = decoration?.unit as 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined
    // If default unit is TIER, initialize with all tiers selected (only if tiers exist)
    const initialTierIndices = defaultUnit === 'TIER' && tiers.length > 0 
      ? tiers.map(t => t.tierIndex).filter(ti => ti > 0) // Filter out invalid tier indices
      : undefined
    setSelectedDecorations([...selectedDecorations, { 
      decorationTechniqueId: decorationId, 
      quantity: 1,
      unitOverride: undefined, // Start with default, user can override
      tierIndices: initialTierIndices
    }])
  }
  
  const removeDecoration = (decorationId: number) => {
    setSelectedDecorations(selectedDecorations.filter(d => d.decorationTechniqueId !== decorationId))
  }
  
  const updateDecorationQuantity = (decorationId: number, quantity: number) => {
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === decorationId ? { ...d, quantity } : d
    ))
  }
  
  const updateDecorationUnit = (decorationId: number, unitOverride: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined) => {
    setSelectedDecorations(selectedDecorations.map(d => {
      if (d.decorationTechniqueId === decorationId) {
        // If switching to TIER unit, initialize with all tiers selected (only if tiers exist)
        // If switching away from TIER, clear tierIndices
        const newTierIndices = unitOverride === 'TIER' 
          ? (tiers.length > 0 ? tiers.map(t => t.tierIndex).filter(ti => ti > 0) : undefined)
          : unitOverride === undefined && d.unitOverride === 'TIER'
            ? undefined
            : d.tierIndices
        return { ...d, unitOverride, tierIndices: newTierIndices }
      }
      return d
    }))
  }
  
  const updateDecorationTierIndices = (decorationId: number, tierIndices: number[]) => {
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === decorationId ? { ...d, tierIndices } : d
    ))
  }
  
  const toggleDecorationTier = (decorationId: number, tierIndex: number) => {
    const decoration = selectedDecorations.find(d => d.decorationTechniqueId === decorationId)
    if (!decoration) return
    
    const currentTierIndices = decoration.tierIndices || []
    const isCurrentlySelected = currentTierIndices.includes(tierIndex)
    
    // Prevent unchecking if it's the last selected tier
    if (isCurrentlySelected && currentTierIndices.length === 1) {
      // Don't allow unchecking the last tier - show warning instead
      return
    }
    
    const newTierIndices = isCurrentlySelected
      ? currentTierIndices.filter(ti => ti !== tierIndex)
      : [...currentTierIndices, tierIndex]
    
    updateDecorationTierIndices(decorationId, newTierIndices)
  }
  
  const addCustomDecoration = (custom: CustomDecoration) => {
    setCustomDecorations([...customDecorations, custom])
    setShowCustomDecorationForm(false)
  }
  
  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id)
    setSelectedCustomer(customer)
    setCustomerName(customer.name)
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
    setShowNewCustomerForm(false)
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
  
  const handleSaveQuote = async () => {
    const finalCustomerName = selectedCustomer?.name || customerName.trim()
    if (!finalCustomerName) {
      alert('Please select or enter a customer name')
      return
    }
    if (!eventDate) {
      alert('Please fill in event date')
      return
    }
    
    const validTiers = tiers.filter(t => t.tierSizeId > 0)
    if (validTiers.length === 0) {
      alert('Please add at least one tier with a size selected')
      return
    }
    
    // Validate TIER unit decorations have at least one tier selected
    const invalidDecorations = selectedDecorations.filter(dec => {
      const technique = allDecorations?.find(d => d.id === dec.decorationTechniqueId)
      const effectiveUnit = dec.unitOverride || technique?.unit
      if (effectiveUnit === 'TIER') {
        return !dec.tierIndices || dec.tierIndices.length === 0
      }
      return false
    })
    
    if (invalidDecorations.length > 0) {
      const decorationNames = invalidDecorations.map(dec => {
        const technique = allDecorations?.find(d => d.id === dec.decorationTechniqueId)
        return technique?.name || 'Unknown'
      }).join(', ')
      alert(`Please select at least one tier for the following TIER unit decoration(s): ${decorationNames}`)
      return
    }
    
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id || customerId || null,
          customerName: finalCustomerName,
          eventDate,
          // Event details / intake fields
          desiredServings: desiredServings ? parseInt(desiredServings) : null,
          budgetMin: budgetMin ? parseFloat(budgetMin) : null,
          budgetMax: budgetMax ? parseFloat(budgetMax) : null,
          occasion: occasion || null,
          theme: theme || null,
          colors: colors || null,
          accentColors: accentColors || null,
          tiers: validTiers.map(t => ({
            tierSizeId: t.tierSizeId,
            tierIndex: t.tierIndex,
            batterRecipeId: t.batterRecipeId || null,
            fillingRecipeId: t.fillingRecipeId || null,
            frostingRecipeId: t.frostingRecipeId || null,
            flavor: t.flavor || null,
            filling: t.filling || null,
            finishType: t.finishType || null
            })),
          decorations: selectedDecorations.map(dec => ({
            decorationTechniqueId: dec.decorationTechniqueId,
            quantity: dec.quantity,
            unitOverride: dec.unitOverride || undefined,
            tierIndices: dec.tierIndices && dec.tierIndices.length > 0 ? dec.tierIndices : undefined
          })),
          isDelivery,
          deliveryZoneId,
          deliveryDistance: deliveryDistance ? parseFloat(deliveryDistance) : null,
          deliveryAddress: deliveryAddress || null,
          deliveryContact: deliveryContact || null,
          deliveryPhone: deliveryPhone || null,
          deliveryTime: deliveryTime || null,
          topperType: topperType || null,
          topperText: topperText || null,
          markupPercent: markupPercent || undefined,
          depositPercent: depositOption === 'default' ? null :
                          depositOption === 'full' ? 1 :
                          customDepositPercent / 100,
          discountType: discountType || null,
          discountValue: discountValue ? parseFloat(discountValue) : null,
          products: selectedProducts.map(p => ({
            menuItemId: p.menuItemId,
            quantity: p.quantity,
            packagingId: p.packagingId || null,
            packagingQty: p.packagingQty || null,
            notes: p.notes || null
          })),
          status: 'DRAFT'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/quotes/${data.quote.id}`)
      } else {
        let errorData: any = {}
        let responseText = ''
        
        try {
          responseText = await response.text()
          console.log('Raw response text:', responseText)
          
          if (responseText) {
            try {
              errorData = JSON.parse(responseText)
            } catch (parseError) {
              console.error('Failed to parse JSON:', parseError)
              errorData = { 
                error: 'Invalid JSON response', 
                rawResponse: responseText.substring(0, 200) // First 200 chars
              }
            }
          } else {
            errorData = { error: 'Empty response from server' }
          }
        } catch (e) {
          console.error('Failed to read response:', e)
          errorData = { 
            error: 'Failed to read error response', 
            exception: e instanceof Error ? e.message : String(e)
          }
        }
        
        console.error('Save error response:', {
          status: response.status,
          statusText: response.statusText,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          errorData,
          responseText: responseText.substring(0, 500), // First 500 chars
          url: response.url
        })
        
        const errorMessage = errorData.details || errorData.error || `Server error (${response.status}: ${response.statusText})`
        const debugInfo = errorData.debug ? `\n\nDebug: ${JSON.stringify(errorData.debug, null, 2)}` : ''
        const rawInfo = responseText ? `\n\nRaw response: ${responseText.substring(0, 200)}` : ''
        alert(`Failed to save quote: ${errorMessage}${debugInfo}${rawInfo}`)
      }
    } catch (error) {
      console.error('Failed to save quote:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save quote: ${errorMessage}`)
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Quote</h1>
          <Link
            href="/quotes"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Quotes
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerDropdown(e.target.value.length >= 2)
                        if (!e.target.value) {
                          setCustomerId(null)
                          setCustomerName('')
                          setSelectedCustomer(null)
                        }
                      }}
                      onFocus={() => {
                        if (customerSearch.length >= 2) {
                          setShowCustomerDropdown(true)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Search customers..."
                    />
                    {selectedCustomer && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    
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
                            setCustomerName('')
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Event Details Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <p className="text-sm text-gray-600 mb-4">Occasion, theme, colors, and serving requirements.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desired Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={desiredServings}
                    onChange={(e) => setDesiredServings(e.target.value)}
                    placeholder="e.g., 50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Target number of servings for this order</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="Min"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <span className="text-gray-500">to</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="Max"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Customer&apos;s desired budget (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occasion
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">Select occasion...</option>
                    {fieldOptions?.occasion?.map(opt => (
                      <option key={opt.id} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">Select theme...</option>
                    {fieldOptions?.theme?.map(opt => (
                      <option key={opt.id} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div ref={colorDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colors
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setShowColorDropdown(!showColorDropdown)}
                      className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
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

                <div ref={accentColorDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Colors
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setShowAccentColorDropdown(!showAccentColorDropdown)}
                      className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
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
              </div>
            </div>

            {/* Tiers Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Cake Tiers</h2>
                <button
                  onClick={addTier}
                  className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                >
                  + Add Tier
                </button>
              </div>
              
              <div className="space-y-4">
                {tiers.map((tier, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium">Tier {tier.tierIndex}</h3>
                      {tiers.length > 1 && (
                        <button
                          onClick={() => removeTier(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size *
                        </label>
                        <select
                          value={tier.tierSizeId}
                          onChange={(e) => updateTier(index, 'tierSizeId', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value={0}>Select size...</option>
                          {tierSizes?.map(ts => (
                            <option key={ts.id} value={ts.id}>
                              {ts.name} ({ts.servings} servings)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batter Recipe (Recommended)
                        </label>
                        <select
                          value={tier.batterRecipeId || ''}
                          onChange={(e) => updateTier(index, 'batterRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select recipe...</option>
                          {batterRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                        {!tier.batterRecipeId && (
                          <select
                            value={tier.flavor || ''}
                            onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          >
                            <option value="">Or select flavor...</option>
                            {fieldOptions?.flavor?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Filling Recipe (Recommended)
                        </label>
                        <select
                          value={tier.fillingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'fillingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select recipe...</option>
                          {fillingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                        {!tier.fillingRecipeId && (
                          <select
                            value={tier.filling || ''}
                            onChange={(e) => updateTier(index, 'filling', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          >
                            <option value="">Or select filling...</option>
                            {fieldOptions?.filling?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frosting Recipe (Recommended)
                        </label>
                        <select
                          value={tier.frostingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'frostingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select recipe...</option>
                          {frostingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                        {!tier.frostingRecipeId && (
                          <select
                            value={tier.finishType || ''}
                            onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                          >
                            <option value="">Or select finish type...</option>
                            {fieldOptions?.cakeSurface?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Selecting recipes ensures accurate ingredient and labor costing. 
                  If a recipe isn't available, use the flavor/filling/finish dropdowns as fallback.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Note:</strong> Visual drag-and-drop tier builder coming soon. For now, use the "Add Tier" button above.
                </p>
              </div>
            </div>

            {/* Products Section - Cupcakes, Cake Pops, etc. */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Additional Products</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add cupcakes, cake pops, cookies, and other menu items to this order.
              </p>
              <ProductSelector
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                showPackaging={true}
              />
            </div>

            {/* Decorations Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Decorations</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustomDecorationForm(true)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    + Custom Decoration
                  </button>
                  <button
                    onClick={() => setShowDecorationModal(true)}
                    className="px-4 py-1 bg-pink-600 text-white rounded hover:bg-pink-700 text-sm"
                  >
                    Browse All Decorations
                  </button>
                </div>
              </div>
              
              {/* Selected Decorations */}
              {selectedDecorations.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedDecorations.map(dec => {
                    const technique = allDecorations?.find(d => d.id === dec.decorationTechniqueId)
                    if (!technique) return null
                    return (
                      <div key={dec.decorationTechniqueId} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="font-medium">{technique.name}</span>
                            <span className="text-gray-500 text-sm ml-2">({technique.category})</span>
                            {dec.unitOverride && (
                              <span className="ml-2 text-xs text-blue-600 italic">
                                (Unit: {dec.unitOverride.toLowerCase()}, default: {technique.unit.toLowerCase()})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeDecoration(dec.decorationTechniqueId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-gray-600 flex items-center gap-2">
                            <span>Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={dec.quantity}
                              onChange={(e) => updateDecorationQuantity(dec.decorationTechniqueId, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded"
                            />
                          </label>
                          <label className="text-sm text-gray-600 flex items-center gap-2">
                            <span>Unit:</span>
                            <select
                              value={dec.unitOverride || technique.unit}
                              onChange={(e) => {
                                const value = e.target.value
                                updateDecorationUnit(dec.decorationTechniqueId, value === technique.unit ? undefined : value as 'SINGLE' | 'CAKE' | 'TIER' | 'SET')
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="SINGLE">Single</option>
                              <option value="CAKE">Cake</option>
                              <option value="TIER">Tier</option>
                              <option value="SET">Set</option>
                            </select>
                            {dec.unitOverride && (
                              <button
                                onClick={() => updateDecorationUnit(dec.decorationTechniqueId, undefined)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                                title="Reset to default"
                              >
                                Reset
                              </button>
                            )}
                          </label>
                          <span className="text-sm text-gray-500">${Number(technique.defaultCostPerUnit).toFixed(2)}/unit</span>
                          <span className="text-sm font-medium text-pink-600">
                            = ${(Number(technique.defaultCostPerUnit) * dec.quantity).toFixed(2)}
                          </span>
                          <span className="relative group">
                            <span className="text-xs text-gray-400 cursor-help underline decoration-dotted">(materials)</span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              Material cost = base cost × qty × size multiplier
                            </span>
                          </span>
                        </div>
                        {(dec.unitOverride || technique.unit) === 'TIER' && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="text-sm text-gray-600 mb-2 block">Apply to tiers:</label>
                            {tiers.length === 0 ? (
                              <p className="text-xs text-red-500">Please add at least one tier to the cake first</p>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-3">
                                  {tiers.map(tier => {
                                    const isSelected = dec.tierIndices?.includes(tier.tierIndex) ?? false
                                    return (
                                      <label
                                        key={tier.tierIndex}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleDecorationTier(dec.decorationTechniqueId, tier.tierIndex)}
                                          className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                        />
                                        <span className="text-sm text-gray-700">Tier {tier.tierIndex}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                                {dec.tierIndices && dec.tierIndices.length === 0 && (
                                  <p className="text-xs text-red-500 mt-2">⚠️ Please select at least one tier</p>
                                )}
                                {dec.tierIndices && dec.tierIndices.length === 1 && (
                                  <p className="text-xs text-amber-600 mt-2">ℹ️ At least one tier must remain selected</p>
                                )}
                                {dec.tierIndices && dec.tierIndices.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Applied to {dec.tierIndices.length} tier{dec.tierIndices.length !== 1 ? 's' : ''}: {dec.tierIndices.sort((a, b) => a - b).join(', ')}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Custom Decorations */}
              {customDecorations.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Custom Decorations</h3>
                  {customDecorations.map((custom, idx) => (
                    <div key={idx} className="p-2 border border-gray-200 rounded bg-gray-50">
                      <div className="flex justify-between">
                        <span>{custom.name}</span>
                        <span className="text-sm text-gray-600">
                          ${custom.materialCost.toFixed(2)} + {custom.laborHours}h labor
                        </span>
                      </div>
                      {custom.notes && <p className="text-xs text-gray-500 mt-1">{custom.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              
              {selectedDecorations.length === 0 && customDecorations.length === 0 && (
                <p className="text-gray-500 text-sm">No decorations added yet. Click &quot;Browse All Decorations&quot; to add.</p>
              )}

              {/* Est. Decoration Materials Total */}
              {selectedDecorations.length > 0 && (
                <p className="text-sm text-gray-600 text-right mt-4">
                  Est. Decoration Materials: <span className="font-medium text-pink-600">
                    ${selectedDecorations.reduce((sum, dec) => {
                      const technique = allDecorations?.find(d => d.id === dec.decorationTechniqueId)
                      if (!technique) return sum
                      return sum + (Number(technique.defaultCostPerUnit) * dec.quantity)
                    }, 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">(base cost, final may vary with size)</span>
                </p>
              )}

              {/* How Decoration Costs Work */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  <strong>How Decoration Costs Work:</strong>
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>SINGLE:</strong> Per-item cost (sugar flowers, toppers) - no size scaling</li>
                  <li><strong>CAKE:</strong> Whole cake surface (fondant quilt) - scales by total surface area vs base cake size</li>
                  <li><strong>TIER:</strong> Per-tier design (ombre effect) - scales by tier size vs base cake size</li>
                  <li><strong>SET:</strong> Matching set of items (unicorn kit) - no size scaling</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2 italic">
                  The material cost shown is calculated from the base cost/unit × quantity × size multiplier (for CAKE/TIER units).
                  Labor costs are calculated separately based on decoration skill level.
                </p>
              </div>
            </div>
            
            {/* Delivery/Pickup Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Delivery / Pickup</h2>
              <div className="space-y-4">
                {/* Delivery/Pickup Toggle */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={!isDelivery}
                      onChange={() => setIsDelivery(false)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Pickup</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={isDelivery}
                      onChange={() => setIsDelivery(true)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Delivery</span>
                  </label>
                </div>

                {/* Pickup Details */}
                {!isDelivery && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Customer will pick up the order at your bakery location.
                    </p>
                  </div>
                )}

                {/* Delivery Details */}
                {isDelivery && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delivery Zone
                        </label>
                        <select
                          value={deliveryZoneId || ''}
                          onChange={(e) => setDeliveryZoneId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select zone...</option>
                          {deliveryZones?.map((zone: any) => (
                            <option key={zone.id} value={zone.id}>{zone.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delivery Start Point
                        </label>
                        <select
                          value={deliveryStartPointId || ''}
                          onChange={(e) => {
                            setDeliveryStartPointId(e.target.value ? parseInt(e.target.value) : null)
                            // Recalculate distance if we have coordinates
                            if (selectedVenueCoords) {
                              const newStartPoint = deliveryStartPoints?.find(sp => sp.id === parseInt(e.target.value))
                              if (newStartPoint?.latitude && newStartPoint?.longitude) {
                                calculateDeliveryDistance(selectedVenueCoords.lat, selectedVenueCoords.lng)
                              }
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select start point...</option>
                          {deliveryStartPoints?.map((sp) => (
                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                          ))}
                        </select>
                        {deliveryStartPointId && deliveryStartPoints && (
                          <p className="text-xs text-gray-500 mt-1">
                            {deliveryStartPoints.find(sp => sp.id === deliveryStartPointId)?.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Venue Search */}
                    <div ref={venueDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Venue/Location
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={venueSearch}
                          onChange={(e) => setVenueSearch(e.target.value)}
                          placeholder="Search for venue, restaurant, address..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        />
                        {showVenueDropdown && venueResults.length > 0 && (
                          <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Address
                      </label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Full delivery address"
                      />
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Distance (miles)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={deliveryDistance}
                          onChange={(e) => setDeliveryDistance(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 pr-12"
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={deliveryContact}
                          onChange={(e) => setDeliveryContact(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Who to contact on delivery"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Time
                      </label>
                      <input
                        type="datetime-local"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Topper Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Topper</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topper Type
                  </label>
                  <select
                    value={topperType}
                    onChange={(e) => setTopperType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    <option value="happy_birthday">Happy Birthday</option>
                    <option value="age">Age Number</option>
                    <option value="initials">Initials</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                {(topperType === 'age' || topperType === 'initials' || topperType === 'custom') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topper Text
                    </label>
                    <input
                      type="text"
                      value={topperText}
                      onChange={(e) => setTopperText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={topperType === 'age' ? 'e.g., 25' : topperType === 'initials' ? 'e.g., JD' : 'Custom message'}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Discount Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Discount</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED' | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    <option value="PERCENT">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                
                {discountType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value {discountType === 'PERCENT' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Cost Panel (Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Quote Pricing</h2>
              
              {isCalculating ? (
                <div className="text-center py-8 text-gray-500">Calculating...</div>
              ) : costing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Markup (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={markupPercent || ''}
                      onChange={(e) => setMarkupPercent(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost to Company:</span>
                      <span className="font-medium">${costing.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markup ({costing.markupPercent * 100}%):</span>
                      <span className="font-medium">${(costing.suggestedPrice - costing.totalCost).toFixed(2)}</span>
                    </div>
                    {costing.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount:</span>
                        <span>-${costing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Final Price:</span>
                      <span className="text-pink-600">${costing.finalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Per Serving:</span>
                      <span>${costing.suggestedPricePerServing.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Deposit Options */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Deposit Required</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDepositOption('default')}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                            depositOption === 'default'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Default ({settings?.DefaultDepositPercent ? (parseFloat(settings.DefaultDepositPercent) * 100).toFixed(0) : 50}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositOption('full')}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                            depositOption === 'full'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Pay in Full
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDepositOption('custom')}
                        className={`w-full px-3 py-2 text-sm rounded-md border ${
                          depositOption === 'custom'
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Custom Amount
                      </button>
                      {depositOption === 'custom' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            value={customDepositPercent}
                            onChange={(e) => setCustomDepositPercent(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      )}
                      <div className="bg-pink-50 rounded-lg p-3 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-pink-800">Deposit Amount:</span>
                          <span className="font-bold text-pink-600">
                            ${(costing.finalPrice * (
                              depositOption === 'full' ? 1 :
                              depositOption === 'custom' ? customDepositPercent / 100 :
                              (settings?.DefaultDepositPercent ? parseFloat(settings.DefaultDepositPercent) : 0.5)
                            )).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-pink-700 mt-1">
                          {depositOption === 'full' ? '100%' :
                           depositOption === 'custom' ? `${customDepositPercent}%` :
                           `${settings?.DefaultDepositPercent ? (parseFloat(settings.DefaultDepositPercent) * 100).toFixed(0) : 50}%`} of total to confirm order
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Cost Breakdown</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Ingredients:</span>
                        <span>${costing.ingredientCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Decorations:</span>
                        <span>${(costing.decorationMaterialCost + costing.decorationLaborCost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor:</span>
                        <span>${costing.totalLaborCost.toFixed(2)}</span>
                      </div>
                      {costing.topperCost > 0 && (
                        <div className="flex justify-between">
                          <span>Topper:</span>
                          <span>${costing.topperCost.toFixed(2)}</span>
                        </div>
                      )}
                      {costing.deliveryCost > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery:</span>
                          <span>${costing.deliveryCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Servings: <span className="font-medium">{costing.totalServings}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSaveQuote}
                    className="w-full mt-6 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium"
                  >
                    Save Quote
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Fill in customer name, event date, and add at least one tier to see pricing</p>
                  <p className="text-xs mt-2 text-gray-400">
                    Costs update in real-time as you make changes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Decoration Modal */}
      {showDecorationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Select Decorations</h2>
              <button
                onClick={() => {
                  setShowDecorationModal(false)
                  setDecorationSearch('')
                  setDecorationCategoryFilter('all')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Search and Filter */}
              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  placeholder="Search decorations..."
                  value={decorationSearch}
                  onChange={(e) => setDecorationSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDecorationCategoryFilter('all')}
                    className={`px-3 py-1 rounded text-sm ${
                      decorationCategoryFilter === 'all' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    All
                  </button>
                  {decorationCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setDecorationCategoryFilter(cat.toLowerCase())}
                      className={`px-3 py-1 rounded text-sm ${
                        decorationCategoryFilter === cat.toLowerCase()
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Decorations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDecorations.map(dec => {
                  const isSelected = selectedDecorations.some(d => d.decorationTechniqueId === dec.id)
                  return (
                    <div
                      key={dec.id}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        isSelected 
                          ? 'border-pink-500 bg-pink-50' 
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          removeDecoration(dec.id)
                        } else {
                          addDecoration(dec.id)
                        }
                      }}
                    >
                      {dec.imageReference && (
                        <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Image placeholder</span>
                        </div>
                      )}
                      <h3 className="font-medium">{dec.name}</h3>
                      <p className="text-xs text-gray-500">{dec.category} • {dec.subcategory}</p>
                      <p className="text-sm text-gray-700 mt-1">${parseFloat(dec.defaultCostPerUnit).toFixed(2)}</p>
                      {isSelected && (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedDecorations.find(d => d.decorationTechniqueId === dec.id)?.quantity || 1}
                              onChange={(e) => {
                                e.stopPropagation()
                                updateDecorationQuantity(dec.id, parseInt(e.target.value) || 1)
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Unit:</label>
                            <select
                              value={selectedDecorations.find(d => d.decorationTechniqueId === dec.id)?.unitOverride || dec.unit}
                              onChange={(e) => {
                                e.stopPropagation()
                                const value = e.target.value
                                updateDecorationUnit(dec.id, value === dec.unit ? undefined : value as 'SINGLE' | 'CAKE' | 'TIER' | 'SET')
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="SINGLE">Single</option>
                              <option value="CAKE">Cake</option>
                              <option value="TIER">Tier</option>
                              <option value="SET">Set</option>
                            </select>
                            {selectedDecorations.find(d => d.decorationTechniqueId === dec.id)?.unitOverride && (
                              <span className="text-xs text-gray-500 italic">(override)</span>
                            )}
                          </div>
                          {(selectedDecorations.find(d => d.decorationTechniqueId === dec.id)?.unitOverride || dec.unit) === 'TIER' && (() => {
                            const decoration = selectedDecorations.find(d => d.decorationTechniqueId === dec.id)
                            return (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="text-xs text-gray-600 mb-1 block">Apply to tiers:</label>
                                {tiers.length === 0 ? (
                                  <p className="text-xs text-red-500">Please add at least one tier to the cake first</p>
                                ) : (
                                  <>
                                    <div className="flex flex-wrap gap-2">
                                      {tiers.map(tier => {
                                        const isSelected = decoration?.tierIndices?.includes(tier.tierIndex) ?? false
                                        return (
                                          <label
                                            key={tier.tierIndex}
                                            className="flex items-center gap-1 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                e.stopPropagation()
                                                toggleDecorationTier(dec.id, tier.tierIndex)
                                              }}
                                              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                            />
                                            <span className="text-xs text-gray-700">Tier {tier.tierIndex}</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                    {decoration?.tierIndices && decoration.tierIndices.length === 0 && (
                                      <p className="text-xs text-red-500 mt-1">⚠️ Please select at least one tier</p>
                                    )}
                                    {decoration?.tierIndices && decoration.tierIndices.length === 1 && (
                                      <p className="text-xs text-amber-600 mt-1">ℹ️ At least one tier must remain selected</p>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {filteredDecorations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No decorations found. Try a different search or filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Decoration Form Modal */}
      {showCustomDecorationForm && (
        <CustomDecorationForm
          onSave={addCustomDecoration}
          onCancel={() => setShowCustomDecorationForm(false)}
        />
      )}
    </div>
  )
}

// Custom Decoration Form Component
function CustomDecorationForm({ onSave, onCancel }: { onSave: (dec: CustomDecoration) => void, onCancel: () => void }) {
  const [name, setName] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [notes, setNotes] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !materialCost || !laborHours) {
      alert('Please fill in name, material cost, and labor hours')
      return
    }
    onSave({
      name,
      materialCost: parseFloat(materialCost),
      laborHours: parseFloat(laborHours),
      notes: notes || undefined
    })
    setName('')
    setMaterialCost('')
    setLaborHours('')
    setNotes('')
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Add Custom Decoration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Material Cost ($) *
            </label>
            <input
              type="number"
              step="0.01"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Labor Hours *
            </label>
            <input
              type="number"
              step="0.25"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              Add Decoration
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
