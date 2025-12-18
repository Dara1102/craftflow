'use server'

import { OrderStatus, CakeType, DiscountType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export interface CreateOrderData {
  customerId: number
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

  // Delivery details
  isDelivery?: boolean
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
  tiers: {
    tierSizeId: number
    batterRecipeId?: number | null
    fillingRecipeId?: number | null
    frostingRecipeId?: number | null
    flavor: string
    filling: string
    finishType: string
  }[]
  decorations: {
    decorationTechniqueId: number
    quantity: number
    notes?: string
  }[]
}

export async function createOrder(data: CreateOrderData) {
  const order = await prisma.cakeOrder.create({
    data: {
      customerId: data.customerId,
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

      // Delivery details
      isDelivery: data.isDelivery || false,
      deliveryZoneId: data.deliveryZoneId || null,
      deliveryDistance: data.deliveryDistance || null,
      deliveryContact: data.deliveryContact,
      deliveryPhone: data.deliveryPhone,
      deliveryTime: data.deliveryTime ? new Date(data.deliveryTime) : null,
      deliveryAddress: data.deliveryAddress,

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

      cakeTiers: {
        create: data.tiers.map((tier, index) => ({
          tierIndex: index + 1,
          tierSizeId: tier.tierSizeId,
          batterRecipeId: tier.batterRecipeId || null,
          fillingRecipeId: tier.fillingRecipeId || null,
          frostingRecipeId: tier.frostingRecipeId || null,
          flavor: tier.flavor,
          filling: tier.filling,
          finishType: tier.finishType,
        }))
      },
      orderDecorations: {
        create: data.decorations.map((dec) => ({
          decorationTechniqueId: dec.decorationTechniqueId,
          quantity: dec.quantity,
          notes: dec.notes || null,
        }))
      }
    }
  })

  revalidatePath('/')
  redirect(`/orders/${order.id}`)
}

export async function updateOrder(orderId: number, data: CreateOrderData) {
  await prisma.$transaction(async (tx) => {
    // Update order details
    await tx.cakeOrder.update({
      where: { id: orderId },
      data: {
        customer: {
          connect: { id: data.customerId }
        },
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

        // Delivery details
        isDelivery: data.isDelivery || false,
        deliveryZone: data.deliveryZoneId ? { connect: { id: data.deliveryZoneId } } : { disconnect: true },
        deliveryDistance: data.deliveryDistance || null,
        deliveryContact: data.deliveryContact,
        deliveryPhone: data.deliveryPhone,
        deliveryTime: data.deliveryTime ? new Date(data.deliveryTime) : null,
        deliveryAddress: data.deliveryAddress,

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
        }))
      })
    }
  })

  revalidatePath('/')
  revalidatePath(`/orders/${orderId}`)
  revalidatePath(`/orders/${orderId}/costing`)
}

export async function deleteOrder(orderId: number) {
  await prisma.cakeOrder.delete({
    where: { id: orderId }
  })

  revalidatePath('/')
  redirect('/')
}
