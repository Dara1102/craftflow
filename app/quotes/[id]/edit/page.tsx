'use client'

import { useState, useEffect, useRef, use } from 'react'
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
  cakeSurface: FieldOption[]
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
  unit: 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
  baseCakeSize?: string
  imageReference?: string | null
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

interface TierData {
  tierIndex: number
  tierSizeId: number
  batterRecipeId?: number | null
  fillingRecipeId?: number | null
  frostingRecipeId?: number | null
  flavor?: string
  filling?: string
  finishType?: string
}

interface DecorationData {
  decorationTechniqueId: number
  quantity: number
  unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
  tierIndices?: number[]
}

export default function EditQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const quoteId = parseInt(id)
  const router = useRouter()

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Customer state
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Quote basics
  const [eventDate, setEventDate] = useState('')
  const [markupPercent, setMarkupPercent] = useState<number | null>(null)

  // Event/Customer Intake fields
  const [desiredServings, setDesiredServings] = useState('')
  const [occasion, setOccasion] = useState('')
  const [theme, setTheme] = useState('')
  const [colors, setColors] = useState('')
  const [accentColors, setAccentColors] = useState('')
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [showAccentColorDropdown, setShowAccentColorDropdown] = useState(false)
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')

  // Tiers
  const [tiers, setTiers] = useState<TierData[]>([{ tierIndex: 1, tierSizeId: 0 }])

  // Decorations
  const [selectedDecorations, setSelectedDecorations] = useState<DecorationData[]>([])
  const [decorationSearch, setDecorationSearch] = useState('')
  const [decorationCategoryFilter, setDecorationCategoryFilter] = useState<string>('all')
  const [showDecorationModal, setShowDecorationModal] = useState(false)

  // Products (menu items like cupcakes, cake pops)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    menuItemId: number
    quantity: number
    packagingSelections: { packagingId: number; quantity: number }[]
    packagingId?: number
    packagingQty?: number
    notes?: string
  }>>([])

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
  const [customTopperFee, setCustomTopperFee] = useState('')

  // Discount
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED' | ''>('')
  const [discountValue, setDiscountValue] = useState('')

  // Deposit
  const [depositType, setDepositType] = useState<'default' | 'PERCENT' | 'FIXED'>('default')
  const [depositValue, setDepositValue] = useState<string>('')

  // Price Adjustment (round up/down)
  const [priceAdjustment, setPriceAdjustment] = useState<string>('')

  // Notes
  const [notes, setNotes] = useState('')

  // Costing
  const [costing, setCosting] = useState<CostingResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Data fetching
  const { data: tierSizes } = useSWR<TierSize[]>('/api/tier-sizes', fetcher)
  const { data: customers, mutate: mutateCustomers } = useSWR(
    customerSearch.length >= 2 ? `/api/customers?search=${encodeURIComponent(customerSearch)}` : null,
    fetcher
  )
  const { data: allDecorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)
  const { data: fieldOptions } = useSWR<FieldOptions>('/api/field-options', fetcher)
  const { data: deliveryZones } = useSWR('/api/delivery-zones', fetcher)
  const { data: deliveryStartPoints } = useSWR<DeliveryStartPoint[]>('/api/delivery-start-points', fetcher)
  const { data: settings } = useSWR('/api/settings', fetcher)
  const { data: batterRecipes } = useSWR<Recipe[]>('/api/recipes?type=BATTER', fetcher)
  const { data: fillingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FILLING', fetcher)
  const { data: frostingRecipes } = useSWR<Recipe[]>('/api/recipes?type=FROSTING', fetcher)

  // Fetch existing quote data
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/quotes/${quoteId}`)
        if (!res.ok) {
          router.push('/quotes')
          return
        }
        const data = await res.json()
        const quote = data.quote

        // Populate form with existing data
        setQuoteNumber(quote.quoteNumber)
        setCustomerId(quote.customerId)
        setCustomerName(quote.customerName)
        if (quote.customer) {
          setSelectedCustomer(quote.customer)
        }
        setEventDate(quote.eventDate.split('T')[0])
        setMarkupPercent(parseFloat(quote.markupPercent))

        // Set event details
        if (quote.desiredServings) setDesiredServings(quote.desiredServings.toString())
        if (quote.occasion) setOccasion(quote.occasion)
        if (quote.theme) setTheme(quote.theme)
        if (quote.colors) setColors(quote.colors)
        if (quote.accentColors) setAccentColors(quote.accentColors)
        if (quote.budgetMin) setBudgetMin(quote.budgetMin.toString())
        if (quote.budgetMax) setBudgetMax(quote.budgetMax.toString())

        // Set deposit
        if (quote.depositType) {
          setDepositType(quote.depositType as 'PERCENT' | 'FIXED')
          if (quote.depositType === 'FIXED' && quote.depositAmount !== null) {
            setDepositValue(parseFloat(quote.depositAmount).toString())
          } else if (quote.depositType === 'PERCENT' && quote.depositPercent !== null) {
            setDepositValue((parseFloat(quote.depositPercent) * 100).toString())
          }
        } else if (quote.depositPercent !== null) {
          // Legacy: convert old percent-only format
          setDepositType('PERCENT')
          setDepositValue((parseFloat(quote.depositPercent) * 100).toString())
        }

        // Set price adjustment
        if (quote.priceAdjustment !== null && quote.priceAdjustment !== undefined) {
          setPriceAdjustment(parseFloat(quote.priceAdjustment).toString())
        }

        // Set tiers
        if (quote.quoteTiers && quote.quoteTiers.length > 0) {
          setTiers(quote.quoteTiers.map((t: any) => ({
            tierIndex: t.tierIndex,
            tierSizeId: t.tierSizeId,
            batterRecipeId: t.batterRecipeId,
            fillingRecipeId: t.fillingRecipeId,
            frostingRecipeId: t.frostingRecipeId,
            flavor: t.flavor,
            filling: t.filling,
            finishType: t.finishType
          })))
        }

        // Set decorations
        if (quote.quoteDecorations && quote.quoteDecorations.length > 0) {
          setSelectedDecorations(quote.quoteDecorations.map((d: any) => ({
            decorationTechniqueId: d.decorationTechniqueId,
            quantity: d.quantity,
            unitOverride: d.unitOverride,
            tierIndices: d.tierIndices || []
          })))
        }

        // Set products (quoteItems)
        if (quote.quoteItems && quote.quoteItems.length > 0) {
          setSelectedProducts(quote.quoteItems.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            packagingSelections: item.packagingId ? [{ packagingId: item.packagingId, quantity: item.packagingQty || 1 }] : [],
            packagingId: item.packagingId,
            packagingQty: item.packagingQty,
            notes: item.notes
          })))
        }

        // Set delivery
        setIsDelivery(quote.isDelivery)
        setDeliveryZoneId(quote.deliveryZoneId)
        if (quote.deliveryDistance) {
          setDeliveryDistance(quote.deliveryDistance.toString())
        }
        setDeliveryAddress(quote.deliveryAddress || '')
        setDeliveryContact(quote.deliveryContact || '')
        setDeliveryPhone(quote.deliveryPhone || '')
        if (quote.deliveryTime) {
          // Format datetime for input
          const dt = new Date(quote.deliveryTime)
          setDeliveryTime(dt.toISOString().slice(0, 16))
        }

        // Set topper
        setTopperType(quote.topperType || '')
        setTopperText(quote.topperText || '')
        setCustomTopperFee(quote.customTopperFee?.toString() || '')

        // Set discount
        if (quote.discountType) {
          setDiscountType(quote.discountType)
          setDiscountValue(quote.discountValue?.toString() || '')
        }

        // Set notes and price adjustment
        setNotes(quote.notes || '')
        setPriceAdjustment(quote.priceAdjustment?.toString() || '')

        setIsLoading(false)
        // Mark initial load as complete after a short delay to avoid false positives
        setTimeout(() => setInitialLoadComplete(true), 100)
      } catch (error) {
        console.error('Error fetching quote:', error)
        router.push('/quotes')
      }
    }

    fetchQuote()
  }, [quoteId, router])

  // Track changes after initial load
  useEffect(() => {
    if (initialLoadComplete) {
      setHasUnsavedChanges(true)
    }
  }, [
    customerName, eventDate, tiers, selectedDecorations, selectedProducts,
    isDelivery, deliveryZoneId, deliveryDistance, deliveryAddress,
    topperType, topperText, customTopperFee, discountType, discountValue,
    depositType, depositValue, priceAdjustment, notes, occasion, theme,
    colors, accentColors, budgetMin, budgetMax, desiredServings
  ])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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
    if (isLoading) return

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
            tiers: tiers.filter(t => t.tierSizeId > 0).map(t => ({
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
            products: selectedProducts.map(p => ({
              menuItemId: p.menuItemId,
              quantity: p.quantity || 1,
              // Use packagingSelections if available, fallback to legacy fields
              packagingId: p.packagingSelections?.[0]?.packagingId || p.packagingId || null,
              packagingQty: p.packagingSelections?.[0]?.quantity || p.packagingQty || null,
              notes: p.notes || null
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
        console.error('Cost calculation failed:', error)
      } finally {
        setIsCalculating(false)
      }
    }

    const debounce = setTimeout(calculateCost, 500)
    return () => clearTimeout(debounce)
  }, [isLoading, customerName, selectedCustomer, customerId, eventDate, tiers, selectedDecorations, selectedProducts,
      isDelivery, deliveryZoneId, deliveryDistance, topperType, topperText,
      markupPercent, discountType, discountValue])

  const handleUpdateQuote = async () => {
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

    setIsSaving(true)

    try {
      // Update the quote with tiers and decorations
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id || customerId || null,
          customerName: finalCustomerName,
          eventDate,
          // Event details / intake fields
          desiredServings: desiredServings ? parseInt(desiredServings) : null,
          occasion: occasion || null,
          theme: theme || null,
          colors: colors || null,
          accentColors: accentColors || null,
          budgetMin: budgetMin ? parseFloat(budgetMin) : null,
          budgetMax: budgetMax ? parseFloat(budgetMax) : null,
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
          depositType: depositType === 'default' ? null : depositType,
          depositPercent: depositType === 'PERCENT' && depositValue ? parseFloat(depositValue) / 100 : null,
          depositAmount: depositType === 'FIXED' && depositValue ? parseFloat(depositValue) : null,
          discountType: discountType || null,
          discountValue: discountValue ? parseFloat(discountValue) : null,
          priceAdjustment: priceAdjustment ? parseFloat(priceAdjustment) : null,
          // Include tiers and decorations for full update
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
          products: selectedProducts.map(p => ({
            menuItemId: p.menuItemId,
            quantity: p.quantity || 1,
            // Use packagingSelections if available, fallback to legacy fields
            packagingId: p.packagingSelections?.[0]?.packagingId || p.packagingId || null,
            packagingQty: p.packagingSelections?.[0]?.quantity || p.packagingQty || null,
            notes: p.notes || null
          }))
        })
      })

      if (response.ok) {
        setHasUnsavedChanges(false)
        router.push(`/quotes/${quoteId}`)
      } else {
        const errorData = await response.json()
        alert(`Failed to update quote: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating quote:', error)
      alert('Failed to update quote')
    } finally {
      setIsSaving(false)
    }
  }

  // Tier management
  const addTier = () => {
    const newIndex = Math.max(...tiers.map(t => t.tierIndex), 0) + 1
    setTiers([...tiers, { tierIndex: newIndex, tierSizeId: 0 }])
    // Update decorations with TIER unit to include the new tier
    setSelectedDecorations(selectedDecorations.map(dec => {
      const effectiveUnit = dec.unitOverride || allDecorations?.find(d => d.id === dec.decorationTechniqueId)?.unit
      if (effectiveUnit === 'TIER') {
        const currentTierIndices = dec.tierIndices || []
        return { ...dec, tierIndices: [...currentTierIndices, newIndex] }
      }
      return dec
    }))
  }

  const removeTier = (index: number) => {
    if (tiers.length > 1) {
      const removedTierIndex = tiers[index].tierIndex
      const newTiers = tiers.filter((_, i) => i !== index).map((t, i) => ({ ...t, tierIndex: i + 1 }))
      setTiers(newTiers)
      // Update decorations with TIER unit to remove the deleted tier and reindex
      setSelectedDecorations(selectedDecorations.map(dec => {
        const effectiveUnit = dec.unitOverride || allDecorations?.find(d => d.id === dec.decorationTechniqueId)?.unit
        if (effectiveUnit === 'TIER' && dec.tierIndices) {
          const updatedIndices = dec.tierIndices
            .map(oldTierIndex => {
              const oldPosition = tiers.findIndex(t => t.tierIndex === oldTierIndex)
              if (oldPosition === -1) return null
              if (oldPosition === index) return null
              if (oldPosition < index) return oldTierIndex
              const newPosition = oldPosition - 1
              return newPosition + 1
            })
            .filter((ti): ti is number => ti !== null)
          return { ...dec, tierIndices: updatedIndices.length > 0 ? updatedIndices : [] }
        }
        return dec
      }))
    }
  }

  const updateTier = (index: number, field: keyof TierData, value: any) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  // Decoration management
  const addDecoration = (technique: DecorationTechnique) => {
    const existing = selectedDecorations.find(d => d.decorationTechniqueId === technique.id)
    if (existing) {
      setSelectedDecorations(selectedDecorations.map(d =>
        d.decorationTechniqueId === technique.id
          ? { ...d, quantity: d.quantity + 1 }
          : d
      ))
    } else {
      // If default unit is TIER, initialize with all tiers selected
      const defaultUnit = technique.unit as 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined
      const initialTierIndices = defaultUnit === 'TIER' && tiers.length > 0
        ? tiers.map(t => t.tierIndex).filter(ti => ti > 0)
        : []
      setSelectedDecorations([...selectedDecorations, {
        decorationTechniqueId: technique.id,
        quantity: 1,
        unitOverride: undefined,
        tierIndices: initialTierIndices
      }])
    }
  }

  const removeDecoration = (techniqueId: number) => {
    setSelectedDecorations(selectedDecorations.filter(d => d.decorationTechniqueId !== techniqueId))
  }

  const updateDecorationQuantity = (techniqueId: number, quantity: number) => {
    if (quantity < 1) {
      removeDecoration(techniqueId)
      return
    }
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === techniqueId ? { ...d, quantity } : d
    ))
  }

  const updateDecorationUnit = (techniqueId: number, unitOverride: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined) => {
    setSelectedDecorations(selectedDecorations.map(d => {
      if (d.decorationTechniqueId === techniqueId) {
        // If switching to TIER unit, initialize with all tiers selected
        // If switching away from TIER, clear tierIndices
        const newTierIndices = unitOverride === 'TIER'
          ? (tiers.length > 0 ? tiers.map(t => t.tierIndex).filter(ti => ti > 0) : [])
          : unitOverride === undefined && d.unitOverride === 'TIER'
            ? []
            : d.tierIndices
        return { ...d, unitOverride, tierIndices: newTierIndices }
      }
      return d
    }))
  }

  const updateDecorationTierIndices = (techniqueId: number, tierIndices: number[]) => {
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === techniqueId ? { ...d, tierIndices } : d
    ))
  }

  const toggleDecorationTier = (techniqueId: number, tierIndex: number) => {
    const decoration = selectedDecorations.find(d => d.decorationTechniqueId === techniqueId)
    if (!decoration) return

    const currentTierIndices = decoration.tierIndices || []
    const isCurrentlySelected = currentTierIndices.includes(tierIndex)

    // Prevent unchecking if it's the last selected tier
    if (isCurrentlySelected && currentTierIndices.length === 1) {
      return
    }

    const newTierIndices = isCurrentlySelected
      ? currentTierIndices.filter(ti => ti !== tierIndex)
      : [...currentTierIndices, tierIndex]

    updateDecorationTierIndices(techniqueId, newTierIndices)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Quote {quoteNumber}</h1>
            <p className="text-gray-600 mt-1">Update quote details</p>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  router.push(`/quotes/${quoteId}`)
                }
              } else {
                router.push(`/quotes/${quoteId}`)
              }
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            &larr; Back to Quote
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Customer</h2>
              <div className="space-y-4">
                <div ref={dropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={selectedCustomer?.name || customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value)
                      setCustomerSearch(e.target.value)
                      setSelectedCustomer(null)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Search or enter customer name"
                  />
                  {showCustomerDropdown && customers && customers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {customers.map((customer: Customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setCustomerName(customer.name)
                            setCustomerId(customer.id)
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <div className="font-medium">{customer.name}</div>
                          {customer.email && <div className="text-sm text-gray-500">{customer.email}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="bg-pink-50 p-3 rounded-md">
                    <div className="font-medium">{selectedCustomer.name}</div>
                    {selectedCustomer.email && <div className="text-sm text-gray-600">{selectedCustomer.email}</div>}
                    {selectedCustomer.phone && <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <p className="text-sm text-gray-600 mb-4">Date, occasion, theme, colors, and serving requirements.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">Target number of servings</p>
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
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md"
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
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer"
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
                                &times;
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
                              {isSelected && <span className="text-pink-600">✓</span>}
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
                      className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer"
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
                                &times;
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
                              {isSelected && <span className="text-purple-600">✓</span>}
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
                  type="button"
                  onClick={addTier}
                  className="px-3 py-1 bg-pink-600 text-white rounded-md text-sm hover:bg-pink-700"
                >
                  + Add Tier
                </button>
              </div>

              <div className="space-y-4">
                {tiers.map((tier, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Tier {tier.tierIndex}</h3>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size *
                        </label>
                        <select
                          value={tier.tierSizeId}
                          onChange={(e) => updateTier(index, 'tierSizeId', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value={0}>Select size...</option>
                          {tierSizes?.map(size => (
                            <option key={size.id} value={size.id}>
                              {size.name} ({size.servings} servings)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batter Recipe
                        </label>
                        <select
                          value={tier.batterRecipeId || ''}
                          onChange={(e) => updateTier(index, 'batterRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select recipe...</option>
                          {batterRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.batterRecipeId && (
                          <select
                            value={tier.flavor || ''}
                            onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
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
                          Filling Recipe
                        </label>
                        <select
                          value={tier.fillingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'fillingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select recipe...</option>
                          {fillingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.fillingRecipeId && (
                          <select
                            value={tier.filling || ''}
                            onChange={(e) => updateTier(index, 'filling', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
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
                          Frosting Recipe
                        </label>
                        <select
                          value={tier.frostingRecipeId || ''}
                          onChange={(e) => updateTier(index, 'frostingRecipeId', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select recipe...</option>
                          {frostingRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                          ))}
                        </select>
                        {!tier.frostingRecipeId && (
                          <select
                            value={tier.finishType || ''}
                            onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Or select finish...</option>
                            {fieldOptions?.cakeSurface?.map(opt => (
                              <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Selecting recipes ensures accurate ingredient and labor costing.
                    If a recipe isn&apos;t available, use the flavor/filling/finish dropdowns as fallback.
                  </p>
                </div>
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
                <button
                  type="button"
                  onClick={() => setShowDecorationModal(true)}
                  className="px-3 py-1 bg-pink-600 text-white rounded-md text-sm hover:bg-pink-700"
                >
                  + Add Decoration
                </button>
              </div>

              {selectedDecorations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No decorations added</p>
              ) : (
                <div className="space-y-3">
                  {selectedDecorations.map(dec => {
                    const technique = allDecorations?.find(d => d.id === dec.decorationTechniqueId)
                    if (!technique) return null
                    const effectiveUnit = dec.unitOverride || technique.unit
                    return (
                      <div key={dec.decorationTechniqueId} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-medium">{technique.name}</span>
                            <span className="text-gray-500 text-sm ml-2">({technique.category})</span>
                            {dec.unitOverride && (
                              <span className="ml-2 text-xs text-blue-600 italic">
                                (Unit: {dec.unitOverride.toLowerCase()}, default: {technique.unit.toLowerCase()})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDecoration(dec.decorationTechniqueId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
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
                                type="button"
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
                        {effectiveUnit === 'TIER' && (
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
                                  <p className="text-xs text-red-500 mt-2">Please select at least one tier</p>
                                )}
                                {dec.tierIndices && dec.tierIndices.length === 1 && (
                                  <p className="text-xs text-amber-600 mt-2">At least one tier must remain selected</p>
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

              {/* Est. Decoration Materials Total */}
              {selectedDecorations.length > 0 && (
                <p className="text-sm text-gray-600 text-right">
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
                  <div className="space-y-4">
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

          {/* Pricing Sidebar */}
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

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">${costing.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Calculated Price:</span>
                      <span className="text-gray-600">${costing.finalPrice.toFixed(2)}</span>
                    </div>

                    {/* Price Adjustment */}
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Adjust Price:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const rounded = Math.floor(costing.finalPrice)
                              setPriceAdjustment((rounded - costing.finalPrice).toFixed(2))
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            title="Round down"
                          >
                            ↓ Round
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const rounded = Math.ceil(costing.finalPrice)
                              setPriceAdjustment((rounded - costing.finalPrice).toFixed(2))
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            title="Round up"
                          >
                            ↑ Round
                          </button>
                          <button
                            type="button"
                            onClick={() => setPriceAdjustment('')}
                            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            title="Clear adjustment"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={priceAdjustment}
                          onChange={(e) => setPriceAdjustment(e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-500">(+/-)</span>
                      </div>
                      {priceAdjustment && parseFloat(priceAdjustment) !== 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {parseFloat(priceAdjustment) > 0 ? 'Adding' : 'Subtracting'} ${Math.abs(parseFloat(priceAdjustment)).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-lg font-bold mt-2">
                      <span>Customer Price:</span>
                      <span className="text-pink-600">
                        ${(costing.finalPrice + (parseFloat(priceAdjustment) || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Per Serving:</span>
                      <span>${((costing.finalPrice + (parseFloat(priceAdjustment) || 0)) / costing.totalServings).toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Servings: <span className="font-medium">{costing.totalServings}</span>
                    </div>
                  </div>

                  {/* Deposit Options */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Deposit Required</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setDepositType('default'); setDepositValue(''); }}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                            depositType === 'default'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Default ({settings?.DefaultDepositPercent ? (parseFloat(settings.DefaultDepositPercent) * 100).toFixed(0) : 50}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositType('PERCENT')}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                            depositType === 'PERCENT'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Custom %
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositType('FIXED')}
                          className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                            depositType === 'FIXED'
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Fixed $
                        </button>
                      </div>
                      {(depositType === 'PERCENT' || depositType === 'FIXED') && (
                        <div className="flex items-center gap-2">
                          {depositType === 'FIXED' && <span className="text-sm text-gray-600">$</span>}
                          <input
                            type="number"
                            min="0"
                            max={depositType === 'PERCENT' ? 100 : undefined}
                            step={depositType === 'PERCENT' ? 5 : 0.01}
                            value={depositValue}
                            onChange={(e) => setDepositValue(e.target.value)}
                            placeholder={depositType === 'PERCENT' ? '50' : '100.00'}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                          {depositType === 'PERCENT' && <span className="text-sm text-gray-600">%</span>}
                        </div>
                      )}
                      <div className="bg-pink-50 rounded-lg p-3 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-pink-800">Deposit Amount:</span>
                          <span className="font-bold text-pink-600">
                            ${depositType === 'FIXED' && depositValue
                              ? parseFloat(depositValue).toFixed(2)
                              : ((costing.finalPrice + (parseFloat(priceAdjustment) || 0)) * (
                                  depositType === 'PERCENT' && depositValue ? parseFloat(depositValue) / 100 :
                                  (settings?.DefaultDepositPercent ? parseFloat(settings.DefaultDepositPercent) : 0.5)
                                )).toFixed(2)
                            }
                          </span>
                        </div>
                        <div className="text-xs text-pink-700 mt-1">
                          {depositType === 'FIXED' && depositValue
                            ? `$${parseFloat(depositValue).toFixed(2)} fixed deposit`
                            : depositType === 'PERCENT' && depositValue
                              ? `${depositValue}% of total`
                              : `${settings?.DefaultDepositPercent ? (parseFloat(settings.DefaultDepositPercent) * 100).toFixed(0) : 50}% of total`
                          } to confirm order
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateQuote}
                    disabled={isSaving}
                    className="w-full mt-6 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Update Quote'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Fill in details to see pricing</p>
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
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search decorations..."
                  value={decorationSearch}
                  onChange={(e) => setDecorationSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={decorationCategoryFilter}
                  onChange={(e) => setDecorationCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Categories</option>
                  {decorationCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredDecorations.map(dec => {
                  const isSelected = selectedDecorations.some(d => d.decorationTechniqueId === dec.id)
                  return (
                    <button
                      key={dec.id}
                      onClick={() => addDecoration(dec)}
                      className={`p-4 border rounded-lg text-left hover:border-pink-500 transition-colors ${
                        isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{dec.name}</div>
                      <div className="text-sm text-gray-500">{dec.category}</div>
                      <div className="text-sm text-pink-600 mt-1">${parseFloat(dec.defaultCostPerUnit).toFixed(2)}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => setShowDecorationModal(false)}
                className="w-full px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Done ({selectedDecorations.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
