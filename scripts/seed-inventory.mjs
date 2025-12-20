#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedInventory() {
  console.log('Seeding inventory items...')

  // Get tier sizes for reference
  const tierSizes = await prisma.tierSize.findMany({
    select: { id: true, name: true }
  })
  const tierSizeMap = Object.fromEntries(tierSizes.map(t => [t.name, t.id]))

  // Get recipes for reference
  const recipes = await prisma.recipe.findMany({
    where: { type: 'BATTER' },
    select: { id: true, name: true }
  })
  const recipeMap = Object.fromEntries(recipes.map(r => [r.name.toLowerCase(), r.id]))

  // Sample inventory items
  const items = [
    // Cake Tiers
    {
      sku: 'TIER-6-VAN',
      name: '6-inch Vanilla Cake Tier',
      productType: 'CAKE_TIER',
      tierSizeId: tierSizeMap['6" Round'] || tierSizeMap['6 inch Round'] || null,
      recipeId: recipeMap['vanilla'] || recipeMap['vanilla cake'] || null,
      flavor: 'Vanilla',
      unit: 'each',
      minStock: 5,
      maxStock: 15,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Freezer'
    },
    {
      sku: 'TIER-6-CHOC',
      name: '6-inch Chocolate Cake Tier',
      productType: 'CAKE_TIER',
      tierSizeId: tierSizeMap['6" Round'] || tierSizeMap['6 inch Round'] || null,
      recipeId: recipeMap['chocolate'] || recipeMap['chocolate cake'] || null,
      flavor: 'Chocolate',
      unit: 'each',
      minStock: 5,
      maxStock: 15,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Freezer'
    },
    {
      sku: 'TIER-8-VAN',
      name: '8-inch Vanilla Cake Tier',
      productType: 'CAKE_TIER',
      tierSizeId: tierSizeMap['8" Round'] || tierSizeMap['8 inch Round'] || null,
      recipeId: recipeMap['vanilla'] || recipeMap['vanilla cake'] || null,
      flavor: 'Vanilla',
      unit: 'each',
      minStock: 3,
      maxStock: 10,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Freezer'
    },
    {
      sku: 'TIER-8-CHOC',
      name: '8-inch Chocolate Cake Tier',
      productType: 'CAKE_TIER',
      tierSizeId: tierSizeMap['8" Round'] || tierSizeMap['8 inch Round'] || null,
      recipeId: recipeMap['chocolate'] || recipeMap['chocolate cake'] || null,
      flavor: 'Chocolate',
      unit: 'each',
      minStock: 3,
      maxStock: 10,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Freezer'
    },
    {
      sku: 'TIER-10-VAN',
      name: '10-inch Vanilla Cake Tier',
      productType: 'CAKE_TIER',
      tierSizeId: tierSizeMap['10" Round'] || tierSizeMap['10 inch Round'] || null,
      flavor: 'Vanilla',
      unit: 'each',
      minStock: 2,
      maxStock: 6,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Freezer'
    },
    // Cupcakes
    {
      sku: 'CUP-VAN-DZ',
      name: 'Vanilla Cupcakes (unfrosted)',
      productType: 'CUPCAKE',
      flavor: 'Vanilla',
      unit: 'dozen',
      minStock: 3,
      maxStock: 10,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler'
    },
    {
      sku: 'CUP-CHOC-DZ',
      name: 'Chocolate Cupcakes (unfrosted)',
      productType: 'CUPCAKE',
      flavor: 'Chocolate',
      unit: 'dozen',
      minStock: 3,
      maxStock: 10,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler'
    },
    {
      sku: 'CUP-RVEL-DZ',
      name: 'Red Velvet Cupcakes (unfrosted)',
      productType: 'CUPCAKE',
      flavor: 'Red Velvet',
      unit: 'dozen',
      minStock: 2,
      maxStock: 6,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler'
    },
    // Cookies
    {
      sku: 'COOK-SUG-DZ',
      name: 'Sugar Cookies (undecorated)',
      productType: 'COOKIE',
      flavor: 'Sugar',
      unit: 'dozen',
      minStock: 5,
      maxStock: 20,
      shelfLifeDays: 14,
      storageLocation: 'Dry Storage'
    },
    {
      sku: 'COOK-CHOC-DZ',
      name: 'Chocolate Chip Cookies',
      productType: 'COOKIE',
      flavor: 'Chocolate Chip',
      unit: 'dozen',
      minStock: 3,
      maxStock: 12,
      shelfLifeDays: 7,
      storageLocation: 'Display Case'
    },
    // Cake Pops
    {
      sku: 'POP-VAN-DZ',
      name: 'Vanilla Cake Pops (undecorated)',
      productType: 'CAKE_POP',
      flavor: 'Vanilla',
      unit: 'dozen',
      minStock: 2,
      maxStock: 8,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Cooler'
    },
    // Frosting
    {
      sku: 'FROST-VAN-BATCH',
      name: 'Vanilla Buttercream Frosting',
      productType: 'FROSTING',
      flavor: 'Vanilla',
      unit: 'batch',
      minStock: 2,
      maxStock: 5,
      shelfLifeDays: 7,
      storageLocation: 'Walk-in Cooler'
    },
    {
      sku: 'FROST-CHOC-BATCH',
      name: 'Chocolate Buttercream Frosting',
      productType: 'FROSTING',
      flavor: 'Chocolate',
      unit: 'batch',
      minStock: 2,
      maxStock: 5,
      shelfLifeDays: 7,
      storageLocation: 'Walk-in Cooler'
    }
  ]

  let created = 0
  let skipped = 0

  for (const item of items) {
    // Check if already exists
    const existing = await prisma.inventoryItem.findUnique({
      where: { sku: item.sku }
    })

    if (existing) {
      console.log(`  Skipping ${item.name} (already exists)`)
      skipped++
      continue
    }

    await prisma.inventoryItem.create({
      data: {
        sku: item.sku,
        name: item.name,
        productType: item.productType,
        tierSizeId: item.tierSizeId || null,
        recipeId: item.recipeId || null,
        flavor: item.flavor,
        unit: item.unit,
        currentStock: 0,
        minStock: item.minStock,
        maxStock: item.maxStock,
        shelfLifeDays: item.shelfLifeDays,
        storageLocation: item.storageLocation
      }
    })
    console.log(`  Created ${item.name}`)
    created++
  }

  console.log(`\nDone! Created ${created} items, skipped ${skipped}`)

  // Create some sample stock production tasks
  console.log('\nCreating sample stock production tasks...')

  const inventoryItems = await prisma.inventoryItem.findMany({
    take: 5
  })

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let tasksCreated = 0
  for (const item of inventoryItems) {
    // Check if task already exists
    const existingTask = await prisma.stockProductionTask.findFirst({
      where: {
        inventoryItemId: item.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (existingTask) {
      console.log(`  Skipping task for ${item.name} (already has pending task)`)
      continue
    }

    const qty = item.maxStock ? item.maxStock - item.currentStock : 10
    if (qty <= 0) continue

    await prisma.stockProductionTask.create({
      data: {
        inventoryItemId: item.id,
        taskType: item.productType === 'CAKE_TIER' ? 'BAKE' :
                  item.productType === 'FROSTING' ? 'PREP' : 'BAKE',
        taskName: `Make ${qty}x ${item.name}`,
        targetQuantity: qty,
        completedQuantity: 0,
        scheduledDate: tasksCreated % 2 === 0 ? today : tomorrow,
        status: 'PENDING',
        priority: item.currentStock === 0 ? 1 : 0,
        isAutoGenerated: true
      }
    })
    console.log(`  Created task: Make ${qty}x ${item.name}`)
    tasksCreated++
  }

  console.log(`\nCreated ${tasksCreated} stock production tasks`)
}

seedInventory()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
