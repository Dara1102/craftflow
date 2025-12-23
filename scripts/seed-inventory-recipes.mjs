#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedInventoryRecipes() {
  console.log('Seeding inventory items with recipe links...\n')

  // Get all recipes
  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true, type: true }
  })

  console.log(`Found ${recipes.length} recipes`)
  if (recipes.length === 0) {
    console.log('No recipes found. Run recipe seeds first.')
    return
  }

  // Create maps for recipe lookup (case-insensitive)
  const recipeByName = {}
  for (const r of recipes) {
    recipeByName[r.name.toLowerCase()] = r
    // Also index by type + key words
    const nameParts = r.name.toLowerCase().split(' ')
    for (const part of nameParts) {
      if (!recipeByName[part]) {
        recipeByName[part] = r
      }
    }
  }

  console.log('Recipe names:', recipes.map(r => r.name).join(', '))

  // Helper to find recipe by name (fuzzy match)
  const findRecipe = (searchTerms) => {
    for (const term of searchTerms) {
      const key = term.toLowerCase()
      if (recipeByName[key]) return recipeByName[key]
    }
    // Try partial match
    for (const term of searchTerms) {
      const key = term.toLowerCase()
      for (const r of recipes) {
        if (r.name.toLowerCase().includes(key)) return r
      }
    }
    return null
  }

  // Pre-made products with their recipe requirements
  const products = [
    // Cupcakes - need batter + frosting
    {
      sku: 'CUP-VAN-BC-DZ',
      name: 'Vanilla Cupcakes w/ Vanilla Buttercream',
      productType: 'CUPCAKE',
      flavor: 'Vanilla',
      unit: 'dozen',
      minStock: 2,
      maxStock: 8,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['vanilla', 'vanilla cake', 'vanilla batter'], type: 'BATTER', ozPerUnit: 6 },  // ~0.5oz batter per cupcake x 12
        { searchTerms: ['vanilla buttercream', 'vanilla frosting'], type: 'FROSTING', ozPerUnit: 6 }  // ~0.5oz frosting per cupcake x 12
      ]
    },
    {
      sku: 'CUP-CHOC-BC-DZ',
      name: 'Chocolate Cupcakes w/ Chocolate Buttercream',
      productType: 'CUPCAKE',
      flavor: 'Chocolate',
      unit: 'dozen',
      minStock: 2,
      maxStock: 8,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['chocolate', 'chocolate cake', 'chocolate batter'], type: 'BATTER', ozPerUnit: 6 },
        { searchTerms: ['chocolate buttercream', 'chocolate frosting'], type: 'FROSTING', ozPerUnit: 6 }
      ]
    },
    {
      sku: 'CUP-VAN-CHOC-DZ',
      name: 'Vanilla Cupcakes w/ Chocolate Buttercream',
      productType: 'CUPCAKE',
      flavor: 'Vanilla/Chocolate',
      unit: 'dozen',
      minStock: 1,
      maxStock: 6,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['vanilla', 'vanilla cake'], type: 'BATTER', ozPerUnit: 6 },
        { searchTerms: ['chocolate buttercream', 'chocolate frosting'], type: 'FROSTING', ozPerUnit: 6 }
      ]
    },
    {
      sku: 'CUP-RVEL-CREAM-DZ',
      name: 'Red Velvet Cupcakes w/ Cream Cheese',
      productType: 'CUPCAKE',
      flavor: 'Red Velvet',
      unit: 'dozen',
      minStock: 1,
      maxStock: 4,
      shelfLifeDays: 3,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['red velvet'], type: 'BATTER', ozPerUnit: 6 },
        { searchTerms: ['cream cheese', 'cream cheese frosting'], type: 'FROSTING', ozPerUnit: 6 }
      ]
    },
    // Cookies - need dough
    {
      sku: 'COOK-SUG-ICED-DZ',
      name: 'Decorated Sugar Cookies',
      productType: 'COOKIE',
      flavor: 'Sugar',
      unit: 'dozen',
      minStock: 3,
      maxStock: 12,
      shelfLifeDays: 14,
      storageLocation: 'Display Case',
      recipes: [
        { searchTerms: ['sugar cookie', 'sugar'], type: 'BATTER', ozPerUnit: 12 },  // ~1oz per cookie x 12
        { searchTerms: ['royal icing'], type: 'FROSTING', ozPerUnit: 4 }  // icing for decoration
      ]
    },
    {
      sku: 'COOK-CHOC-DZ',
      name: 'Chocolate Chip Cookies',
      productType: 'COOKIE',
      flavor: 'Chocolate Chip',
      unit: 'dozen',
      minStock: 2,
      maxStock: 8,
      shelfLifeDays: 7,
      storageLocation: 'Display Case',
      recipes: [
        { searchTerms: ['chocolate chip', 'cookie dough'], type: 'BATTER', ozPerUnit: 12 }
      ]
    },
    // Cake Pops - need cake + coating
    {
      sku: 'POP-VAN-DZ',
      name: 'Vanilla Cake Pops',
      productType: 'CAKE_POP',
      flavor: 'Vanilla',
      unit: 'dozen',
      minStock: 1,
      maxStock: 6,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['vanilla', 'vanilla cake'], type: 'BATTER', ozPerUnit: 4 },  // cake crumbs per dozen
        { searchTerms: ['vanilla buttercream', 'buttercream'], type: 'FROSTING', ozPerUnit: 2 }  // binding
      ]
    },
    {
      sku: 'POP-CHOC-DZ',
      name: 'Chocolate Cake Pops',
      productType: 'CAKE_POP',
      flavor: 'Chocolate',
      unit: 'dozen',
      minStock: 1,
      maxStock: 6,
      shelfLifeDays: 5,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['chocolate', 'chocolate cake'], type: 'BATTER', ozPerUnit: 4 },
        { searchTerms: ['chocolate buttercream', 'chocolate frosting'], type: 'FROSTING', ozPerUnit: 2 }
      ]
    },
    // Mini cakes (use OTHER since MINI_CAKE not in enum)
    {
      sku: 'MINI-VAN-4IN',
      name: '4-inch Vanilla Mini Cake',
      productType: 'OTHER',
      flavor: 'Vanilla',
      unit: 'each',
      minStock: 2,
      maxStock: 6,
      shelfLifeDays: 4,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['vanilla', 'vanilla cake', 'vanilla sponge'], type: 'BATTER', ozPerUnit: 8 },
        { searchTerms: ['vanilla buttercream'], type: 'FROSTING', ozPerUnit: 6 }
      ]
    },
    {
      sku: 'MINI-CHOC-4IN',
      name: '4-inch Chocolate Mini Cake',
      productType: 'OTHER',
      flavor: 'Chocolate',
      unit: 'each',
      minStock: 2,
      maxStock: 6,
      shelfLifeDays: 4,
      storageLocation: 'Walk-in Cooler',
      recipes: [
        { searchTerms: ['chocolate', 'chocolate cake', 'chocolate sponge'], type: 'BATTER', ozPerUnit: 8 },
        { searchTerms: ['chocolate buttercream', 'chocolate frosting'], type: 'FROSTING', ozPerUnit: 6 }
      ]
    }
  ]

  let itemsCreated = 0
  let itemsSkipped = 0
  let linksCreated = 0

  for (const product of products) {
    // Check if item already exists
    const existing = await prisma.inventoryItem.findUnique({
      where: { sku: product.sku }
    })

    let item
    if (existing) {
      console.log(`  Skipping ${product.name} (already exists)`)
      item = existing
      itemsSkipped++
    } else {
      // Create the inventory item
      item = await prisma.inventoryItem.create({
        data: {
          sku: product.sku,
          name: product.name,
          productType: product.productType,
          flavor: product.flavor,
          unit: product.unit,
          currentStock: 0,
          minStock: product.minStock,
          maxStock: product.maxStock,
          shelfLifeDays: product.shelfLifeDays,
          storageLocation: product.storageLocation
        }
      })
      console.log(`  Created ${product.name}`)
      itemsCreated++
    }

    // Create recipe links
    if (product.recipes) {
      for (const recipeReq of product.recipes) {
        const recipe = findRecipe(recipeReq.searchTerms)
        if (!recipe) {
          console.log(`    Warning: No recipe found for ${recipeReq.searchTerms.join('/')}`)
          continue
        }

        // Check if link already exists
        const existingLink = await prisma.inventoryItemRecipe.findUnique({
          where: {
            inventoryItemId_recipeId: {
              inventoryItemId: item.id,
              recipeId: recipe.id
            }
          }
        })

        if (existingLink) {
          console.log(`    Link already exists: ${recipe.name}`)
          continue
        }

        await prisma.inventoryItemRecipe.create({
          data: {
            inventoryItemId: item.id,
            recipeId: recipe.id,
            recipeType: recipeReq.type,
            quantityPerUnit: recipeReq.ozPerUnit
          }
        })
        console.log(`    Linked to ${recipe.name} (${recipeReq.ozPerUnit}oz per unit)`)
        linksCreated++
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Items created: ${itemsCreated}`)
  console.log(`Items skipped: ${itemsSkipped}`)
  console.log(`Recipe links created: ${linksCreated}`)

  // Create sample stock production tasks for the new items
  console.log('\n=== Creating Sample Stock Tasks ===')

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)

  const itemsWithRecipes = await prisma.inventoryItem.findMany({
    where: {
      InventoryItemRecipe: { some: {} }  // Only items with recipe links
    },
    include: {
      InventoryItemRecipe: {
        include: { Recipe: { select: { name: true } } }
      }
    }
  })

  let tasksCreated = 0
  for (const item of itemsWithRecipes.slice(0, 5)) {  // Create tasks for first 5 items
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

    const qty = Math.floor(Math.random() * 3) + 2  // 2-4 units
    const scheduledDate = [today, tomorrow, dayAfter][tasksCreated % 3]

    await prisma.stockProductionTask.create({
      data: {
        inventoryItemId: item.id,
        taskType: item.productType === 'FROSTING' ? 'PREP' : 'BAKE',
        taskName: `Make ${qty}x ${item.name}`,
        targetQuantity: qty,
        completedQuantity: 0,
        scheduledDate,
        status: 'PENDING',
        priority: 0,
        isAutoGenerated: false
      }
    })
    console.log(`  Created task: Make ${qty}x ${item.name} for ${scheduledDate.toDateString()}`)
    tasksCreated++
  }

  console.log(`\nStock tasks created: ${tasksCreated}`)
}

seedInventoryRecipes()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
