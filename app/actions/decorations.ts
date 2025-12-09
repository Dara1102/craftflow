'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function duplicateDecoration(decorationId: number) {
  // Get the original decoration
  const original = await prisma.decorationTechnique.findUnique({
    where: { id: decorationId },
  })

  if (!original) {
    throw new Error('Decoration not found')
  }

  // Generate a new SKU based on original
  // Extract base SKU (remove any -COPY or -NUM suffix)
  const baseSku = original.sku.replace(/-COPY\d*$|-\d+$/, '')

  // Find all SKUs that start with this base to determine next number
  const existingSkus = await prisma.decorationTechnique.findMany({
    where: {
      sku: {
        startsWith: baseSku,
      },
    },
    select: { sku: true },
  })

  // Find the highest number suffix
  let maxNum = 0
  for (const { sku } of existingSkus) {
    // Look for -COPY followed by optional number, or just -number at end
    const copyMatch = sku.match(/-COPY(\d*)$/)
    const numMatch = sku.match(/-(\d+)$/)

    if (copyMatch) {
      const num = copyMatch[1] ? parseInt(copyMatch[1]) : 1
      maxNum = Math.max(maxNum, num)
    } else if (numMatch) {
      const num = parseInt(numMatch[1])
      maxNum = Math.max(maxNum, num)
    }
  }

  // Create new SKU with incremented number
  const newSku = `${baseSku}-COPY${maxNum + 1}`

  // Create the duplicate
  const duplicate = await prisma.decorationTechnique.create({
    data: {
      sku: newSku,
      name: `${original.name} (Copy)`,
      category: original.category,
      subcategory: original.subcategory,
      skillLevel: original.skillLevel,
      description: original.description,
      unit: original.unit,
      baseCakeSize: original.baseCakeSize,
      defaultCostPerUnit: original.defaultCostPerUnit,
      laborMinutes: original.laborMinutes,
      wasteFactorPercent: original.wasteFactorPercent,
      materialGrade: original.materialGrade,
      toolsRequired: original.toolsRequired,
      imageReference: original.imageReference,
      isActive: original.isActive,
    },
  })

  revalidatePath('/admin/decorations')
  redirect(`/admin/decorations/${duplicate.id}`)
}
