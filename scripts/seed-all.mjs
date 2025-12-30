// Complete seed script for testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const now = new Date()

async function main() {
  console.log('Seeding complete test data...\n')

  // 0. Create Ingredients first
  console.log('Creating ingredients...')
  const ingredients = [
    { name: 'All-Purpose Flour', unit: 'g', costPerUnit: 0.002 },
    { name: 'Granulated Sugar', unit: 'g', costPerUnit: 0.003 },
    { name: 'Unsalted Butter', unit: 'g', costPerUnit: 0.012 },
    { name: 'Eggs', unit: 'each', costPerUnit: 0.25 },
    { name: 'Vanilla Extract', unit: 'ml', costPerUnit: 0.15 },
    { name: 'Baking Powder', unit: 'g', costPerUnit: 0.02 },
    { name: 'Salt', unit: 'g', costPerUnit: 0.001 },
    { name: 'Whole Milk', unit: 'ml', costPerUnit: 0.003 },
    { name: 'Cocoa Powder', unit: 'g', costPerUnit: 0.03 },
    { name: 'Powdered Sugar', unit: 'g', costPerUnit: 0.004 },
    { name: 'Heavy Cream', unit: 'ml', costPerUnit: 0.008 },
    { name: 'Strawberry Jam', unit: 'g', costPerUnit: 0.01 },
  ]
  const ingredientMap = {}
  for (const ing of ingredients) {
    const ingredient = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: { ...ing, updatedAt: now }
    })
    ingredientMap[ing.name] = ingredient.id
  }
  console.log('  Created 12 ingredients')

  // 1. Create Recipes
  console.log('Creating recipes...')
  const vanillaBatter = await prisma.recipe.upsert({
    where: { name: 'Vanilla Sponge Batter' },
    update: { instructions: '1. Preheat oven to 350°F (175°C)\n2. Cream butter and sugar until light and fluffy\n3. Add eggs one at a time, beating well after each\n4. Mix in vanilla extract\n5. Combine flour, baking powder, and salt\n6. Alternate adding dry ingredients and milk\n7. Pour into prepared pans and bake 25-30 minutes' },
    create: {
      name: 'Vanilla Sponge Batter',
      type: 'BATTER',
      yieldDescription: '1000g batter',
      yieldVolumeMl: 1000,
      prepMinutes: 15,
      bakeMinutes: 30,
      coolMinutes: 20,
      instructions: '1. Preheat oven to 350°F (175°C)\n2. Cream butter and sugar until light and fluffy\n3. Add eggs one at a time, beating well after each\n4. Mix in vanilla extract\n5. Combine flour, baking powder, and salt\n6. Alternate adding dry ingredients and milk\n7. Pour into prepared pans and bake 25-30 minutes',
      updatedAt: now
    }
  })
  const chocolateBatter = await prisma.recipe.upsert({
    where: { name: 'Chocolate Sponge Batter' },
    update: { instructions: '1. Preheat oven to 350°F (175°C)\n2. Sift flour and cocoa powder together\n3. Cream butter and sugar until fluffy\n4. Add eggs and vanilla\n5. Alternate adding dry ingredients and milk\n6. Pour into prepared pans and bake 30-35 minutes' },
    create: {
      name: 'Chocolate Sponge Batter',
      type: 'BATTER',
      yieldDescription: '1000g batter',
      yieldVolumeMl: 1000,
      prepMinutes: 15,
      bakeMinutes: 35,
      coolMinutes: 20,
      instructions: '1. Preheat oven to 350°F (175°C)\n2. Sift flour and cocoa powder together\n3. Cream butter and sugar until fluffy\n4. Add eggs and vanilla\n5. Alternate adding dry ingredients and milk\n6. Pour into prepared pans and bake 30-35 minutes',
      updatedAt: now
    }
  })
  const vanillaBC = await prisma.recipe.upsert({
    where: { name: 'Vanilla Buttercream' },
    update: { instructions: '1. Beat softened butter until pale and creamy (5 min)\n2. Gradually add powdered sugar, beating well\n3. Add vanilla extract and heavy cream\n4. Beat on high for 2-3 minutes until fluffy\n5. Adjust consistency with more cream or sugar as needed' },
    create: {
      name: 'Vanilla Buttercream',
      type: 'FROSTING',
      yieldDescription: '800g frosting',
      yieldVolumeMl: 800,
      prepMinutes: 10,
      instructions: '1. Beat softened butter until pale and creamy (5 min)\n2. Gradually add powdered sugar, beating well\n3. Add vanilla extract and heavy cream\n4. Beat on high for 2-3 minutes until fluffy\n5. Adjust consistency with more cream or sugar as needed',
      updatedAt: now
    }
  })
  const chocolateBC = await prisma.recipe.upsert({
    where: { name: 'Chocolate Buttercream' },
    update: { instructions: '1. Beat softened butter until creamy\n2. Sift together powdered sugar and cocoa powder\n3. Gradually add to butter, beating well\n4. Add vanilla and cream\n5. Beat until smooth and spreadable' },
    create: {
      name: 'Chocolate Buttercream',
      type: 'FROSTING',
      yieldDescription: '800g frosting',
      yieldVolumeMl: 800,
      prepMinutes: 10,
      instructions: '1. Beat softened butter until creamy\n2. Sift together powdered sugar and cocoa powder\n3. Gradually add to butter, beating well\n4. Add vanilla and cream\n5. Beat until smooth and spreadable',
      updatedAt: now
    }
  })
  const strawberryFilling = await prisma.recipe.upsert({
    where: { name: 'Strawberry Jam Filling' },
    update: { instructions: '1. Warm strawberry jam slightly\n2. Spread evenly between cake layers\n3. Let set before stacking' },
    create: {
      name: 'Strawberry Jam Filling',
      type: 'FILLING',
      yieldDescription: '500g filling',
      yieldVolumeMl: 500,
      prepMinutes: 5,
      instructions: '1. Warm strawberry jam slightly\n2. Spread evenly between cake layers\n3. Let set before stacking',
      updatedAt: now
    }
  })
  console.log('  Created 5 recipes')

  // 2. Create Recipe Ingredients (unit is on Ingredient model, not here)
  console.log('Creating recipe ingredients...')
  const recipeIngredients = [
    // Vanilla Batter
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['All-Purpose Flour'], quantity: 280 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Granulated Sugar'], quantity: 300 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Unsalted Butter'], quantity: 225 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Eggs'], quantity: 4 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Vanilla Extract'], quantity: 10 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Baking Powder'], quantity: 12 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Salt'], quantity: 5 },
    { recipeId: vanillaBatter.id, ingredientId: ingredientMap['Whole Milk'], quantity: 180 },
    // Chocolate Batter
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['All-Purpose Flour'], quantity: 250 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Granulated Sugar'], quantity: 350 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Unsalted Butter'], quantity: 200 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Eggs'], quantity: 4 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Cocoa Powder'], quantity: 75 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Baking Powder'], quantity: 10 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Salt'], quantity: 5 },
    { recipeId: chocolateBatter.id, ingredientId: ingredientMap['Whole Milk'], quantity: 200 },
    // Vanilla Buttercream
    { recipeId: vanillaBC.id, ingredientId: ingredientMap['Unsalted Butter'], quantity: 340 },
    { recipeId: vanillaBC.id, ingredientId: ingredientMap['Powdered Sugar'], quantity: 450 },
    { recipeId: vanillaBC.id, ingredientId: ingredientMap['Vanilla Extract'], quantity: 15 },
    { recipeId: vanillaBC.id, ingredientId: ingredientMap['Heavy Cream'], quantity: 45 },
    // Chocolate Buttercream
    { recipeId: chocolateBC.id, ingredientId: ingredientMap['Unsalted Butter'], quantity: 340 },
    { recipeId: chocolateBC.id, ingredientId: ingredientMap['Powdered Sugar'], quantity: 400 },
    { recipeId: chocolateBC.id, ingredientId: ingredientMap['Cocoa Powder'], quantity: 60 },
    { recipeId: chocolateBC.id, ingredientId: ingredientMap['Vanilla Extract'], quantity: 10 },
    { recipeId: chocolateBC.id, ingredientId: ingredientMap['Heavy Cream'], quantity: 60 },
    // Strawberry Filling
    { recipeId: strawberryFilling.id, ingredientId: ingredientMap['Strawberry Jam'], quantity: 500 },
  ]
  // Clear existing recipe ingredients first
  await prisma.recipeIngredient.deleteMany({})
  for (const ri of recipeIngredients) {
    await prisma.recipeIngredient.create({
      data: { ...ri, updatedAt: now }
    })
  }
  console.log('  Created 26 recipe ingredients')

  // 2. Create Tier Sizes
  console.log('Creating tier sizes...')
  const sizes = [
    { name: '6 inch round', shape: 'round', diameterCm: 15, heightCm: 10, servings: 12 },
    { name: '8 inch round', shape: 'round', diameterCm: 20, heightCm: 10, servings: 24 },
    { name: '10 inch round', shape: 'round', diameterCm: 25, heightCm: 10, servings: 38 },
    { name: '12 inch round', shape: 'round', diameterCm: 30, heightCm: 10, servings: 56 },
    { name: '10 inch square', shape: 'square', diameterCm: 25, heightCm: 10, servings: 50 },
  ]
  for (const size of sizes) {
    await prisma.tierSize.upsert({
      where: { name: size.name },
      update: {},
      create: { ...size, updatedAt: now }
    })
  }
  console.log('  Created 5 tier sizes')

  // 3. Create Customers
  console.log('Creating customers...')
  const customers = [
    { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101' },
    { name: 'Mike Thompson', email: 'mike@example.com', phone: '555-0102' },
    { name: 'Emily Chen', email: 'emily@example.com', phone: '555-0103' },
    { name: 'David Wilson', email: 'david@example.com', phone: '555-0104' },
    { name: 'Jessica Brown', email: 'jessica@example.com', phone: '555-0105' },
    { name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0106' },
  ]
  const customerRecords = []
  for (const c of customers) {
    const customer = await prisma.customer.create({
      data: { ...c, updatedAt: now }
    })
    customerRecords.push(customer)
  }
  console.log('  Created 6 customers')

  // 4. Get IDs for tier sizes
  const tierSizes = await prisma.tierSize.findMany()
  const sizeMap = {}
  for (const s of tierSizes) {
    sizeMap[s.name] = s.id
  }

  // 5. Delete existing orders
  console.log('Cleaning up old orders...')
  await prisma.cakeOrder.deleteMany({})
  console.log('  Deleted old orders')

  // 6. Create Test Orders
  console.log('Creating test orders...')
  const addDays = (d, days) => {
    const result = new Date(d)
    result.setDate(result.getDate() + days)
    return result
  }
  const today = new Date()

  const CAKE_IMAGES = [
    '/test-photos/IMG_0530.jpeg',
    '/test-photos/IMG_1112.jpeg',
    '/test-photos/IMG_1256.jpeg',
    '/test-photos/IMG_1269.jpeg',
    '/test-photos/IMG_1395.jpeg',
    '/test-photos/IMG_1764.jpeg',
    '/test-photos/IMG_1786.jpeg',
    '/test-photos/IMG_2313.jpeg',
    '/test-photos/IMG_2890.JPG',
    '/test-photos/IMG_2899.jpeg',
    '/test-photos/IMG_2972.JPG',
    '/test-photos/IMG_2975.JPG',
    '/test-photos/IMG_3021.JPG',
    '/test-photos/IMG_4317.JPG',
    '/test-photos/IMG_4713.JPG',
  ]

  const testOrders = [
    // Day 2 - Give some lead time
    {
      customerId: customerRecords[0].id,
      customerName: 'Sarah Johnson',
      eventDate: addDays(today, 2),
      occasion: 'Birthday Party',
      theme: 'Princess Theme',
      notes: '5-year-old birthday. Pink and purple colors.',
      imageUrl: CAKE_IMAGES[0],
      isDelivery: true,
      deliveryAddress: '123 Oak Street',
      colors: 'Pink, Purple, Gold',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, fillingRecipeId: strawberryFilling.id, finishType: 'Buttercream - Textured' }
      ]
    },
    {
      customerId: customerRecords[4].id,
      customerName: 'Jessica Brown',
      eventDate: addDays(today, 2),
      occasion: 'Graduation',
      theme: 'Class of 2025',
      notes: 'High school graduation.',
      imageUrl: CAKE_IMAGES[1],
      isDelivery: false,
      colors: 'Blue, White',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Smooth' }
      ]
    },
    // Day 3 - Wedding (3-tier)
    {
      customerId: customerRecords[1].id,
      customerName: 'Mike Thompson',
      eventDate: addDays(today, 3),
      occasion: 'Wedding',
      theme: 'Elegant White',
      notes: '3-tier wedding cake. White fondant with gold accents.',
      imageUrl: CAKE_IMAGES[2],
      isDelivery: true,
      deliveryAddress: '456 Maple Ave, Grand Ballroom',
      colors: 'White, Gold',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Fondant' },
        { tierIndex: 1, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Fondant' },
        { tierIndex: 2, tierSizeId: sizeMap['6 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Fondant' }
      ]
    },
    // Day 4
    {
      customerId: customerRecords[2].id,
      customerName: 'Emily Chen',
      eventDate: addDays(today, 4),
      occasion: 'Corporate Event',
      theme: 'Modern Geometric',
      notes: 'Company anniversary cake.',
      imageUrl: CAKE_IMAGES[3],
      isDelivery: false,
      colors: 'Navy Blue, White',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch square'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Buttercream - Smooth' },
        { tierIndex: 1, tierSizeId: sizeMap['8 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Buttercream - Smooth' }
      ]
    },
    {
      customerId: customerRecords[5].id,
      customerName: 'Alex Martinez',
      eventDate: addDays(today, 4),
      occasion: 'Retirement Party',
      theme: 'Golf Course',
      notes: 'Golf themed retirement cake.',
      imageUrl: CAKE_IMAGES[4],
      isDelivery: true,
      deliveryAddress: '321 Country Club Lane',
      colors: 'Green, White',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Textured' }
      ]
    },
    // Day 5
    {
      customerId: customerRecords[3].id,
      customerName: 'David Wilson',
      eventDate: addDays(today, 5),
      occasion: 'Baby Shower',
      theme: 'Teddy Bears',
      notes: 'Gender reveal inside! Blue filling.',
      imageUrl: CAKE_IMAGES[5],
      isDelivery: true,
      deliveryAddress: '789 Pine Road',
      colors: 'Yellow, White, Brown',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, fillingRecipeId: strawberryFilling.id, finishType: 'Fondant' }
      ]
    },
    // Day 6
    {
      customerId: customerRecords[0].id,
      customerName: 'Sarah Johnson',
      eventDate: addDays(today, 6),
      occasion: 'Anniversary',
      theme: 'Romantic Roses',
      notes: '25th wedding anniversary.',
      imageUrl: CAKE_IMAGES[6],
      isDelivery: false,
      colors: 'Red, White, Gold',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, fillingRecipeId: strawberryFilling.id, finishType: 'Buttercream - Textured' },
        { tierIndex: 1, tierSizeId: sizeMap['6 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Buttercream - Textured' }
      ]
    },
    {
      customerId: customerRecords[4].id,
      customerName: 'Jessica Brown',
      eventDate: addDays(today, 6),
      occasion: 'Birthday',
      theme: 'Unicorn Magic',
      notes: '8-year-old birthday.',
      imageUrl: CAKE_IMAGES[7],
      isDelivery: true,
      deliveryAddress: '555 Rainbow Lane',
      colors: 'Pink, Purple, Blue, Rainbow',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Textured' }
      ]
    },
    // Day 7
    {
      customerId: customerRecords[1].id,
      customerName: 'Mike Thompson',
      eventDate: addDays(today, 7),
      occasion: 'Birthday',
      theme: 'Sports Theme',
      notes: 'Football themed cake.',
      imageUrl: CAKE_IMAGES[8],
      isDelivery: false,
      colors: 'Green, Brown, White',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Fondant' }
      ]
    },
    // Day 8
    {
      customerId: customerRecords[2].id,
      customerName: 'Emily Chen',
      eventDate: addDays(today, 8),
      occasion: 'Bridal Shower',
      theme: 'Garden Party',
      notes: 'Elegant floral design.',
      imageUrl: CAKE_IMAGES[9],
      isDelivery: true,
      deliveryAddress: '888 Garden Way',
      colors: 'Blush, Sage, Cream',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Smooth' },
        { tierIndex: 1, tierSizeId: sizeMap['6 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Smooth' }
      ]
    },
    {
      customerId: customerRecords[5].id,
      customerName: 'Alex Martinez',
      eventDate: addDays(today, 8),
      occasion: 'Birthday',
      theme: 'Chocolate Lovers',
      notes: 'All chocolate everything!',
      imageUrl: CAKE_IMAGES[10],
      isDelivery: false,
      colors: 'Brown, Gold',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Buttercream - Textured' }
      ]
    },
    // Week 2
    {
      customerId: customerRecords[3].id,
      customerName: 'David Wilson',
      eventDate: addDays(today, 10),
      occasion: 'Birthday',
      theme: 'Superhero',
      notes: '6-year-old birthday. Spider-Man theme.',
      imageUrl: CAKE_IMAGES[11],
      isDelivery: true,
      deliveryAddress: '222 Hero Street',
      colors: 'Red, Blue, Black',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['10 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Fondant' }
      ]
    },
    {
      customerId: customerRecords[0].id,
      customerName: 'Sarah Johnson',
      eventDate: addDays(today, 11),
      occasion: 'Baptism',
      theme: 'Heavenly',
      notes: 'Religious symbols. Cross topper.',
      imageUrl: CAKE_IMAGES[12],
      isDelivery: true,
      deliveryAddress: '100 Church Lane',
      colors: 'White, Blue, Gold',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Fondant' }
      ]
    },
    // Big wedding - 4 tier
    {
      customerId: customerRecords[4].id,
      customerName: 'Jessica Brown',
      eventDate: addDays(today, 13),
      occasion: 'Wedding',
      theme: 'Rustic Elegance',
      notes: '4-tier wedding cake. Naked cake style with berries.',
      imageUrl: CAKE_IMAGES[13],
      isDelivery: true,
      deliveryAddress: '500 Barn Road, Wedding Venue',
      colors: 'White, Green, Berry',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['12 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Naked' },
        { tierIndex: 1, tierSizeId: sizeMap['10 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Naked' },
        { tierIndex: 2, tierSizeId: sizeMap['8 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Naked' },
        { tierIndex: 3, tierSizeId: sizeMap['6 inch round'], batterRecipeId: vanillaBatter.id, frostingRecipeId: vanillaBC.id, finishType: 'Buttercream - Naked' }
      ]
    },
    {
      customerId: customerRecords[5].id,
      customerName: 'Alex Martinez',
      eventDate: addDays(today, 14),
      occasion: 'Birthday',
      theme: 'Classic Elegance',
      notes: 'Sophisticated adult birthday.',
      imageUrl: CAKE_IMAGES[14],
      isDelivery: false,
      colors: 'Black, Gold, White',
      tiers: [
        { tierIndex: 0, tierSizeId: sizeMap['8 inch round'], batterRecipeId: chocolateBatter.id, frostingRecipeId: chocolateBC.id, finishType: 'Buttercream - Smooth' }
      ]
    }
  ]

  for (const orderData of testOrders) {
    const { tiers, ...orderFields } = orderData

    const order = await prisma.cakeOrder.create({
      data: {
        ...orderFields,
        status: 'CONFIRMED',
        estimatedHours: tiers.length * 2,
        updatedAt: now,
        CakeTier: {
          create: tiers.map(tier => ({
            ...tier,
            batterMultiplier: 1.0,
            frostingMultiplier: 1.0,
            fillingMultiplier: tier.fillingRecipeId ? 1.0 : null,
            frostingComplexity: 2,
            updatedAt: now,
          }))
        }
      },
      include: { CakeTier: true }
    })

    console.log(`  Order #${order.id}: ${orderFields.customerName} - ${orderFields.occasion} (${tiers.length} tier${tiers.length > 1 ? 's' : ''}) - ${orderFields.eventDate.toDateString()}`)
  }

  console.log(`\nDone! Created ${testOrders.length} test orders.`)
  console.log('\nYou can now test the batch planner at http://localhost:3000/production/batch-planner')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
