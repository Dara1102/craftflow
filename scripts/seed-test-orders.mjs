// Seed complete test orders for the next 2 weeks
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test orders for the next 2 weeks...\n')

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

  // Test orders data
  const testOrders = [
    {
      customer: sarah,
      eventDate: addDays(today, 3),
      occasion: 'Birthday Party',
      theme: 'Princess Theme',
      notes: '5-year-old birthday. Pink and purple colors. Tiara topper.',
      isDelivery: true,
      deliveryAddress: '123 Oak Street, Springfield',
      deliveryTime: new Date(addDays(today, 3).setHours(14, 0, 0, 0)),
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
      customer: mike,
      eventDate: addDays(today, 5),
      occasion: 'Wedding',
      theme: 'Elegant White',
      notes: '3-tier wedding cake. White fondant with gold accents. Fresh flowers on site.',
      isDelivery: true,
      deliveryAddress: '456 Maple Ave, Grand Ballroom',
      deliveryTime: new Date(addDays(today, 5).setHours(10, 0, 0, 0)),
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
    {
      customer: emily,
      eventDate: addDays(today, 7),
      occasion: 'Corporate Event',
      theme: 'Modern Geometric',
      notes: 'Company anniversary cake. Logo printed on top. Clean modern look.',
      isDelivery: false,
      pickupTime: new Date(addDays(today, 7).setHours(9, 0, 0, 0)),
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
      customer: david,
      eventDate: addDays(today, 10),
      occasion: 'Baby Shower',
      theme: 'Teddy Bears',
      notes: 'Gender reveal inside! Blue filling. Cute teddy bear decorations.',
      isDelivery: true,
      deliveryAddress: '789 Pine Road',
      deliveryTime: new Date(addDays(today, 10).setHours(13, 0, 0, 0)),
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
    {
      customer: sarah,
      eventDate: addDays(today, 12),
      occasion: 'Anniversary',
      theme: 'Romantic Roses',
      notes: '25th wedding anniversary. Red roses, elegant script.',
      isDelivery: false,
      pickupTime: new Date(addDays(today, 12).setHours(16, 0, 0, 0)),
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
    }
  ]

  // Create orders
  for (const orderData of testOrders) {
    const { customer, tiers, ...orderFields } = orderData

    // Check if similar order already exists
    const existing = await prisma.cakeOrder.findFirst({
      where: {
        customerId: customer.id,
        eventDate: orderFields.eventDate,
        occasion: orderFields.occasion
      }
    })

    if (existing) {
      console.log(`Order already exists: ${customer.name} - ${orderFields.occasion} on ${orderFields.eventDate.toDateString()}`)
      continue
    }

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
    console.log(`   Date: ${orderFields.eventDate.toDateString()}`)
    console.log(`   Tiers: ${tiers.length} (${tiers.map(t => t.finishType).join(', ')})`)
    console.log()
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
