'use server'

import { OrderStatus, CakeType, DiscountType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export interface CreateOrderData {
  customerId?: number
  customerName?: string  // For legacy orders without linked customer
  eventDate: string

  // Cake details
  cakeType?: CakeType
  size?: string
  servingsTarget?: number
  desiredServings?: number

  // Event details
  theme?: string
  occasion?: string
  colors?: string
  accentColors?: string

  // Delivery/Pickup details
  isDelivery?: boolean
  pickupTime?: string
  deliveryZoneId?: number | null
  deliveryDistance?: number | null
  deliveryContact?: string
  deliveryPhone?: string
  deliveryTime?: string
  deliveryAddress?: string

  // Labor
  estimatedHours: number
  bakerHours?: number
  assistantHours?: number

  // Topper
  topperType?: string
  topperText?: string
  customTopperFee?: number

  // Discount
  discountType?: DiscountType
  discountValue?: number
  discountReason?: string

  notes?: string
  status: OrderStatus
  isRush?: boolean
  rushSkipBatchTypes?: string[]  // Array of batch type codes to skip (e.g., ['BAKE', 'PREP'])
  tiers: {
    tierSizeId: number
    batterRecipeId?: number | null
    fillingRecipeId?: number | null
    frostingRecipeId?: number | null
    flavor: string | null
    filling: string | null
    finishType: string | null
    frostingComplexity?: number
  }[]
  decorations: {
    decorationTechniqueId: number
    quantity: number
    notes?: string
    unitOverride?: 'SINGLE' | 'CAKE' | 'TIER' | 'SET'
    tierIndices?: number[]
  }[]
  products?: {
    menuItemId: number
    quantity: number
    packagingId?: number | null
    packagingQty?: number | null
    packagingSelections?: { packagingId: number; quantity: number }[]
    notes?: string | null
  }[]
  orderPackaging?: {
    packagingId: number
    quantity: number
    notes?: string | null
  }[]
}

export async function createOrder(data: CreateOrderData) {
  const order = await prisma.cakeOrder.create({
    data: {
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      eventDate: new Date(data.eventDate),

      // Cake details
      cakeType: data.cakeType,
      size: data.size,
      servingsTarget: data.servingsTarget,
      desiredServings: data.desiredServings,

      // Event details
      theme: data.theme,
      occasion: data.occasion,
      colors: data.colors,
      accentColors: data.accentColors,

      // Delivery/Pickup details
      isDelivery: data.isDelivery || false,
      pickupTime: !data.isDelivery && data.pickupTime ? new Date(data.pickupTime) : null,
      deliveryZoneId: data.isDelivery ? (data.deliveryZoneId || null) : null,
      deliveryDistance: data.isDelivery ? (data.deliveryDistance || null) : null,
      deliveryContact: data.isDelivery ? data.deliveryContact : null,
      deliveryPhone: data.isDelivery ? data.deliveryPhone : null,
      deliveryTime: data.isDelivery && data.deliveryTime ? new Date(data.deliveryTime) : null,
      deliveryAddress: data.isDelivery ? data.deliveryAddress : null,

      // Labor & notes
      estimatedHours: data.estimatedHours,
      bakerHours: data.bakerHours || null,
      assistantHours: data.assistantHours || null,
      notes: data.notes,
      status: data.status,

      // Topper
      topperType: data.topperType || null,
      topperText: data.topperText || null,
      customTopperFee: data.customTopperFee || null,

      // Discount
      discountType: data.discountType || null,
      discountValue: data.discountValue || null,
      discountReason: data.discountReason || null,

      // Rush order
      isRush: data.isRush || false,
      rushSkipBatchTypes: data.rushSkipBatchTypes ? JSON.stringify(data.rushSkipBatchTypes) : null,

      CakeTier: {
        create: data.tiers.map((tier, index) => ({
          tierIndex: index + 1,
          tierSizeId: tier.tierSizeId,
          batterRecipeId: tier.batterRecipeId || null,
          fillingRecipeId: tier.fillingRecipeId || null,
          frostingRecipeId: tier.frostingRecipeId || null,
          flavor: tier.flavor,
          filling: tier.filling,
          finishType: tier.finishType,
          frostingComplexity: tier.frostingComplexity || 2,
        }))
      },
      OrderDecoration: {
        create: data.decorations.map((dec) => ({
          decorationTechniqueId: dec.decorationTechniqueId,
          quantity: dec.quantity,
          notes: dec.notes || null,
          unitOverride: dec.unitOverride || null,
          tierIndices: dec.tierIndices || [],
        }))
      },
      OrderItem: {
        create: (data.products || []).map((product) => ({
          itemType: 'MENU_ITEM',
          menuItemId: product.menuItemId,
          quantity: product.quantity,
          packagingId: product.packagingId || null,
          packagingQty: product.packagingQty || null,
          notes: product.notes || null,
        }))
      },
      OrderPackaging: {
        create: (data.orderPackaging || []).map((op) => ({
          packagingId: op.packagingId,
          quantity: op.quantity,
          notes: op.notes || null,
        }))
      }
    }
  })

  revalidatePath('/')
  redirect(`/orders/${order.id}`)
}

export async function updateOrder(orderId: number, data: CreateOrderData) {
  try {
    await prisma.$transaction(async (tx) => {
      // Update order details
      await tx.cakeOrder.update({
        where: { id: orderId },
        data: {
          // Handle either linked customer or text-only customerName
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          eventDate: new Date(data.eventDate),

          // Cake details
          cakeType: data.cakeType,
          size: data.size,
          servingsTarget: data.servingsTarget,

          // Event details
          theme: data.theme,
          occasion: data.occasion,
          colors: data.colors,
          accentColors: data.accentColors,

          // Delivery/Pickup details
          isDelivery: data.isDelivery || false,
          pickupTime: !data.isDelivery && data.pickupTime ? new Date(data.pickupTime) : null,
          deliveryZoneId: data.isDelivery ? (data.deliveryZoneId || null) : null,
          deliveryDistance: data.isDelivery ? (data.deliveryDistance || null) : null,
          deliveryContact: data.isDelivery ? data.deliveryContact : null,
          deliveryPhone: data.isDelivery ? data.deliveryPhone : null,
          deliveryTime: data.isDelivery && data.deliveryTime ? new Date(data.deliveryTime) : null,
          deliveryAddress: data.isDelivery ? data.deliveryAddress : null,

          // Labor & notes
          estimatedHours: data.estimatedHours,
          bakerHours: data.bakerHours || null,
          assistantHours: data.assistantHours || null,
          notes: data.notes,
          status: data.status,

          // Topper
          topperType: data.topperType || null,
          topperText: data.topperText || null,
          customTopperFee: data.customTopperFee || null,

          // Discount
          discountType: data.discountType || null,
          discountValue: data.discountValue || null,
          discountReason: data.discountReason || null,
        }
      })

    // Delete existing tiers
    await tx.cakeTier.deleteMany({
      where: { cakeOrderId: orderId }
    })

    // Create new tiers
    await tx.cakeTier.createMany({
      data: data.tiers.map((tier, index) => ({
        cakeOrderId: orderId,
        tierIndex: index + 1,
        tierSizeId: tier.tierSizeId,
        batterRecipeId: tier.batterRecipeId || null,
        fillingRecipeId: tier.fillingRecipeId || null,
        frostingRecipeId: tier.frostingRecipeId || null,
        flavor: tier.flavor,
        filling: tier.filling,
        finishType: tier.finishType,
        frostingComplexity: tier.frostingComplexity || 2,
        updatedAt: new Date(),
      }))
    })

    // Delete existing decorations
    await tx.orderDecoration.deleteMany({
      where: { cakeOrderId: orderId }
    })

    // Create new decorations
    if (data.decorations.length > 0) {
      await tx.orderDecoration.createMany({
        data: data.decorations.map((dec) => ({
          cakeOrderId: orderId,
          decorationTechniqueId: dec.decorationTechniqueId,
          quantity: dec.quantity,
          notes: dec.notes || null,
          unitOverride: dec.unitOverride || null,
          tierIndices: dec.tierIndices || [],
          updatedAt: new Date(),
        }))
      })
    }

    // Delete existing order item packaging first (due to foreign key)
    await tx.orderItemPackaging.deleteMany({
      where: {
        OrderItem: {
          cakeOrderId: orderId
        }
      }
    })

    // Delete existing order items (products)
    await tx.orderItem.deleteMany({
      where: { cakeOrderId: orderId }
    })

    // Create new order items (products) with multiple packaging
    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        // Create the order item
        const orderItem = await tx.orderItem.create({
          data: {
            cakeOrderId: orderId,
            itemType: 'MENU_ITEM',
            menuItemId: product.menuItemId,
            quantity: product.quantity,
            notes: product.notes || null,
            updatedAt: new Date(),
          }
        })

        // Create packaging selections for this item
        if (product.packagingSelections && product.packagingSelections.length > 0) {
          await tx.orderItemPackaging.createMany({
            data: product.packagingSelections.map((ps: { packagingId: number; quantity: number }) => ({
              orderItemId: orderItem.id,
              packagingId: ps.packagingId,
              quantity: ps.quantity
            }))
          })
        }
      }
    }

    // Delete existing order-level packaging
    await tx.orderPackaging.deleteMany({
      where: { cakeOrderId: orderId }
    })

    // Create new order-level packaging (standalone packaging not tied to products)
    if (data.orderPackaging && data.orderPackaging.length > 0) {
      await tx.orderPackaging.createMany({
        data: data.orderPackaging.map((op) => ({
          cakeOrderId: orderId,
          packagingId: op.packagingId,
          quantity: op.quantity,
          notes: op.notes || null,
          updatedAt: new Date(),
        }))
      })
    }
    })

    revalidatePath('/')
    revalidatePath(`/orders/${orderId}`)
    revalidatePath(`/orders/${orderId}/costing`)
  } catch (error) {
    console.error('Failed to update order:', error)
    throw error
  }
}

export async function deleteOrder(orderId: number) {
  await prisma.cakeOrder.delete({
    where: { id: orderId }
  })

  revalidatePath('/')
  redirect('/')
}
