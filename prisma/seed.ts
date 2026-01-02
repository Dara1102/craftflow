import { PrismaClient, RecipeType, OrderStatus } from '@prisma/client'

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
      RecipeIngredient: {
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
      RecipeIngredient: {
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
      RecipeIngredient: {
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
      RecipeIngredient: {
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
      RecipeIngredient: {
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
    }
  })

  const tier8 = await prisma.tierSize.create({
    data: {
      name: '8 inch round',
      diameterCm: 20.32,
      heightCm: 10.16,
      servings: 24,
    }
  })

  const tier10 = await prisma.tierSize.create({
    data: {
      name: '10 inch round',
      diameterCm: 25.40,
      heightCm: 10.16,
      servings: 38,
    }
  })

  const tier12 = await prisma.tierSize.create({
    data: {
      name: '12 inch round',
      diameterCm: 30.48,
      heightCm: 10.16,
      servings: 56,
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
      CakeTier: {
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