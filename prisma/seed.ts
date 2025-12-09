import { PrismaClient, RecipeType, UsageRuleType, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create ingredients
  const flour = await prisma.ingredient.create({
    data: {
      name: 'All-purpose flour',
      unit: 'g',
      costPerUnit: 0.002, // $2 per kg
    }
  })

  const sugar = await prisma.ingredient.create({
    data: {
      name: 'Granulated sugar',
      unit: 'g',
      costPerUnit: 0.003, // $3 per kg
    }
  })

  const eggs = await prisma.ingredient.create({
    data: {
      name: 'Large eggs',
      unit: 'piece',
      costPerUnit: 0.50, // $0.50 per egg
    }
  })

  const butter = await prisma.ingredient.create({
    data: {
      name: 'Unsalted butter',
      unit: 'g',
      costPerUnit: 0.008, // $8 per kg
    }
  })

  const milk = await prisma.ingredient.create({
    data: {
      name: 'Whole milk',
      unit: 'ml',
      costPerUnit: 0.002, // $2 per liter
    }
  })

  const vanillaExtract = await prisma.ingredient.create({
    data: {
      name: 'Vanilla extract',
      unit: 'ml',
      costPerUnit: 0.04, // $40 per liter
    }
  })

  const powderedSugar = await prisma.ingredient.create({
    data: {
      name: 'Powdered sugar',
      unit: 'g',
      costPerUnit: 0.004, // $4 per kg
    }
  })

  const cocoa = await prisma.ingredient.create({
    data: {
      name: 'Cocoa powder',
      unit: 'g',
      costPerUnit: 0.015, // $15 per kg
    }
  })

  // Create recipes
  const vanillaSponge = await prisma.recipe.create({
    data: {
      name: 'Vanilla Sponge Batter',
      type: RecipeType.BATTER,
      yieldDescription: 'For one 8-inch round layer',
      recipeIngredients: {
        create: [
          { ingredientId: flour.id, quantity: 250 },
          { ingredientId: sugar.id, quantity: 200 },
          { ingredientId: eggs.id, quantity: 4 },
          { ingredientId: butter.id, quantity: 100 },
          { ingredientId: milk.id, quantity: 120 },
          { ingredientId: vanillaExtract.id, quantity: 10 },
        ]
      }
    }
  })

  const chocolateSponge = await prisma.recipe.create({
    data: {
      name: 'Chocolate Sponge Batter',
      type: RecipeType.BATTER,
      yieldDescription: 'For one 8-inch round layer',
      recipeIngredients: {
        create: [
          { ingredientId: flour.id, quantity: 200 },
          { ingredientId: cocoa.id, quantity: 50 },
          { ingredientId: sugar.id, quantity: 250 },
          { ingredientId: eggs.id, quantity: 4 },
          { ingredientId: butter.id, quantity: 100 },
          { ingredientId: milk.id, quantity: 150 },
          { ingredientId: vanillaExtract.id, quantity: 10 },
        ]
      }
    }
  })

  const vanillaButtercream = await prisma.recipe.create({
    data: {
      name: 'Vanilla Buttercream',
      type: RecipeType.FROSTING,
      yieldDescription: 'For frosting one 8-inch round cake',
      recipeIngredients: {
        create: [
          { ingredientId: butter.id, quantity: 250 },
          { ingredientId: powderedSugar.id, quantity: 500 },
          { ingredientId: milk.id, quantity: 50 },
          { ingredientId: vanillaExtract.id, quantity: 10 },
        ]
      }
    }
  })

  const chocolateButtercream = await prisma.recipe.create({
    data: {
      name: 'Chocolate Buttercream',
      type: RecipeType.FROSTING,
      yieldDescription: 'For frosting one 8-inch round cake',
      recipeIngredients: {
        create: [
          { ingredientId: butter.id, quantity: 250 },
          { ingredientId: powderedSugar.id, quantity: 400 },
          { ingredientId: cocoa.id, quantity: 75 },
          { ingredientId: milk.id, quantity: 60 },
          { ingredientId: vanillaExtract.id, quantity: 10 },
        ]
      }
    }
  })

  const strawberryFilling = await prisma.recipe.create({
    data: {
      name: 'Strawberry Jam Filling',
      type: RecipeType.FILLING,
      yieldDescription: 'For filling between 8-inch layers',
      recipeIngredients: {
        create: [] // Could add strawberry jam as ingredient
      }
    }
  })

  // Create tier sizes
  const tier6 = await prisma.tierSize.create({
    data: {
      name: '6 inch round',
      diameterCm: 15.24,
      heightCm: 10.16,
      servings: 12,
      batterRecipeId: vanillaSponge.id,
      batterMultiplier: 0.5,
      frostingRecipeId: vanillaButtercream.id,
      frostingMultiplier: 0.5,
    }
  })

  const tier8 = await prisma.tierSize.create({
    data: {
      name: '8 inch round',
      diameterCm: 20.32,
      heightCm: 10.16,
      servings: 24,
      batterRecipeId: vanillaSponge.id,
      batterMultiplier: 1.0,
      frostingRecipeId: vanillaButtercream.id,
      frostingMultiplier: 1.0,
    }
  })

  const tier10 = await prisma.tierSize.create({
    data: {
      name: '10 inch round',
      diameterCm: 25.40,
      heightCm: 10.16,
      servings: 38,
      batterRecipeId: vanillaSponge.id,
      batterMultiplier: 1.5,
      frostingRecipeId: vanillaButtercream.id,
      frostingMultiplier: 1.5,
    }
  })

  const tier12 = await prisma.tierSize.create({
    data: {
      name: '12 inch round',
      diameterCm: 30.48,
      heightCm: 10.16,
      servings: 56,
      batterRecipeId: vanillaSponge.id,
      batterMultiplier: 2.0,
      frostingRecipeId: vanillaButtercream.id,
      frostingMultiplier: 2.0,
    }
  })

  // Create decoration materials
  await prisma.decorationMaterial.create({
    data: {
      name: 'White fondant',
      unit: 'g',
      costPerUnit: 0.01, // $10 per kg
      usageRuleType: UsageRuleType.FONDANT_PER_SURFACE_AREA,
      usageRuleValue: 0.5, // 0.5g per cm²
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Cake board (8 inch)',
      unit: 'piece',
      costPerUnit: 2.50,
      usageRuleType: UsageRuleType.MANUAL,
      usageRuleValue: 1,
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Cake board (10 inch)',
      unit: 'piece',
      costPerUnit: 3.00,
      usageRuleType: UsageRuleType.MANUAL,
      usageRuleValue: 1,
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Cake board (12 inch)',
      unit: 'piece',
      costPerUnit: 3.50,
      usageRuleType: UsageRuleType.MANUAL,
      usageRuleValue: 1,
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Wooden dowel',
      unit: 'piece',
      costPerUnit: 0.25,
      usageRuleType: UsageRuleType.PER_TIER,
      usageRuleValue: 4, // 4 dowels per tier (except top)
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Edible pearls',
      unit: 'g',
      costPerUnit: 0.05, // $50 per kg
      usageRuleType: UsageRuleType.MANUAL,
      usageRuleValue: 50, // Default 50g per cake
    }
  })

  await prisma.decorationMaterial.create({
    data: {
      name: 'Ribbon',
      unit: 'meter',
      costPerUnit: 1.50,
      usageRuleType: UsageRuleType.PER_TIER,
      usageRuleValue: 0.75, // 0.75 meters per tier
    }
  })

  // Create settings
  await prisma.setting.create({
    data: {
      key: 'LaborRatePerHour',
      value: '25', // $25 per hour
    }
  })

  await prisma.setting.create({
    data: {
      key: 'MarkupPercent',
      value: '0.7', // 70% markup
    }
  })

  // Create sample order
  const sampleOrder = await prisma.cakeOrder.create({
    data: {
      customerName: 'Jane Smith',
      eventDate: new Date('2024-12-25'),
      notes: 'Wedding cake - elegant white design with edible pearls',
      servingsTarget: 75,
      estimatedHours: 8,
      status: OrderStatus.DRAFT,
      cakeTiers: {
        create: [
          {
            tierIndex: 1,
            tierSizeId: tier10.id,
            flavor: 'Vanilla',
            filling: 'Strawberry',
            finishType: 'Fondant',
          },
          {
            tierIndex: 2,
            tierSizeId: tier8.id,
            flavor: 'Chocolate',
            filling: 'Chocolate ganache',
            finishType: 'Fondant',
          },
          {
            tierIndex: 3,
            tierSizeId: tier6.id,
            flavor: 'Vanilla',
            filling: 'Vanilla cream',
            finishType: 'Fondant',
          }
        ]
      }
    }
  })

  console.log('Seed completed successfully!')
  console.log(`Created sample order: ${sampleOrder.customerName} - ${sampleOrder.eventDate}`)
}

main()
  .catch((e) => {
    console.error('Error in seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })