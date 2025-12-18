import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding products, menu items, and packaging...')

  // Get or create Baker labor role
  let bakerRole = await prisma.laborRole.findFirst({ where: { name: 'Baker' } })
  if (!bakerRole) {
    bakerRole = await prisma.laborRole.create({
      data: {
        name: 'Baker',
        description: 'Baking, mixing, and assembly work',
        hourlyRate: 25.00,
        sortOrder: 1
      }
    })
  }

  // ============================================
  // SAMPLE RECIPES FOR CUPCAKES & CAKE POPS
  // ============================================

  // First, ensure we have basic ingredients
  const ingredients = [
    { name: 'All-Purpose Flour', unit: 'g', costPerUnit: 0.002 },
    { name: 'Granulated Sugar', unit: 'g', costPerUnit: 0.001 },
    { name: 'Butter (unsalted)', unit: 'g', costPerUnit: 0.012 },
    { name: 'Eggs (large)', unit: 'each', costPerUnit: 0.25 },
    { name: 'Vanilla Extract', unit: 'ml', costPerUnit: 0.15 },
    { name: 'Baking Powder', unit: 'g', costPerUnit: 0.02 },
    { name: 'Salt', unit: 'g', costPerUnit: 0.001 },
    { name: 'Whole Milk', unit: 'ml', costPerUnit: 0.003 },
    { name: 'Cocoa Powder', unit: 'g', costPerUnit: 0.025 },
    { name: 'Powdered Sugar', unit: 'g', costPerUnit: 0.003 },
    { name: 'Heavy Cream', unit: 'ml', costPerUnit: 0.008 },
    { name: 'Cream Cheese', unit: 'g', costPerUnit: 0.01 },
    { name: 'Red Food Coloring', unit: 'ml', costPerUnit: 0.50 },
    { name: 'Buttermilk', unit: 'ml', costPerUnit: 0.005 },
    { name: 'Candy Melts (white)', unit: 'g', costPerUnit: 0.015 },
    { name: 'Candy Melts (chocolate)', unit: 'g', costPerUnit: 0.015 },
    { name: 'Lollipop Sticks', unit: 'each', costPerUnit: 0.03 },
    { name: 'Sprinkles', unit: 'g', costPerUnit: 0.05 }
  ]

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { costPerUnit: ing.costPerUnit },
      create: ing
    })
  }
  console.log('✓ Ingredients created/updated')

  // Get ingredient IDs
  const allIngredients = await prisma.ingredient.findMany()
  const ingMap = Object.fromEntries(allIngredients.map(i => [i.name, i.id]))

  // Cupcake Batter Recipe (yields 24 cupcakes)
  const vanillaCupcakeBatter = await prisma.recipe.upsert({
    where: { name: 'Vanilla Cupcake Batter' },
    update: {},
    create: {
      name: 'Vanilla Cupcake Batter',
      type: 'BATTER',
      yieldDescription: 'Makes 24 standard cupcakes',
      yieldVolumeMl: 1500, // ~1.5L batter
      prepMinutes: 15,
      bakeMinutes: 22,
      coolMinutes: 30,
      laborMinutes: 45,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['All-Purpose Flour'], quantity: 300 },
          { ingredientId: ingMap['Granulated Sugar'], quantity: 300 },
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 170 },
          { ingredientId: ingMap['Eggs (large)'], quantity: 4 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 },
          { ingredientId: ingMap['Baking Powder'], quantity: 12 },
          { ingredientId: ingMap['Salt'], quantity: 3 },
          { ingredientId: ingMap['Whole Milk'], quantity: 240 }
        ]
      }
    }
  })

  const chocolateCupcakeBatter = await prisma.recipe.upsert({
    where: { name: 'Chocolate Cupcake Batter' },
    update: {},
    create: {
      name: 'Chocolate Cupcake Batter',
      type: 'BATTER',
      yieldDescription: 'Makes 24 standard cupcakes',
      yieldVolumeMl: 1500,
      prepMinutes: 15,
      bakeMinutes: 22,
      coolMinutes: 30,
      laborMinutes: 45,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['All-Purpose Flour'], quantity: 250 },
          { ingredientId: ingMap['Granulated Sugar'], quantity: 350 },
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 115 },
          { ingredientId: ingMap['Eggs (large)'], quantity: 3 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 },
          { ingredientId: ingMap['Cocoa Powder'], quantity: 75 },
          { ingredientId: ingMap['Baking Powder'], quantity: 8 },
          { ingredientId: ingMap['Salt'], quantity: 5 },
          { ingredientId: ingMap['Buttermilk'], quantity: 240 }
        ]
      }
    }
  })

  const redVelvetBatter = await prisma.recipe.upsert({
    where: { name: 'Red Velvet Cupcake Batter' },
    update: {},
    create: {
      name: 'Red Velvet Cupcake Batter',
      type: 'BATTER',
      yieldDescription: 'Makes 24 standard cupcakes',
      yieldVolumeMl: 1500,
      prepMinutes: 20,
      bakeMinutes: 22,
      coolMinutes: 30,
      laborMinutes: 50,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['All-Purpose Flour'], quantity: 325 },
          { ingredientId: ingMap['Granulated Sugar'], quantity: 300 },
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 115 },
          { ingredientId: ingMap['Eggs (large)'], quantity: 2 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 },
          { ingredientId: ingMap['Cocoa Powder'], quantity: 20 },
          { ingredientId: ingMap['Salt'], quantity: 5 },
          { ingredientId: ingMap['Buttermilk'], quantity: 240 },
          { ingredientId: ingMap['Red Food Coloring'], quantity: 30 }
        ]
      }
    }
  })

  // Frosting recipes
  const vanillaButtercream = await prisma.recipe.upsert({
    where: { name: 'Vanilla Buttercream (Cupcake)' },
    update: {},
    create: {
      name: 'Vanilla Buttercream (Cupcake)',
      type: 'FROSTING',
      yieldDescription: 'Frosts 24 cupcakes',
      yieldVolumeMl: 900,
      prepMinutes: 10,
      laborMinutes: 10,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 340 },
          { ingredientId: ingMap['Powdered Sugar'], quantity: 500 },
          { ingredientId: ingMap['Heavy Cream'], quantity: 60 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 15 }
        ]
      }
    }
  })

  const chocolateButtercream = await prisma.recipe.upsert({
    where: { name: 'Chocolate Buttercream (Cupcake)' },
    update: {},
    create: {
      name: 'Chocolate Buttercream (Cupcake)',
      type: 'FROSTING',
      yieldDescription: 'Frosts 24 cupcakes',
      yieldVolumeMl: 950,
      prepMinutes: 12,
      laborMinutes: 12,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 340 },
          { ingredientId: ingMap['Powdered Sugar'], quantity: 450 },
          { ingredientId: ingMap['Cocoa Powder'], quantity: 80 },
          { ingredientId: ingMap['Heavy Cream'], quantity: 90 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 }
        ]
      }
    }
  })

  const creamCheeseFrosting = await prisma.recipe.upsert({
    where: { name: 'Cream Cheese Frosting (Cupcake)' },
    update: {},
    create: {
      name: 'Cream Cheese Frosting (Cupcake)',
      type: 'FROSTING',
      yieldDescription: 'Frosts 24 cupcakes',
      yieldVolumeMl: 850,
      prepMinutes: 10,
      laborMinutes: 10,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['Cream Cheese'], quantity: 450 },
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 115 },
          { ingredientId: ingMap['Powdered Sugar'], quantity: 400 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 }
        ]
      }
    }
  })

  // Cake Pop recipe (uses cake scraps + frosting, yields ~48 pops)
  const cakePopBase = await prisma.recipe.upsert({
    where: { name: 'Cake Pop Base' },
    update: {},
    create: {
      name: 'Cake Pop Base',
      type: 'BATTER',
      yieldDescription: 'Makes 48 cake pops',
      yieldVolumeMl: 1200,
      prepMinutes: 30,
      coolMinutes: 60, // Chill time
      laborMinutes: 45,
      laborRoleId: bakerRole.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingMap['All-Purpose Flour'], quantity: 300 },
          { ingredientId: ingMap['Granulated Sugar'], quantity: 250 },
          { ingredientId: ingMap['Butter (unsalted)'], quantity: 170 },
          { ingredientId: ingMap['Eggs (large)'], quantity: 3 },
          { ingredientId: ingMap['Cream Cheese'], quantity: 225 },
          { ingredientId: ingMap['Vanilla Extract'], quantity: 10 }
        ]
      }
    }
  })

  console.log('✓ Recipes created')

  // ============================================
  // PACKAGING
  // ============================================

  const packagingItems = [
    // Cupcake liners
    { name: 'Standard Cupcake Liner (White)', type: 'LINER', capacity: 1, sizeFit: 'standard cupcake', costPerUnit: 0.03 },
    { name: 'Standard Cupcake Liner (Brown Kraft)', type: 'LINER', capacity: 1, sizeFit: 'standard cupcake', costPerUnit: 0.04 },
    { name: 'Foil Cupcake Liner (Gold)', type: 'LINER', capacity: 1, sizeFit: 'standard cupcake', costPerUnit: 0.08 },
    { name: 'Mini Cupcake Liner (White)', type: 'LINER', capacity: 1, sizeFit: 'mini cupcake', costPerUnit: 0.02 },

    // Cupcake boxes
    { name: '4-Count Cupcake Box', type: 'BOX', capacity: 4, sizeFit: 'standard cupcake', costPerUnit: 0.85 },
    { name: '6-Count Cupcake Box', type: 'BOX', capacity: 6, sizeFit: 'standard cupcake', costPerUnit: 1.10 },
    { name: '12-Count Cupcake Box', type: 'BOX', capacity: 12, sizeFit: 'standard cupcake', costPerUnit: 1.50 },
    { name: '24-Count Cupcake Box', type: 'BOX', capacity: 24, sizeFit: 'standard cupcake', costPerUnit: 2.25 },
    { name: 'Individual Cupcake Container', type: 'CONTAINER', capacity: 1, sizeFit: 'standard cupcake', costPerUnit: 0.45 },

    // Cupcake inserts
    { name: '4-Count Cupcake Insert', type: 'INSERT', capacity: 4, sizeFit: 'standard cupcake', costPerUnit: 0.25 },
    { name: '6-Count Cupcake Insert', type: 'INSERT', capacity: 6, sizeFit: 'standard cupcake', costPerUnit: 0.35 },
    { name: '12-Count Cupcake Insert', type: 'INSERT', capacity: 12, sizeFit: 'standard cupcake', costPerUnit: 0.50 },

    // Cake boxes
    { name: '6" Cake Box', type: 'BOX', capacity: 1, sizeFit: '6" cake', costPerUnit: 1.25 },
    { name: '8" Cake Box', type: 'BOX', capacity: 1, sizeFit: '8" cake', costPerUnit: 1.50 },
    { name: '10" Cake Box', type: 'BOX', capacity: 1, sizeFit: '10" cake', costPerUnit: 1.85 },
    { name: '12" Cake Box', type: 'BOX', capacity: 1, sizeFit: '12" cake', costPerUnit: 2.25 },
    { name: '14" Cake Box (Tall)', type: 'BOX', capacity: 1, sizeFit: '14" cake', costPerUnit: 3.50 },

    // Cake boards
    { name: '6" Cake Board (Gold)', type: 'BOARD', capacity: 1, sizeFit: '6" cake', costPerUnit: 0.75 },
    { name: '8" Cake Board (Gold)', type: 'BOARD', capacity: 1, sizeFit: '8" cake', costPerUnit: 0.95 },
    { name: '10" Cake Board (Gold)', type: 'BOARD', capacity: 1, sizeFit: '10" cake', costPerUnit: 1.25 },
    { name: '12" Cake Drum (White)', type: 'BOARD', capacity: 1, sizeFit: '12" cake', costPerUnit: 2.50 },

    // Cake pop packaging
    { name: 'Cake Pop Bag (Clear)', type: 'BAG', capacity: 1, sizeFit: 'cake pop', costPerUnit: 0.08 },
    { name: 'Cake Pop Box (12-count)', type: 'BOX', capacity: 12, sizeFit: 'cake pop', costPerUnit: 1.75 },
    { name: 'Cake Pop Stand Insert', type: 'INSERT', capacity: 15, sizeFit: 'cake pop', costPerUnit: 1.25 },

    // Gift packaging
    { name: 'Gift Box (Small)', type: 'BOX', capacity: 6, sizeFit: 'assorted treats', costPerUnit: 2.50 },
    { name: 'Gift Box (Large)', type: 'BOX', capacity: 12, sizeFit: 'assorted treats', costPerUnit: 3.75 },
    { name: 'Cellophane Wrap (per foot)', type: 'WRAP', capacity: null, sizeFit: null, costPerUnit: 0.15 },
    { name: 'Ribbon (per yard)', type: 'WRAP', capacity: null, sizeFit: null, costPerUnit: 0.25 }
  ]

  for (const pkg of packagingItems) {
    await prisma.packaging.upsert({
      where: { name: pkg.name },
      update: { costPerUnit: pkg.costPerUnit },
      create: pkg
    })
  }
  console.log('✓ Packaging created')

  // Get packaging IDs
  const allPackaging = await prisma.packaging.findMany()
  const pkgMap = Object.fromEntries(allPackaging.map(p => [p.name, p.id]))

  // ============================================
  // PRODUCT TYPES
  // ============================================

  const cupcakeType = await prisma.productType.upsert({
    where: { name: 'Cupcakes' },
    update: {},
    create: {
      name: 'Cupcakes',
      category: 'Individual',
      baseUnit: 'each',
      description: 'Standard size cupcakes with frosting',
      sortOrder: 1
    }
  })

  const miniCupcakeType = await prisma.productType.upsert({
    where: { name: 'Mini Cupcakes' },
    update: {},
    create: {
      name: 'Mini Cupcakes',
      category: 'Dozen',
      baseUnit: 'dozen',
      description: 'Mini size cupcakes, usually sold by the dozen',
      sortOrder: 2
    }
  })

  const cakePopType = await prisma.productType.upsert({
    where: { name: 'Cake Pops' },
    update: {},
    create: {
      name: 'Cake Pops',
      category: 'Individual',
      baseUnit: 'each',
      description: 'Cake pops on sticks with candy coating',
      sortOrder: 3
    }
  })

  const cookieType = await prisma.productType.upsert({
    where: { name: 'Cookies' },
    update: {},
    create: {
      name: 'Cookies',
      category: 'Dozen',
      baseUnit: 'dozen',
      description: 'Decorated sugar cookies',
      sortOrder: 4
    }
  })

  const brownieType = await prisma.productType.upsert({
    where: { name: 'Brownies' },
    update: {},
    create: {
      name: 'Brownies',
      category: 'Individual',
      baseUnit: 'each',
      description: 'Fudgy brownies, various sizes',
      sortOrder: 5
    }
  })

  console.log('✓ Product types created')

  // ============================================
  // MENU ITEMS
  // ============================================

  const menuItems = [
    // Cupcakes
    {
      productTypeId: cupcakeType.id,
      name: 'Vanilla Cupcake',
      description: 'Classic vanilla cupcake with vanilla buttercream',
      batterRecipeId: vanillaCupcakeBatter.id,
      frostingRecipeId: vanillaButtercream.id,
      yieldsPerRecipe: 24,
      menuPrice: 4.00,
      laborMinutes: 3, // per cupcake for decorating
      decorationLevel: 'decorated',
      defaultPackagingId: pkgMap['Standard Cupcake Liner (White)']
    },
    {
      productTypeId: cupcakeType.id,
      name: 'Chocolate Cupcake',
      description: 'Rich chocolate cupcake with chocolate buttercream',
      batterRecipeId: chocolateCupcakeBatter.id,
      frostingRecipeId: chocolateButtercream.id,
      yieldsPerRecipe: 24,
      menuPrice: 4.00,
      laborMinutes: 3,
      decorationLevel: 'decorated',
      defaultPackagingId: pkgMap['Standard Cupcake Liner (Brown Kraft)']
    },
    {
      productTypeId: cupcakeType.id,
      name: 'Red Velvet Cupcake',
      description: 'Classic red velvet with cream cheese frosting',
      batterRecipeId: redVelvetBatter.id,
      frostingRecipeId: creamCheeseFrosting.id,
      yieldsPerRecipe: 24,
      menuPrice: 4.50,
      laborMinutes: 3,
      decorationLevel: 'decorated',
      defaultPackagingId: pkgMap['Standard Cupcake Liner (White)']
    },
    {
      productTypeId: cupcakeType.id,
      name: 'Premium Decorated Cupcake',
      description: 'Cupcake with fondant topper or intricate piping',
      batterRecipeId: vanillaCupcakeBatter.id,
      frostingRecipeId: vanillaButtercream.id,
      yieldsPerRecipe: 24,
      menuPrice: 6.50,
      laborMinutes: 8, // more decoration time
      decorationLevel: 'premium',
      defaultPackagingId: pkgMap['Foil Cupcake Liner (Gold)']
    },
    // Cake Pops
    {
      productTypeId: cakePopType.id,
      name: 'Vanilla Cake Pop',
      description: 'Vanilla cake pop with white candy coating',
      batterRecipeId: cakePopBase.id,
      yieldsPerRecipe: 48,
      menuPrice: 3.50,
      laborMinutes: 4, // dipping, decorating
      decorationLevel: 'decorated',
      defaultPackagingId: pkgMap['Cake Pop Bag (Clear)']
    },
    {
      productTypeId: cakePopType.id,
      name: 'Chocolate Cake Pop',
      description: 'Chocolate cake pop with chocolate candy coating',
      batterRecipeId: cakePopBase.id,
      yieldsPerRecipe: 48,
      menuPrice: 3.50,
      laborMinutes: 4,
      decorationLevel: 'decorated',
      defaultPackagingId: pkgMap['Cake Pop Bag (Clear)']
    },
    {
      productTypeId: cakePopType.id,
      name: 'Custom Character Cake Pop',
      description: 'Cake pop decorated as a custom character',
      batterRecipeId: cakePopBase.id,
      yieldsPerRecipe: 48,
      menuPrice: 6.00,
      laborMinutes: 12, // detailed decoration
      decorationLevel: 'custom',
      defaultPackagingId: pkgMap['Cake Pop Bag (Clear)']
    }
  ]

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: {
        id: -1 // Force create
      },
      update: {},
      create: {
        ...item,
        laborRoleId: bakerRole.id,
        isActive: true,
        sortOrder: 0
      }
    })
  }

  // Use createMany for menu items since we don't have unique constraint on name
  const existingMenuItems = await prisma.menuItem.findMany()
  if (existingMenuItems.length === 0) {
    for (const item of menuItems) {
      await prisma.menuItem.create({
        data: {
          ...item,
          laborRoleId: bakerRole.id,
          isActive: true,
          sortOrder: 0
        }
      })
    }
    console.log('✓ Menu items created')
  } else {
    console.log('✓ Menu items already exist, skipping')
  }

  console.log('\n🎉 Products and packaging seeded successfully!')
  console.log(`
Summary:
- ${await prisma.ingredient.count()} ingredients
- ${await prisma.recipe.count()} recipes
- ${await prisma.productType.count()} product types
- ${await prisma.menuItem.count()} menu items
- ${await prisma.packaging.count()} packaging items
`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
