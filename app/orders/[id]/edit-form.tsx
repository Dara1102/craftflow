'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { updateOrder, deleteOrder } from '@/app/actions/orders'
import { OrderStatus, CakeType, DiscountType } from '@prisma/client'
import useSWR from 'swr'
import ProductSelector from '@/app/components/ProductSelector'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface TierSize {
  id: number
  name: string
  servings: number
  shape?: string
}

interface Recipe {
  id: number
  name: string
  type: string
  yieldDescription: string
}

interface CakeTier {
  id: number
  tierSizeId: number
  batterRecipeId: number | null
  fillingRecipeId: number | null
  frostingRecipeId: number | null
  flavor: string | null
  filling: string | null
  finishType: string | null
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
  unit: 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
  baseCakeSize: string | null
  skillLevel?: string
}

interface OrderDecoration {
  id: number
  decorationTechniqueId: number
  quantity: number
  notes: string | null
  unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | null
  tierIndices?: number[]
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

// TierCost matches what /api/tier-costs returns (assembly info only, no recipe costs)
interface TierCost {
  tierSizeId: number
  name: string
  shape: string
  servings: number
  volumeMl: number | null
  // Dimensions for decoration size scaling
  diameterCm: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  assemblyMinutes: number
  assemblyRole: string | null
  assemblyRate: number | null
  assemblyLaborCost: number
}

interface LaborRole {
  id: number
  name: string
  hourlyRate: number
}

// Costing result from the centralized costing API
interface CostingResult {
  totalServings: number
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  productCost: number
  packagingCost: number
  topperCost: number
  deliveryCost: number
  baseLaborCost: number
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
  delivery?: {
    zoneName: string
    baseFee: number
    perMileFee?: number
    estimatedDistance?: number
  }
  discount?: {
    type: string
    value: number
    reason?: string
  }
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
  desiredServings: number | null
  theme: string | null
  occasion: string | null
  colors: string | null
  accentColors: string | null
  isDelivery: boolean
  pickupTime: Date | null
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
  orderItems?: OrderItem[]
  orderPackaging?: OrderPackagingItem[]
}

interface OrderPackagingItem {
  id: number
  packagingId: number
  quantity: number
  notes: string | null
  packaging: {
    id: number
    name: string
    type: string
    costPerUnit: number
  }
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
  unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
  tierIndices?: number[]
}

interface OrderItem {
  id: number
  menuItemId: number
  quantity: number
  packagingId: number | null
  packagingQty: number | null
  notes: string | null
  menuItem: {
    id: number
    name: string
    menuPrice: number
    productType: { name: string }
  }
  packagingSelections?: Array<{
    packagingId: number
    quantity: number
  }>
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
  const [desiredServings, setDesiredServings] = useState(order.desiredServings?.toString() || '')

  // Event details
  const [theme, setTheme] = useState(order.theme || '')
  const [occasion, setOccasion] = useState(order.occasion || '')
  const [colors, setColors] = useState(order.colors || '')
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [accentColors, setAccentColors] = useState(order.accentColors || '')
  const [showAccentColorDropdown, setShowAccentColorDropdown] = useState(false)

  // Delivery/Pickup details
  const [isDelivery, setIsDelivery] = useState(order.isDelivery)
  const [pickupTime, setPickupTime] = useState(
    order.pickupTime ? new Date(order.pickupTime).toISOString().slice(0, 16) : ''
  )
  const [deliveryZoneId, setDeliveryZoneId] = useState<number | null>(order.deliveryZoneId)
  const [deliveryDistance, setDeliveryDistance] = useState(order.deliveryDistance?.toString() || '')
  const [deliveryContact, setDeliveryContact] = useState(order.deliveryContact || '')
  const [deliveryPhone, setDeliveryPhone] = useState(order.deliveryPhone || '')
  const [deliveryTime, setDeliveryTime] = useState(
    order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : ''
  )
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '')
  const [deliveryStartPointId, setDeliveryStartPointId] = useState<number | null>(null)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<PlaceResult[]>([])
  const [showVenueDropdown, setShowVenueDropdown] = useState(false)
  const [selectedVenueCoords, setSelectedVenueCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Labor
  const [estimatedHours, setEstimatedHours] = useState(order.estimatedHours.toString())
  const [bakerHours, setBakerHours] = useState(order.bakerHours?.toString() || '')
  const [assistantHours, setAssistantHours] = useState(order.assistantHours?.toString() || '')
  const [hoursManuallySet, setHoursManuallySet] = useState(true) // Start true for edit mode

  // Tiers
  const [tiers, setTiers] = useState(
    order.cakeTiers.map(tier => ({
      tierSizeId: tier.tierSizeId,
      batterRecipeId: tier.batterRecipeId,
      fillingRecipeId: tier.fillingRecipeId,
      frostingRecipeId: tier.frostingRecipeId,
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
      notes: dec.notes || undefined,
      unitOverride: dec.unitOverride || undefined,
      tierIndices: dec.tierIndices && dec.tierIndices.length > 0 ? dec.tierIndices : undefined
    }))
  )
  const [decorationSearch, setDecorationSearch] = useState('')

  // Products (menu items like cupcakes, cake pops)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    menuItemId: number
    quantity: number
    packagingSelections: Array<{ packagingId: number; quantity: number }>
    notes?: string
  }>>(
    (order.orderItems || []).map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      // Use packagingSelections if available, otherwise convert legacy single packaging
      packagingSelections: item.packagingSelections && item.packagingSelections.length > 0
        ? item.packagingSelections
        : item.packagingId
          ? [{ packagingId: item.packagingId, quantity: item.packagingQty || 1 }]
          : [],
      notes: item.notes || undefined
    }))
  )

  // Order-level packaging (standalone packaging not tied to products)
  const [orderLevelPackaging, setOrderLevelPackaging] = useState<Array<{
    packagingId: number
    quantity: number
    notes?: string
  }>>(
    (order.orderPackaging || []).map(op => ({
      packagingId: op.packagingId,
      quantity: op.quantity,
      notes: op.notes || undefined
    }))
  )

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
  const accentColorDropdownRef = useRef<HTMLDivElement>(null)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch field options, decorations list, delivery zones, and recipes
  const { data: fieldOptions } = useSWR<FieldOptions>('/api/field-options', fetcher)
  const { data: decorations } = useSWR<DecorationTechnique[]>('/api/decorations', fetcher)
  const { data: deliveryZones } = useSWR<DeliveryZone[]>('/api/delivery-zones', fetcher)
  const { data: deliveryStartPoints } = useSWR<DeliveryStartPoint[]>('/api/delivery-start-points', fetcher)
  const { data: tierCosts } = useSWR<TierCost[]>('/api/tier-costs', fetcher)
  const { data: laborRoles } = useSWR<LaborRole[]>('/api/labor-roles', fetcher)
  const { data: recipesData } = useSWR<{ recipes: Recipe[] }>('/api/recipes', fetcher)
  const recipes = recipesData?.recipes
  const { data: packaging } = useSWR<Array<{
    id: number
    name: string
    type: string
    costPerUnit: number
  }>>('/api/packaging', fetcher)
  const { data: menuItems } = useSWR<Array<{
    id: number
    name: string
    menuPrice: number
    productType: { id: number; name: string }
  }>>('/api/menu-items', fetcher)

  // Filter recipes by type
  const batterRecipes = recipes?.filter(r => r.type === 'BATTER') || []
  const fillingRecipes = recipes?.filter(r => r.type === 'FILLING') || []
  const frostingRecipes = recipes?.filter(r => r.type === 'FROSTING') || []

  // Fetch full costing from centralized costing API
  const { data: costing, mutate: mutateCosting, isLoading: costingLoading } = useSWR<CostingResult>(
    `/api/orders/${order.id}/costing`,
    fetcher
  )

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
          if (tier.finishType?.toLowerCase().includes('fondant')) {
            hours += 2
          } else if (tier.finishType?.toLowerCase().includes('buttercream')) {
            hours += 1
          }
        }
      })
      hours = Math.max(2, Math.round(hours * 2) / 2)
      setEstimatedHours(hours.toString())
    }
  }, [tiers, tierSizes, hoursManuallySet])

  const addTier = () => {
    setTiers([...tiers, {
      tierSizeId: 0,
      batterRecipeId: null,
      fillingRecipeId: null,
      frostingRecipeId: null,
      flavor: '',
      filling: '',
      finishType: ''
    }])
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
    // Get the decoration's default unit
    const decoration = decorations?.find(d => d.id === decorationId)
    const defaultUnit = decoration?.unit as 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined
    // If default unit is TIER, initialize with all tier indices
    const initialTierIndices = defaultUnit === 'TIER'
      ? tiers.map((_, i) => i + 1)
      : undefined
    setSelectedDecorations([...selectedDecorations, {
      decorationTechniqueId: decorationId,
      quantity: 1,
      unitOverride: undefined,
      tierIndices: initialTierIndices
    }])
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

  const updateDecorationUnit = (decorationId: number, unit: 'SINGLE' | 'CAKE' | 'TIER' | 'SET' | undefined) => {
    setSelectedDecorations(selectedDecorations.map(d => {
      if (d.decorationTechniqueId !== decorationId) return d
      // If changing to TIER, initialize tierIndices with all tiers
      const newTierIndices = unit === 'TIER' && !d.tierIndices
        ? tiers.map((_, i) => i + 1)
        : d.tierIndices
      return { ...d, unitOverride: unit, tierIndices: unit === 'TIER' ? newTierIndices : undefined }
    }))
  }

  const updateDecorationTierIndices = (decorationId: number, tierIndices: number[]) => {
    setSelectedDecorations(selectedDecorations.map(d =>
      d.decorationTechniqueId === decorationId ? { ...d, tierIndices } : d
    ))
  }

  // Calculate decoration size multiplier based on tier dimensions and baseCakeSize
  const calculateDecorationSizeMultiplier = (
    tierCostInfo: TierCost | undefined,
    baseCakeSize: string | null
  ): number => {
    if (!baseCakeSize || !tierCostInfo) return 1.0

    // Parse base cake size (e.g., "6\" round" -> 6 inches)
    const baseSizeMatch = baseCakeSize.match(/(\d+(?:\.\d+)?)\s*["']?\s*(?:inch|in|"|')?/i)
    if (!baseSizeMatch) return 1.0

    const baseSizeInches = parseFloat(baseSizeMatch[1])
    const baseSizeCm = baseSizeInches * 2.54

    // For round cakes, compare surface areas
    if (tierCostInfo.shape === 'Round' && tierCostInfo.diameterCm) {
      const tierRadiusCm = tierCostInfo.diameterCm / 2
      const baseRadiusCm = baseSizeCm / 2
      const tierArea = Math.PI * tierRadiusCm * tierRadiusCm
      const baseArea = Math.PI * baseRadiusCm * baseRadiusCm
      if (baseArea > 0) {
        return Math.round((tierArea / baseArea) * 100) / 100
      }
    }

    // For rectangular cakes
    if ((tierCostInfo.shape === 'Sheet' || tierCostInfo.shape === 'Rectangle') &&
        tierCostInfo.lengthCm && tierCostInfo.widthCm) {
      const tierArea = tierCostInfo.lengthCm * tierCostInfo.widthCm
      const baseArea = baseSizeCm * baseSizeCm
      if (baseArea > 0) {
        return Math.round((tierArea / baseArea) * 100) / 100
      }
    }

    return 1.0
  }

  // Calculate the scaled cost for a decoration based on unit type and tier sizes
  const calculateDecorationScaledCost = (
    decoration: SelectedDecoration,
    technique: DecorationTechnique | undefined
  ): number => {
    if (!technique) return 0

    const effectiveUnit = decoration.unitOverride || technique.unit
    const baseCost = Number(technique.defaultCostPerUnit)
    let quantity = decoration.quantity

    // SINGLE: No size scaling
    if (effectiveUnit === 'SINGLE' || effectiveUnit === 'SET') {
      return baseCost * quantity
    }

    // CAKE: Scale by total surface area of all tiers
    if (effectiveUnit === 'CAKE') {
      if (!technique.baseCakeSize || tiers.length === 0) {
        return baseCost * quantity
      }

      let totalSurfaceMultiplier = 0
      for (const tier of tiers) {
        const tierCostInfo = tierCosts?.find(tc => tc.tierSizeId === tier.tierSizeId)
        if (!tierCostInfo) continue

        // Calculate surface area for this tier
        let tierSurfaceArea = 0
        if (tierCostInfo.shape === 'Round' && tierCostInfo.diameterCm && tierCostInfo.heightCm) {
          const radius = tierCostInfo.diameterCm / 2
          tierSurfaceArea = Math.PI * radius * radius // Top surface
          const circumference = Math.PI * tierCostInfo.diameterCm
          tierSurfaceArea += circumference * tierCostInfo.heightCm // Side surface
        } else if (tierCostInfo.lengthCm && tierCostInfo.widthCm && tierCostInfo.heightCm) {
          tierSurfaceArea = tierCostInfo.lengthCm * tierCostInfo.widthCm // Top surface
          const perimeter = 2 * (tierCostInfo.lengthCm + tierCostInfo.widthCm)
          tierSurfaceArea += perimeter * tierCostInfo.heightCm // Side surface
        }
        totalSurfaceMultiplier += tierSurfaceArea
      }

      // Calculate base surface area
      const baseSizeMatch = technique.baseCakeSize.match(/(\d+)\s*["']?\s*(round|square)?/i)
      if (baseSizeMatch && totalSurfaceMultiplier > 0) {
        const baseDiameter = parseFloat(baseSizeMatch[1]) * 2.54
        const baseRadius = baseDiameter / 2
        let baseSurfaceArea = Math.PI * baseRadius * baseRadius // Top
        const baseCircumference = Math.PI * baseDiameter
        const baseHeight = 10 // Assume 10cm height
        baseSurfaceArea += baseCircumference * baseHeight // Side

        if (baseSurfaceArea > 0) {
          const surfaceMultiplier = totalSurfaceMultiplier / baseSurfaceArea
          quantity = quantity * surfaceMultiplier
        }
      }

      return baseCost * quantity
    }

    // TIER: Scale by specific tiers or all tiers
    if (effectiveUnit === 'TIER') {
      if (!technique.baseCakeSize) {
        return baseCost * quantity
      }

      const tierIndicesToUse = decoration.tierIndices?.length
        ? decoration.tierIndices
        : tiers.map((_, i) => i + 1)

      let totalSizeMultiplier = 0
      let validTiers = 0

      for (const tierIndex of tierIndicesToUse) {
        const tier = tiers[tierIndex - 1]
        if (!tier) continue

        const tierCostInfo = tierCosts?.find(tc => tc.tierSizeId === tier.tierSizeId)
        if (!tierCostInfo) continue

        const sizeMultiplier = calculateDecorationSizeMultiplier(tierCostInfo, technique.baseCakeSize)
        totalSizeMultiplier += sizeMultiplier
        validTiers++
      }

      if (validTiers > 0) {
        const avgSizeMultiplier = totalSizeMultiplier / validTiers
        quantity = quantity * avgSizeMultiplier
      }

      return baseCost * quantity
    }

    return baseCost * quantity
  }

  // Calculate local decoration cost (for live updates in Order Summary)
  const localDecorationCost = useMemo(() => {
    if (!decorations) return 0
    return selectedDecorations.reduce((sum, sd) => {
      const dec = decorations.find(d => d.id === sd.decorationTechniqueId)
      return sum + calculateDecorationScaledCost(sd, dec)
    }, 0)
  }, [selectedDecorations, decorations, tiers, tierCosts])

  // Calculate local product cost (menu items like cupcakes, cake pops)
  const localProductCost = useMemo(() => {
    if (!menuItems) return 0
    return selectedProducts.reduce((sum, sp) => {
      const menuItem = menuItems.find(m => m.id === sp.menuItemId)
      if (!menuItem) return sum
      return sum + (Number(menuItem.menuPrice) * sp.quantity)
    }, 0)
  }, [selectedProducts, menuItems])

  // Calculate local packaging cost (both product packaging and standalone packaging)
  const localPackagingCost = useMemo(() => {
    if (!packaging) return 0

    // Product-level packaging
    const productPackagingCost = selectedProducts.reduce((sum, sp) => {
      return sum + (sp.packagingSelections || []).reduce((packSum, ps) => {
        const pack = packaging.find(p => p.id === ps.packagingId)
        if (!pack) return packSum
        return packSum + (Number(pack.costPerUnit) * ps.quantity)
      }, 0)
    }, 0)

    // Order-level standalone packaging
    const standalonePackagingCost = orderLevelPackaging.reduce((sum, op) => {
      const pack = packaging.find(p => p.id === op.packagingId)
      if (!pack) return sum
      return sum + (Number(pack.costPerUnit) * op.quantity)
    }, 0)

    return productPackagingCost + standalonePackagingCost
  }, [selectedProducts, orderLevelPackaging, packaging])

  // Calculate local topper cost
  const localTopperCost = useMemo(() => {
    const STANDARD_TOPPER_COST = 5 // Base cost for standard toppers
    if (!topperType || topperType === 'none' || topperType === '') {
      return 0
    }
    if (topperType === 'custom' && customTopperFee) {
      return parseFloat(customTopperFee) || 0
    }
    return STANDARD_TOPPER_COST
  }, [topperType, customTopperFee])

  // Create a live costing object that uses local calculations
  const liveCosting = useMemo(() => {
    if (!costing) return null

    // Calculate differences between local and API costs
    const decorationDiff = localDecorationCost - costing.decorationMaterialCost
    const productDiff = localProductCost - (costing.productCost || 0)
    const packagingDiff = localPackagingCost - (costing.packagingCost || 0)
    const topperDiff = localTopperCost - (costing.topperCost || 0)
    const totalDiff = decorationDiff + productDiff + packagingDiff + topperDiff

    // Adjust totals based on the differences
    const newTotalCost = costing.totalCost + totalDiff
    const newSuggestedPrice = costing.suggestedPrice + (totalDiff * (1 + costing.markupPercent))
    const newFinalPrice = newSuggestedPrice - costing.discountAmount + costing.deliveryCost

    const roundedSuggestedPrice = Math.round(newSuggestedPrice * 100) / 100
    const servings = costing.totalServings || 1

    return {
      ...costing,
      decorationMaterialCost: Math.round(localDecorationCost * 100) / 100,
      productCost: Math.round(localProductCost * 100) / 100,
      packagingCost: Math.round(localPackagingCost * 100) / 100,
      topperCost: Math.round(localTopperCost * 100) / 100,
      totalCost: Math.round(newTotalCost * 100) / 100,
      suggestedPrice: roundedSuggestedPrice,
      finalPrice: Math.round(newFinalPrice * 100) / 100,
      suggestedPricePerServing: Math.round((roundedSuggestedPrice / servings) * 100) / 100,
    }
  }, [costing, localDecorationCost, localProductCost, localPackagingCost, localTopperCost])

  const filteredDecorations = decorations?.filter(d =>
    decorationSearch.length >= 2 &&
    (d.name.toLowerCase().includes(decorationSearch.toLowerCase()) ||
     d.category.toLowerCase().includes(decorationSearch.toLowerCase()) ||
     d.subcategory.toLowerCase().includes(decorationSearch.toLowerCase()))
  ) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      alert('Please select a customer')
      return
    }

    // Valid tier requires: tierSize + (recipes OR legacy fields)
    const validTiers = tiers.filter(t =>
      t.tierSizeId > 0 &&
      (t.batterRecipeId || t.flavor) &&
      (t.frostingRecipeId || t.finishType)
    )
    if (validTiers.length === 0) {
      alert('Please add at least one complete tier with size and recipes (or flavor/finish)')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await updateOrder(order.id, {
        // If customer has id 0, it's a legacy text-only name - pass as customerName
        customerId: selectedCustomer.id > 0 ? selectedCustomer.id : undefined,
        customerName: selectedCustomer.id === 0 ? selectedCustomer.name : undefined,
        eventDate,
        cakeType: cakeType || undefined,
        size,
        desiredServings: desiredServings ? parseInt(desiredServings) : undefined,
        theme: theme || undefined,
        occasion: occasion || undefined,
        colors: colors || undefined,
        accentColors: accentColors || undefined,
        isDelivery,
        pickupTime: !isDelivery && pickupTime ? pickupTime : undefined,
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
          tierSizeId: parseInt(t.tierSizeId.toString()),
          batterRecipeId: t.batterRecipeId,
          fillingRecipeId: t.fillingRecipeId,
          frostingRecipeId: t.frostingRecipeId,
          flavor: t.flavor || '',
          filling: t.filling || '',
          finishType: t.finishType || '',
        })),
        decorations: selectedDecorations,
        products: selectedProducts.map(p => ({
          menuItemId: p.menuItemId,
          quantity: p.quantity,
          packagingSelections: p.packagingSelections,
          notes: p.notes || null
        })),
        orderPackaging: orderLevelPackaging.map(op => ({
          packagingId: op.packagingId,
          quantity: op.quantity,
          notes: op.notes || null
        }))
      })
      setSaveMessage('Order saved successfully!')
      // Refresh the costing data after save
      mutateCosting()
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

              <div className="col-span-6 sm:col-span-3" ref={accentColorDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accent Colors
                </label>
                <div className="relative">
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

      {/* Delivery/Pickup Section */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Delivery / Pickup</h3>
            <p className="mt-1 text-sm text-gray-600">Choose delivery or customer pickup.</p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
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
                <div className="grid grid-cols-6 gap-4 pt-4 border-t border-gray-200">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700">
                      Pickup Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="pickupTime"
                      name="pickupTime"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  <div className="col-span-6">
                    <p className="text-sm text-gray-500">
                      Customer will pick up the order at your bakery location.
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Details */}
              {isDelivery && (
                <div className="grid grid-cols-6 gap-4 pt-4 border-t border-gray-200">
                  {/* Delivery Zone */}
                  <div className="col-span-6 sm:col-span-3">
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

                  {/* Delivery Start Point */}
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="deliveryStartPoint" className="block text-sm font-medium text-gray-700">
                      Delivery Start Point
                    </label>
                    <select
                      id="deliveryStartPoint"
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
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select start point...</option>
                      {deliveryStartPoints?.map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
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
                        name="deliveryDistance"
                        id="deliveryDistance"
                        step="0.1"
                        min="0"
                        value={deliveryDistance}
                        onChange={(e) => setDeliveryDistance(e.target.value)}
                        placeholder="0.0"
                        className="focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-12"
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
                    {deliveryZoneId && deliveryDistance && Array.isArray(deliveryZones) && (() => {
                      const zone = deliveryZones.find(z => z.id === deliveryZoneId)
                      if (zone?.perMileFee) {
                        const dist = parseFloat(deliveryDistance) || 0
                        const totalFee = (zone.baseFee || 0) + ((zone.perMileFee || 0) * dist)
                        return (
                          <p className="mt-1 text-xs text-gray-500">
                            Est. fee: ${totalFee.toFixed(2)}
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>

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
                      placeholder="Who to contact"
                    />
                  </div>

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
                  <div className="col-span-2">
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

                  {/* Recipe Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Batter Recipe
                    </label>
                    <select
                      value={tier.batterRecipeId || ''}
                      onChange={(e) => {
                        const recipeId = e.target.value ? parseInt(e.target.value) : null
                        updateTier(index, 'batterRecipeId', recipeId)
                        // Auto-set flavor from recipe name
                        const recipe = batterRecipes.find(r => r.id === recipeId)
                        if (recipe) {
                          updateTier(index, 'flavor', recipe.name)
                        }
                      }}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select recipe...</option>
                      {batterRecipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                    {!tier.batterRecipeId && (
                      <select
                        value={tier.flavor || ''}
                        onChange={(e) => updateTier(index, 'flavor', e.target.value)}
                        className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      >
                        <option value="">Or select flavor...</option>
                        {tier.flavor && !fieldOptions?.flavor?.some(opt => opt.name === tier.flavor) && (
                          <option value={tier.flavor}>{tier.flavor}</option>
                        )}
                        {fieldOptions?.flavor?.map(opt => (
                          <option key={opt.id} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Filling Recipe
                    </label>
                    <select
                      value={tier.fillingRecipeId || ''}
                      onChange={(e) => {
                        const recipeId = e.target.value ? parseInt(e.target.value) : null
                        updateTier(index, 'fillingRecipeId', recipeId)
                        // Auto-set filling from recipe name
                        const recipe = fillingRecipes.find(r => r.id === recipeId)
                        if (recipe) {
                          updateTier(index, 'filling', recipe.name)
                        }
                      }}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select recipe...</option>
                      {fillingRecipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                    {!tier.fillingRecipeId && (
                      <select
                        value={tier.filling || ''}
                        onChange={(e) => updateTier(index, 'filling', e.target.value)}
                        className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      >
                        <option value="">Or select filling...</option>
                        {tier.filling && !fieldOptions?.filling?.some(opt => opt.name === tier.filling) && (
                          <option value={tier.filling}>{tier.filling}</option>
                        )}
                        {fieldOptions?.filling?.map(opt => (
                          <option key={opt.id} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Frosting Recipe
                    </label>
                    <select
                      value={tier.frostingRecipeId || ''}
                      onChange={(e) => {
                        const recipeId = e.target.value ? parseInt(e.target.value) : null
                        updateTier(index, 'frostingRecipeId', recipeId)
                        // Auto-set finishType from recipe name
                        const recipe = frostingRecipes.find(r => r.id === recipeId)
                        if (recipe) {
                          updateTier(index, 'finishType', recipe.name)
                        }
                      }}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    >
                      <option value="">Select recipe...</option>
                      {frostingRecipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                    {!tier.frostingRecipeId && (
                      <select
                        value={tier.finishType || ''}
                        onChange={(e) => updateTier(index, 'finishType', e.target.value)}
                        className="mt-2 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      >
                        <option value="">Or select finish...</option>
                        {tier.finishType && !fieldOptions?.cakeSurface?.some(opt => opt.name === tier.finishType) && (
                          <option value={tier.finishType}>{tier.finishType}</option>
                        )}
                        {fieldOptions?.cakeSurface?.map(opt => (
                          <option key={opt.id} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    )}
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

      {/* Additional Products */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Additional Products</h3>
            <p className="mt-1 text-sm text-gray-600">
              Add cupcakes, cake pops, cookies, and other menu items to this order.
            </p>
            <Link
              href="/admin/menu"
              target="_blank"
              className="mt-2 inline-flex items-center text-sm text-pink-600 hover:text-pink-700"
            >
              Manage menu items
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
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

      {/* Additional Packaging (standalone, not tied to products) */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Additional Packaging</h3>
            <p className="mt-1 text-sm text-gray-600">
              Add standalone packaging like cake boxes, boards, or wraps that are not tied to specific products.
            </p>
            <Link
              href="/admin/menu/packaging"
              target="_blank"
              className="mt-2 inline-flex items-center text-sm text-pink-600 hover:text-pink-700"
            >
              Manage packaging
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
            {/* Add packaging dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Add Packaging</label>
              <select
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                value=""
                onChange={(e) => {
                  const packagingId = parseInt(e.target.value)
                  if (packagingId && !orderLevelPackaging.some(p => p.packagingId === packagingId)) {
                    setOrderLevelPackaging([...orderLevelPackaging, { packagingId, quantity: 1 }])
                  }
                }}
              >
                <option value="">Select packaging to add...</option>
                {packaging?.filter(p => !orderLevelPackaging.some(op => op.packagingId === p.id)).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type}) - ${Number(p.costPerUnit).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected packaging list */}
            {orderLevelPackaging.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Selected Packaging</label>
                {orderLevelPackaging.map((op) => {
                  const pkg = packaging?.find(p => p.id === op.packagingId)
                  if (!pkg) return null
                  return (
                    <div key={op.packagingId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{pkg.name}</p>
                        <p className="text-sm text-gray-500">{pkg.type} &bull; ${Number(pkg.costPerUnit).toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <label className="sr-only">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={op.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1
                              setOrderLevelPackaging(orderLevelPackaging.map(item =>
                                item.packagingId === op.packagingId
                                  ? { ...item, quantity: newQty }
                                  : item
                              ))
                            }}
                            className="w-16 text-center border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderLevelPackaging(orderLevelPackaging.filter(item => item.packagingId !== op.packagingId))}
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
                  Est. Packaging Cost: <span className="font-medium text-pink-600">
                    ${orderLevelPackaging.reduce((sum, op) => {
                      const pkg = packaging?.find(p => p.id === op.packagingId)
                      return sum + ((Number(pkg?.costPerUnit) || 0) * op.quantity)
                    }, 0).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
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
                  const effectiveUnit = sd.unitOverride || dec.unit
                  return (
                    <div key={sd.decorationTechniqueId} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{dec.name}</span>
                          <span className="text-gray-500 text-sm ml-2">({dec.category})</span>
                          {sd.unitOverride && (
                            <span className="ml-2 text-xs text-blue-600 italic">
                              (Unit: {sd.unitOverride.toLowerCase()}, default: {dec.unit.toLowerCase()})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDecoration(sd.decorationTechniqueId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="text-sm text-gray-600 flex items-center gap-2">
                          <span>Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={sd.quantity}
                            onChange={(e) => updateDecorationQuantity(sd.decorationTechniqueId, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </label>
                        <label className="text-sm text-gray-600 flex items-center gap-2">
                          <span>Unit:</span>
                          <select
                            value={sd.unitOverride || dec.unit}
                            onChange={(e) => {
                              const value = e.target.value
                              updateDecorationUnit(
                                sd.decorationTechniqueId,
                                value === dec.unit ? undefined : value as 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
                              )
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="SINGLE">Single</option>
                            <option value="CAKE">Cake</option>
                            <option value="TIER">Tier</option>
                            <option value="SET">Set</option>
                          </select>
                          {sd.unitOverride && (
                            <button
                              type="button"
                              onClick={() => updateDecorationUnit(sd.decorationTechniqueId, undefined)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                              title="Reset to default"
                            >
                              Reset
                            </button>
                          )}
                        </label>
                        <span className="text-sm text-gray-500">${Number(dec.defaultCostPerUnit).toFixed(2)}/unit</span>
                        <span className="text-sm font-medium text-pink-600">
                          = ${calculateDecorationScaledCost(sd, dec).toFixed(2)}
                        </span>
                        <span className="relative group">
                          <span className="text-xs text-gray-400 cursor-help underline decoration-dotted">(materials)</span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            Material cost = base cost × qty × size multiplier
                          </span>
                        </span>
                      </div>
                      {/* Tier selection for TIER unit */}
                      {effectiveUnit === 'TIER' && tiers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-600">Apply to tiers:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {tiers.map((tier, idx) => {
                              const tierIndex = idx + 1
                              const isSelected = sd.tierIndices?.includes(tierIndex) ?? false
                              const tierSize = tierSizes.find(ts => ts.id === tier.tierSizeId)
                              return (
                                <label key={tierIndex} className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newIndices = e.target.checked
                                        ? [...(sd.tierIndices || []), tierIndex]
                                        : (sd.tierIndices || []).filter(i => i !== tierIndex)
                                      updateDecorationTierIndices(sd.decorationTechniqueId, newIndices)
                                    }}
                                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                  />
                                  <span className="ml-1 text-xs text-gray-700">
                                    Tier {tierIndex} ({tierSize?.name || 'Unknown'})
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <p className="text-sm text-gray-600 text-right">
                  Est. Decoration Materials: <span className="font-medium text-pink-600">
                    ${selectedDecorations.reduce((sum, sd) => {
                      const dec = decorations?.find(d => d.id === sd.decorationTechniqueId)
                      return sum + calculateDecorationScaledCost(sd, dec)
                    }, 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">(size-scaled)</span>
                </p>

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
            <p className="mt-1 text-sm text-gray-600">Auto-calculated labor from recipes, assembly, and decorations.</p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Auto-calculated labor preview */}
              <div className="col-span-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Auto-Calculated Labor (from tier assembly)</h4>
                {(() => {
                  // Calculate tier-based assembly labor
                  // Note: Batter/frosting labor requires full costing calculation with recipes
                  let totalAssemblyMinutes = 0
                  let totalAssemblyLaborCost = 0

                  const validTiers = tiers.filter(t => t.tierSizeId > 0)
                  const tierCostsArr = Array.isArray(tierCosts) ? tierCosts : []
                  validTiers.forEach(tier => {
                    const tierCost = tierCostsArr.find(tc => tc.tierSizeId === tier.tierSizeId)
                    if (tierCost) {
                      totalAssemblyMinutes += tierCost.assemblyMinutes || 0
                      totalAssemblyLaborCost += tierCost.assemblyLaborCost || 0
                    }
                  })

                  const totalAutoHours = totalAssemblyMinutes / 60

                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Assembly Time</p>
                          <p className="font-medium text-blue-800">{Math.round(totalAssemblyMinutes)} min ({totalAutoHours.toFixed(1)} hrs)</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Assembly Cost</p>
                          <p className="font-medium text-blue-800">${totalAssemblyLaborCost.toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 pt-2 border-t border-blue-200">
                        Recipe labor (batter, filling, frosting) is calculated in the full costing report.
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Manual adjustment hours */}
              <div className="col-span-6">
                <p className="text-xs text-gray-500 mb-2">
                  <strong>Additional manual labor</strong> (for tasks not covered by recipes/assembly/decorations):
                </p>
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="bakerHours" className="block text-sm font-medium text-gray-700">
                  Extra Baker Hours
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
                <p className="mt-1 text-xs text-gray-500">Extra time beyond auto-calculated</p>
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="assistantHours" className="block text-sm font-medium text-gray-700">
                  Extra Assistant Hours
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
                <p className="mt-1 text-xs text-gray-500">Packaging, delivery prep, etc.</p>
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
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50"
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

            {/* Costing Breakdown - Full Costing from API */}
            <div className="bg-white rounded-lg p-4 border border-pink-100">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">Order Costing</h4>
                <button
                  type="button"
                  onClick={() => mutateCosting()}
                  className="text-xs text-pink-600 hover:text-pink-800"
                  disabled={costingLoading}
                >
                  {costingLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {costingLoading ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Loading costing...
                </div>
              ) : liveCosting ? (
                <div className="space-y-2 text-sm">
                  {/* Cost Breakdown */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingredients</span>
                    <span className="text-gray-900">${liveCosting.ingredientCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Decorations (materials)</span>
                    <span className="text-gray-900">${liveCosting.decorationMaterialCost.toFixed(2)}</span>
                  </div>
                  {liveCosting.topperCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Topper</span>
                      <span className="text-gray-900">${liveCosting.topperCost.toFixed(2)}</span>
                    </div>
                  )}
                  {liveCosting.productCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Products</span>
                      <span className="text-gray-900">${liveCosting.productCost.toFixed(2)}</span>
                    </div>
                  )}
                  {liveCosting.packagingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Packaging</span>
                      <span className="text-gray-900">${liveCosting.packagingCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labor (all)</span>
                    <span className="text-gray-900">${liveCosting.totalLaborCost.toFixed(2)}</span>
                  </div>

                  {/* Total Cost */}
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost</span>
                      <span className="text-gray-900">${liveCosting.totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Markup */}
                  <div className="flex justify-between text-gray-500">
                    <span>Markup ({(liveCosting.markupPercent * 100).toFixed(0)}%)</span>
                    <span>+${(liveCosting.suggestedPrice - liveCosting.totalCost).toFixed(2)}</span>
                  </div>

                  {/* Suggested Price */}
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Suggested Price</span>
                    <span className="text-gray-900">${liveCosting.suggestedPrice.toFixed(2)}</span>
                  </div>

                  {/* Discount */}
                  {liveCosting.discount && liveCosting.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount
                        {liveCosting.discount.type === 'PERCENT' && ` (${liveCosting.discount.value}%)`}
                      </span>
                      <span>-${liveCosting.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Delivery */}
                  {liveCosting.deliveryCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Delivery
                        {liveCosting.delivery?.zoneName && ` (${liveCosting.delivery.zoneName})`}
                      </span>
                      <span className="text-gray-900">+${liveCosting.deliveryCost.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Final Price */}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Final Price</span>
                      <span className="text-pink-600">${liveCosting.finalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Per serving ({liveCosting.totalServings})</span>
                      <span>${liveCosting.suggestedPricePerServing.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-amber-600 text-sm">
                  Unable to load costing. Try refreshing.
                </div>
              )}
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
