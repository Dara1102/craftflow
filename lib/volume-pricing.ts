import { prisma } from '@/lib/db'

interface VolumeBreakpoint {
  id: number
  minQuantity: number
  maxQuantity: number | null
  discountPercent: number
  pricePerUnit: number | null
}

interface PriceResult {
  originalPrice: number
  discountedPrice: number
  discountPercent: number
  savingsAmount: number
  breakpointApplied: VolumeBreakpoint | null
}

/**
 * Calculate volume-based pricing for a given quantity
 */
export async function calculateVolumePrice(
  menuItemId: number | null,
  productTypeId: number | null,
  quantity: number,
  basePrice: number
): Promise<PriceResult> {
  // Find applicable breakpoints
  const where: Record<string, unknown> = {
    isActive: true,
    minQuantity: { lte: quantity }
  }

  if (menuItemId) {
    where.menuItemId = menuItemId
  } else if (productTypeId) {
    where.productTypeId = productTypeId
  } else {
    // No breakpoint applicable
    return {
      originalPrice: basePrice * quantity,
      discountedPrice: basePrice * quantity,
      discountPercent: 0,
      savingsAmount: 0,
      breakpointApplied: null
    }
  }

  const breakpoints = await prisma.volumeBreakpoint.findMany({
    where,
    orderBy: { minQuantity: 'desc' } // Get highest applicable tier first
  })

  // Find the breakpoint that matches this quantity
  const applicableBreakpoint = breakpoints.find(bp => {
    if (bp.maxQuantity === null) return true
    return quantity <= bp.maxQuantity
  })

  if (!applicableBreakpoint) {
    return {
      originalPrice: basePrice * quantity,
      discountedPrice: basePrice * quantity,
      discountPercent: 0,
      savingsAmount: 0,
      breakpointApplied: null
    }
  }

  const originalTotal = basePrice * quantity
  let discountedTotal: number
  let effectiveDiscount: number

  if (applicableBreakpoint.pricePerUnit !== null) {
    // Fixed per-unit price
    discountedTotal = Number(applicableBreakpoint.pricePerUnit) * quantity
    effectiveDiscount = ((originalTotal - discountedTotal) / originalTotal) * 100
  } else {
    // Percentage discount
    effectiveDiscount = Number(applicableBreakpoint.discountPercent)
    discountedTotal = originalTotal * (1 - effectiveDiscount / 100)
  }

  return {
    originalPrice: originalTotal,
    discountedPrice: discountedTotal,
    discountPercent: effectiveDiscount,
    savingsAmount: originalTotal - discountedTotal,
    breakpointApplied: {
      id: applicableBreakpoint.id,
      minQuantity: applicableBreakpoint.minQuantity,
      maxQuantity: applicableBreakpoint.maxQuantity,
      discountPercent: Number(applicableBreakpoint.discountPercent),
      pricePerUnit: applicableBreakpoint.pricePerUnit ? Number(applicableBreakpoint.pricePerUnit) : null
    }
  }
}

/**
 * Get all breakpoints for a menu item or product type (for display)
 */
export async function getBreakpointTiers(
  menuItemId: number | null,
  productTypeId: number | null
): Promise<VolumeBreakpoint[]> {
  const where: Record<string, unknown> = { isActive: true }

  if (menuItemId) {
    where.menuItemId = menuItemId
  } else if (productTypeId) {
    where.productTypeId = productTypeId
  } else {
    return []
  }

  const breakpoints = await prisma.volumeBreakpoint.findMany({
    where,
    orderBy: { minQuantity: 'asc' }
  })

  return breakpoints.map(bp => ({
    id: bp.id,
    minQuantity: bp.minQuantity,
    maxQuantity: bp.maxQuantity,
    discountPercent: Number(bp.discountPercent),
    pricePerUnit: bp.pricePerUnit ? Number(bp.pricePerUnit) : null
  }))
}
