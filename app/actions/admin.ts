'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

// Ingredients
export async function createIngredient(data: {
  name: string
  unit: string
  costPerUnit: number
}) {
  await prisma.ingredient.create({ data })
  revalidatePath('/admin/ingredients')
}

export async function updateIngredient(id: number, data: {
  name: string
  unit: string
  costPerUnit: number
}) {
  await prisma.ingredient.update({
    where: { id },
    data
  })
  revalidatePath('/admin/ingredients')
}

export async function deleteIngredient(id: number) {
  await prisma.ingredient.delete({
    where: { id }
  })
  revalidatePath('/admin/ingredients')
}

// Recipes
export async function createRecipe(data: {
  name: string
  type: string
  yieldDescription: string
  ingredients: { ingredientId: number; quantity: number }[]
}) {
  const { ingredients, ...recipeData } = data
  await prisma.recipe.create({
    data: {
      ...recipeData,
      recipeIngredients: {
        create: ingredients
      }
    }
  })
  revalidatePath('/admin/recipes')
}

export async function updateRecipe(id: number, data: {
  name: string
  type: string
  yieldDescription: string
  ingredients: { ingredientId: number; quantity: number }[]
}) {
  const { ingredients, ...recipeData } = data

  await prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id },
      data: recipeData
    })

    await tx.recipeIngredient.deleteMany({
      where: { recipeId: id }
    })

    await tx.recipeIngredient.createMany({
      data: ingredients.map(ing => ({
        recipeId: id,
        ...ing
      }))
    })
  })

  revalidatePath('/admin/recipes')
}

export async function deleteRecipe(id: number) {
  await prisma.recipe.delete({
    where: { id }
  })
  revalidatePath('/admin/recipes')
}

// Tier Sizes
export async function createTierSize(data: {
  name: string
  shape: string
  diameterCm: number
  lengthCm?: number | null
  heightCm: number
  servings: number
  batterRecipeId: number
  batterMultiplier: number
  frostingRecipeId?: number
  frostingMultiplier?: number
}) {
  try {
    // Clean up data - convert undefined to null for optional fields
    const cleanData = {
      name: data.name,
      shape: data.shape,
      diameterCm: data.diameterCm,
      lengthCm: data.lengthCm ?? null,
      heightCm: data.heightCm,
      servings: data.servings,
      batterRecipeId: data.batterRecipeId,
      batterMultiplier: data.batterMultiplier,
      frostingRecipeId: data.frostingRecipeId ?? null,
      frostingMultiplier: data.frostingMultiplier ?? null,
    }
    await prisma.tierSize.create({ data: cleanData })
    revalidatePath('/admin/tiers')
  } catch (error) {
    console.error('Error creating tier size:', error)
    throw error
  }
}

export async function updateTierSize(id: number, data: {
  name: string
  shape: string
  diameterCm: number
  lengthCm?: number | null
  heightCm: number
  servings: number
  batterRecipeId: number
  batterMultiplier: number
  frostingRecipeId?: number
  frostingMultiplier?: number
}) {
  try {
    // Clean up data - convert undefined to null for optional fields
    const cleanData = {
      name: data.name,
      shape: data.shape,
      diameterCm: data.diameterCm,
      lengthCm: data.lengthCm ?? null,
      heightCm: data.heightCm,
      servings: data.servings,
      batterRecipeId: data.batterRecipeId,
      batterMultiplier: data.batterMultiplier,
      frostingRecipeId: data.frostingRecipeId ?? null,
      frostingMultiplier: data.frostingMultiplier ?? null,
    }
    await prisma.tierSize.update({
      where: { id },
      data: cleanData
    })
    revalidatePath('/admin/tiers')
  } catch (error) {
    console.error('Error updating tier size:', error)
    throw error
  }
}

export async function deleteTierSize(id: number) {
  await prisma.tierSize.delete({
    where: { id }
  })
  revalidatePath('/admin/tiers')
}

// Decoration Materials
export async function createDecorationMaterial(data: {
  name: string
  unit: string
  costPerUnit: number
  usageRuleType: string
  usageRuleValue: number
}) {
  await prisma.decorationMaterial.create({ data })
  revalidatePath('/admin/decorations')
}

export async function updateDecorationMaterial(id: number, data: {
  name: string
  unit: string
  costPerUnit: number
  usageRuleType: string
  usageRuleValue: number
}) {
  await prisma.decorationMaterial.update({
    where: { id },
    data
  })
  revalidatePath('/admin/decorations')
}

export async function deleteDecorationMaterial(id: number) {
  await prisma.decorationMaterial.delete({
    where: { id }
  })
  revalidatePath('/admin/decorations')
}

// Settings
export async function updateSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
  revalidatePath('/admin/settings')
}

// Delivery Zones
export async function createDeliveryZone(data: {
  name: string
  description?: string
  minDistance?: number | null
  maxDistance?: number | null
  baseFee: number
  perMileFee?: number | null
  sortOrder?: number
}) {
  await prisma.deliveryZone.create({
    data: {
      name: data.name,
      description: data.description || null,
      minDistance: data.minDistance ?? null,
      maxDistance: data.maxDistance ?? null,
      baseFee: data.baseFee,
      perMileFee: data.perMileFee ?? null,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    }
  })
  revalidatePath('/admin/delivery-zones')
}

export async function updateDeliveryZone(id: number, data: {
  name: string
  description?: string
  minDistance?: number | null
  maxDistance?: number | null
  baseFee: number
  perMileFee?: number | null
  sortOrder?: number
  isActive?: boolean
}) {
  await prisma.deliveryZone.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      minDistance: data.minDistance ?? null,
      maxDistance: data.maxDistance ?? null,
      baseFee: data.baseFee,
      perMileFee: data.perMileFee ?? null,
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive ?? true,
    }
  })
  revalidatePath('/admin/delivery-zones')
}

export async function deleteDeliveryZone(id: number) {
  await prisma.deliveryZone.delete({
    where: { id }
  })
  revalidatePath('/admin/delivery-zones')
}

// Helper function to geocode an address
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  return null
}

// Delivery Start Points
export async function createDeliveryStartPoint(data: {
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
  isDefault?: boolean
  sortOrder?: number
}) {
  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.deliveryStartPoint.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    })
  }

  // Auto-geocode the address if no coordinates provided
  let latitude = data.latitude
  let longitude = data.longitude
  if (!latitude || !longitude) {
    const coords = await geocodeAddress(data.address)
    if (coords) {
      latitude = coords.lat
      longitude = coords.lng
    }
  }

  const startPoint = await prisma.deliveryStartPoint.create({
    data: {
      name: data.name,
      address: data.address,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      isDefault: data.isDefault || false,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    }
  })
  revalidatePath('/admin/settings')
  return startPoint
}

export async function updateDeliveryStartPoint(id: number, data: {
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
  isDefault?: boolean
  isActive?: boolean
  sortOrder?: number
}) {
  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.deliveryStartPoint.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false }
    })
  }

  // Get current record to check if address changed
  const current = await prisma.deliveryStartPoint.findUnique({ where: { id } })

  // Auto-geocode the address if it changed or no coordinates exist
  let latitude = data.latitude
  let longitude = data.longitude
  if ((!latitude || !longitude) || (current && current.address !== data.address)) {
    const coords = await geocodeAddress(data.address)
    if (coords) {
      latitude = coords.lat
      longitude = coords.lng
    }
  }

  await prisma.deliveryStartPoint.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      isDefault: data.isDefault || false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder || 0,
    }
  })
  revalidatePath('/admin/settings')
}

export async function deleteDeliveryStartPoint(id: number) {
  await prisma.deliveryStartPoint.delete({
    where: { id }
  })
  revalidatePath('/admin/settings')
}

export async function setDefaultDeliveryStartPoint(id: number) {
  await prisma.deliveryStartPoint.updateMany({
    where: { isDefault: true },
    data: { isDefault: false }
  })
  await prisma.deliveryStartPoint.update({
    where: { id },
    data: { isDefault: true }
  })
  revalidatePath('/admin/settings')
}

// Labor Roles
export async function createLaborRole(data: {
  name: string
  description?: string
  hourlyRate: number
  sortOrder?: number
}) {
  await prisma.laborRole.create({
    data: {
      name: data.name,
      description: data.description || null,
      hourlyRate: data.hourlyRate,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    }
  })
  revalidatePath('/admin/labor-roles')
}

export async function updateLaborRole(id: number, data: {
  name: string
  description?: string
  hourlyRate: number
  sortOrder?: number
  isActive?: boolean
}) {
  await prisma.laborRole.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      hourlyRate: data.hourlyRate,
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive ?? true,
    }
  })
  revalidatePath('/admin/labor-roles')
}

export async function deleteLaborRole(id: number) {
  // Check if role is used by any decoration techniques
  const usedCount = await prisma.decorationTechnique.count({
    where: { laborRoleId: id }
  })

  if (usedCount > 0) {
    throw new Error(`Cannot delete this role - it is assigned to ${usedCount} decoration technique(s)`)
  }

  await prisma.laborRole.delete({
    where: { id }
  })
  revalidatePath('/admin/labor-roles')
}