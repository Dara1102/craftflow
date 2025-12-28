// Seed complete test orders for the next 2 weeks
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample cake images from test-photos folder
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

async function main() {
  console.log('Resetting and creating test orders for the next 2 weeks...\n')

  // Delete existing test orders (based on test customer names)
  const testCustomerNames = ['Sarah Johnson', 'Mike Thompson', 'Emily Chen', 'David Wilson', 'Jessica Brown', 'Alex Martinez']
  await prisma.cakeOrder.deleteMany({
    where: {
      customerName: { in: testCustomerNames }
    }
  })
  console.log('Deleted existing test orders\n')

  // Get existing data
  const tierSizes = await prisma.tierSize.findMany()
  const recipes = await prisma.recipe.findMany()
  const customers = await prisma.customer.findMany()

  console.log('Available tier sizes:', tierSizes.map(t => `${t.id}: ${t.name}`).join(', '))
  console.log('Available recipes:', recipes.map(r => `${r.id}: ${r.name} (${r.type})`).join(', '))
  console.log('Available customers:', customers.map(c => `${c.id}: ${c.name}`).join(', '))
  console.log()

  // Map sizes by name
  const sizeMap = {}
  for (const s of tierSizes) {
    sizeMap[s.name] = s.id
  }

  // Map recipes by name
  const recipeMap = {}
  for (const r of recipes) {
    recipeMap[r.name] = r.id
  }

  // Get or create test customers
  const now = new Date()

  let sarah = customers.find(c => c.name === 'Sarah Johnson')
  if (!sarah) {
    sarah = await prisma.customer.create({
      data: { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0101', updatedAt: now }
    })
  }

  let mike = customers.find(c => c.name === 'Mike Thompson')
  if (!mike) {
    mike = await prisma.customer.create({
      data: { name: 'Mike Thompson', email: 'mike@example.com', phone: '555-0102', updatedAt: now }
    })
  }

  let emily = customers.find(c => c.name === 'Emily Chen')
  if (!emily) {
    emily = await prisma.customer.create({
      data: { name: 'Emily Chen', email: 'emily@example.com', phone: '555-0103', updatedAt: now }
    })
  }

  let david = customers.find(c => c.name === 'David Wilson')
  if (!david) {
    david = await prisma.customer.create({
      data: { name: 'David Wilson', email: 'david@example.com', phone: '555-0104', updatedAt: now }
    })
  }

  // Calculate dates
  const today = new Date()
  const addDays = (d, days) => {
    const result = new Date(d)
    result.setDate(result.getDate() + days)
    return result
  }

  // Create additional test customers
  let jessica = customers.find(c => c.name === 'Jessica Brown')
  if (!jessica) {
    jessica = await prisma.customer.create({
      data: { name: 'Jessica Brown', email: 'jessica@example.com', phone: '555-0105', updatedAt: now }
    })
  }

  let alex = customers.find(c => c.name === 'Alex Martinez')
  if (!alex) {
    alex = await prisma.customer.create({
      data: { name: 'Alex Martinez', email: 'alex@example.com', phone: '555-0106', updatedAt: now }
    })
  }

  // Test orders data - spread across next 2 weeks with images
  const testOrders = [
    // Day 1 - Tomorrow
    {
      customer: sarah,
      eventDate: addDays(today, 1),
      occasion: 'Birthday Party',
      theme: 'Princess Theme',
      notes: '5-year-old birthday. Pink and purple colors. Tiara topper.',
      imageUrl: CAKE_IMAGES[0],
      isDelivery: true,
      deliveryAddress: '123 Oak Street, Springfield',
      deliveryTime: new Date(addDays(today, 1).setHours(14, 0, 0, 0)),
      colors: 'Pink, Purple, Gold',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          fillingRecipeId: recipeMap['Strawberry Jam Filling'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Textured',
        }
      ]
    },
    {
      customer: jessica,
      eventDate: addDays(today, 1),
      occasion: 'Graduation',
      theme: 'Class of 2025',
      notes: 'High school graduation. School colors.',
      imageUrl: CAKE_IMAGES[1],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 1).setHours(10, 0, 0, 0)),
      colors: 'Blue, White',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Smooth',
        }
      ]
    },
    // Day 2
    {
      customer: mike,
      eventDate: addDays(today, 2),
      occasion: 'Wedding',
      theme: 'Elegant White',
      notes: '3-tier wedding cake. White fondant with gold accents. Fresh flowers on site.',
      imageUrl: CAKE_IMAGES[2],
      isDelivery: true,
      deliveryAddress: '456 Maple Ave, Grand Ballroom',
      deliveryTime: new Date(addDays(today, 2).setHours(10, 0, 0, 0)),
      colors: 'White, Gold',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant',
        },
        {
          tierIndex: 1,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant',
        },
        {
          tierIndex: 2,
          tierSizeId: sizeMap['6 inch round'] || 3,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant',
        }
      ]
    },
    // Day 3
    {
      customer: emily,
      eventDate: addDays(today, 3),
      occasion: 'Corporate Event',
      theme: 'Modern Geometric',
      notes: 'Company anniversary cake. Logo printed on top. Clean modern look.',
      imageUrl: CAKE_IMAGES[3],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 3).setHours(9, 0, 0, 0)),
      colors: 'Navy Blue, White',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch square'] || 2,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Smooth',
        },
        {
          tierIndex: 1,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Smooth',
        }
      ]
    },
    {
      customer: alex,
      eventDate: addDays(today, 3),
      occasion: 'Retirement Party',
      theme: 'Golf Course',
      notes: 'Golf themed retirement cake. Green grass effect.',
      imageUrl: CAKE_IMAGES[4],
      isDelivery: true,
      deliveryAddress: '321 Country Club Lane',
      deliveryTime: new Date(addDays(today, 3).setHours(11, 0, 0, 0)),
      colors: 'Green, White',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Textured',
        }
      ]
    },
    // Day 4
    {
      customer: david,
      eventDate: addDays(today, 4),
      occasion: 'Baby Shower',
      theme: 'Teddy Bears',
      notes: 'Gender reveal inside! Blue filling. Cute teddy bear decorations.',
      imageUrl: CAKE_IMAGES[5],
      isDelivery: true,
      deliveryAddress: '789 Pine Road',
      deliveryTime: new Date(addDays(today, 4).setHours(13, 0, 0, 0)),
      colors: 'Yellow, White, Brown',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          fillingRecipeId: recipeMap['Strawberry Jam Filling'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant - Textured',
        }
      ]
    },
    // Day 5
    {
      customer: sarah,
      eventDate: addDays(today, 5),
      occasion: 'Anniversary',
      theme: 'Romantic Roses',
      notes: '25th wedding anniversary. Red roses, elegant script.',
      imageUrl: CAKE_IMAGES[6],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 5).setHours(16, 0, 0, 0)),
      colors: 'Red, White, Gold',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          fillingRecipeId: recipeMap['Strawberry Jam Filling'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Textured',
        },
        {
          tierIndex: 1,
          tierSizeId: sizeMap['6 inch round'] || 3,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Textured',
        }
      ]
    },
    {
      customer: jessica,
      eventDate: addDays(today, 5),
      occasion: 'Birthday',
      theme: 'Unicorn Magic',
      notes: '8-year-old birthday. Rainbow colors, unicorn horn topper.',
      imageUrl: CAKE_IMAGES[7],
      isDelivery: true,
      deliveryAddress: '555 Rainbow Lane',
      deliveryTime: new Date(addDays(today, 5).setHours(12, 0, 0, 0)),
      colors: 'Pink, Purple, Blue, Rainbow',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Textured',
        }
      ]
    },
    // Day 6
    {
      customer: mike,
      eventDate: addDays(today, 6),
      occasion: 'Birthday',
      theme: 'Sports Theme',
      notes: 'Football themed cake. Team colors.',
      imageUrl: CAKE_IMAGES[8],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 6).setHours(15, 0, 0, 0)),
      colors: 'Green, Brown, White',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Fondant',
        }
      ]
    },
    // Day 7
    {
      customer: emily,
      eventDate: addDays(today, 7),
      occasion: 'Bridal Shower',
      theme: 'Garden Party',
      notes: 'Elegant floral design. Pastel colors.',
      imageUrl: CAKE_IMAGES[9],
      isDelivery: true,
      deliveryAddress: '888 Garden Way',
      deliveryTime: new Date(addDays(today, 7).setHours(11, 0, 0, 0)),
      colors: 'Blush, Sage, Cream',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Smooth',
        },
        {
          tierIndex: 1,
          tierSizeId: sizeMap['6 inch round'] || 3,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Smooth',
        }
      ]
    },
    {
      customer: alex,
      eventDate: addDays(today, 7),
      occasion: 'Birthday',
      theme: 'Chocolate Lovers',
      notes: 'All chocolate everything! Rich and decadent.',
      imageUrl: CAKE_IMAGES[10],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 7).setHours(14, 0, 0, 0)),
      colors: 'Brown, Gold',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Textured',
        }
      ]
    },
    // Week 2 orders
    {
      customer: david,
      eventDate: addDays(today, 9),
      occasion: 'Birthday',
      theme: 'Superhero',
      notes: '6-year-old birthday. Spider-Man theme.',
      imageUrl: CAKE_IMAGES[11],
      isDelivery: true,
      deliveryAddress: '222 Hero Street',
      deliveryTime: new Date(addDays(today, 9).setHours(13, 0, 0, 0)),
      colors: 'Red, Blue, Black',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant',
        }
      ]
    },
    {
      customer: sarah,
      eventDate: addDays(today, 10),
      occasion: 'Baptism',
      theme: 'Heavenly',
      notes: 'Religious symbols. Cross topper.',
      imageUrl: CAKE_IMAGES[12],
      isDelivery: true,
      deliveryAddress: '100 Church Lane',
      deliveryTime: new Date(addDays(today, 10).setHours(10, 0, 0, 0)),
      colors: 'White, Blue, Gold',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Fondant',
        }
      ]
    },
    {
      customer: jessica,
      eventDate: addDays(today, 12),
      occasion: 'Wedding',
      theme: 'Rustic Elegance',
      notes: '4-tier wedding cake. Naked cake style with berries.',
      imageUrl: CAKE_IMAGES[13],
      isDelivery: true,
      deliveryAddress: '500 Barn Road, Wedding Venue',
      deliveryTime: new Date(addDays(today, 12).setHours(9, 0, 0, 0)),
      colors: 'White, Green, Berry',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['12 inch round'] || 4,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Naked',
        },
        {
          tierIndex: 1,
          tierSizeId: sizeMap['10 inch round'] || 2,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Naked',
        },
        {
          tierIndex: 2,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Naked',
        },
        {
          tierIndex: 3,
          tierSizeId: sizeMap['6 inch round'] || 3,
          batterRecipeId: recipeMap['Vanilla Sponge Batter'],
          frostingRecipeId: recipeMap['Vanilla Buttercream'],
          finishType: 'Buttercream - Naked',
        }
      ]
    },
    {
      customer: alex,
      eventDate: addDays(today, 14),
      occasion: 'Birthday',
      theme: 'Classic Elegance',
      notes: 'Sophisticated adult birthday. Minimal design.',
      imageUrl: CAKE_IMAGES[14],
      isDelivery: false,
      pickupTime: new Date(addDays(today, 14).setHours(16, 0, 0, 0)),
      colors: 'Black, Gold, White',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: sizeMap['8 inch round'] || 1,
          batterRecipeId: recipeMap['Chocolate Sponge Batter'],
          frostingRecipeId: recipeMap['Chocolate Buttercream'],
          finishType: 'Buttercream - Smooth',
        }
      ]
    }
  ]

  // Create orders
  for (const orderData of testOrders) {
    const { customer, tiers, ...orderFields } = orderData

    const order = await prisma.cakeOrder.create({
      data: {
        customerId: customer.id,
        customerName: customer.name,
        status: 'CONFIRMED',
        estimatedHours: tiers.length * 2,
        updatedAt: now,
        ...orderFields,
        CakeTier: {
          create: tiers.map(tier => ({
            ...tier,
            batterMultiplier: 1.0,
            frostingMultiplier: 1.0,
            fillingMultiplier: tier.fillingRecipeId ? 1.0 : null,
            updatedAt: now,
          }))
        }
      },
      include: { CakeTier: true }
    })

    console.log(`Created: Order #${order.id} - ${customer.name} - ${orderFields.occasion}`)
    console.log(`   Date: ${orderFields.eventDate.toDateString()} | Tiers: ${tiers.length}`)
    if (orderFields.imageUrl) console.log(`   Image: ${orderFields.imageUrl}`)
    console.log()
  }

  console.log(`\nDone! Created ${testOrders.length} test orders with images.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
