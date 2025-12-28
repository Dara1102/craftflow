import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create orders with recipes NOT already in scheduled batches
  // This will create new unscheduled batches
  
  const orders = [
    {
      customerId: 6,
      customerName: 'Test - Unscheduled 1',
      eventDate: new Date('2026-01-20T12:00:00.000Z'),
      occasion: 'Cake Pop Demo',
      theme: 'Rainbow Fun',
      colors: 'Rainbow',
      status: 'CONFIRMED',
      isDelivery: false,
      estimatedHours: '2',
      imageUrl: '/test-photos/IMG_2313.jpeg',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: 2, // 8 inch
          batterRecipeId: 13, // Cake Pop Base - NOT in any scheduled batch
          frostingRecipeId: 12, // Cream Cheese Frosting - NOT in any scheduled batch
          finishType: 'Buttercream - Smooth',
          frostingComplexity: 2
        }
      ]
    },
    {
      customerId: 7,
      customerName: 'Test - Unscheduled 2',
      eventDate: new Date('2026-01-22T14:00:00.000Z'),
      occasion: 'Cupcake Party',
      theme: 'Vanilla Dream',
      colors: 'White, Pink',
      status: 'CONFIRMED',
      isDelivery: true,
      deliveryAddress: '123 Test Lane',
      estimatedHours: '3',
      imageUrl: '/test-photos/IMG_2890.JPG',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: 3, // 10 inch
          batterRecipeId: 7, // Vanilla Cupcake Batter - NOT in any scheduled batch
          fillingRecipeId: 5, // Strawberry Jam Filling - NOT in any scheduled batch
          frostingRecipeId: 10, // Vanilla Buttercream (Cupcake) - NOT in any scheduled batch
          finishType: 'Buttercream - Textured',
          frostingComplexity: 3
        },
        {
          tierIndex: 1,
          tierSizeId: 2, // 8 inch
          batterRecipeId: 7, // Vanilla Cupcake Batter
          fillingRecipeId: 5, // Strawberry Jam Filling
          frostingRecipeId: 10, // Vanilla Buttercream (Cupcake)
          finishType: 'Buttercream - Textured',
          frostingComplexity: 3
        }
      ]
    },
    {
      customerId: 8,
      customerName: 'Test - Unscheduled 3',
      eventDate: new Date('2026-01-25T10:00:00.000Z'),
      occasion: 'Chocolate Cupcake Bash',
      theme: 'Chocolate Heaven',
      colors: 'Brown, Gold',
      status: 'CONFIRMED',
      isDelivery: false,
      estimatedHours: '2',
      imageUrl: '/test-photos/IMG_2972.JPG',
      tiers: [
        {
          tierIndex: 0,
          tierSizeId: 2, // 8 inch
          batterRecipeId: 8, // Chocolate Cupcake Batter - NOT in any scheduled batch
          frostingRecipeId: 11, // Chocolate Buttercream (Cupcake) - NOT in any scheduled batch
          finishType: 'Buttercream - Smooth',
          frostingComplexity: 2
        }
      ]
    }
  ]

  console.log('Creating unscheduled test orders...\n')

  for (const orderData of orders) {
    const { tiers, ...orderFields } = orderData

    const order = await prisma.cakeOrder.create({
      data: {
        ...orderFields,
        updatedAt: new Date(),
        CakeTier: {
          create: tiers.map(tier => ({
            tierIndex: tier.tierIndex,
            tierSizeId: tier.tierSizeId,
            batterRecipeId: tier.batterRecipeId,
            fillingRecipeId: tier.fillingRecipeId || null,
            frostingRecipeId: tier.frostingRecipeId,
            finishType: tier.finishType,
            frostingComplexity: tier.frostingComplexity,
            updatedAt: new Date()
          }))
        }
      },
      include: {
        CakeTier: {
          include: {
            TierSize: true,
            Recipe_CakeTier_batterRecipeIdToRecipe: true,
            Recipe_CakeTier_frostingRecipeIdToRecipe: true
          }
        }
      }
    })

    console.log(`Created Order #${order.id}: ${order.occasion}`)
    console.log(`  Tiers: ${order.CakeTier.length}`)
    for (const tier of order.CakeTier) {
      console.log(`    - ${tier.TierSize?.name}: ${tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name} + ${tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name}`)
    }
    console.log('')
  }

  // Verify - no production tasks should exist for these orders
  const newOrderIds = await prisma.cakeOrder.findMany({
    where: { customerName: { contains: 'Test - Unscheduled' } },
    select: { id: true, ProductionTask: true }
  })
  
  console.log('Verification - these orders have no production tasks:')
  for (const order of newOrderIds) {
    console.log(`  Order #${order.id}: ${order.ProductionTask.length} tasks`)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
