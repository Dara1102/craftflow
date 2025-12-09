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