import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCosting() {
  // Get an existing order
  const order = await prisma.cakeOrder.findFirst({
    include: {
      cakeTiers: {
        include: { tierSize: true }
      }
    },
    orderBy: { id: 'desc' }
  });

  if (!order) {
    console.log('No orders found');
    return;
  }

  console.log('=== TEST ORDER ===');
  console.log('Order ID:', order.id);
  console.log('Tiers:');
  order.cakeTiers.forEach(t => {
    console.log(`  - ${t.tierSize.name} (${t.tierSize.volumeMl}ml) | Flavor: ${t.flavor} | Filling: ${t.filling} | Finish: ${t.finishType}`);
  });

  // Import and run costing calculation
  const { calculateOrderCosting } = await import('../lib/costing.ts');

  console.log('\n=== RUNNING COSTING ===\n');

  try {
    const costing = await calculateOrderCosting(order.id);

    console.log('Recipe Matches:');
    costing.recipeMatches?.forEach(rm => {
      console.log(`\nTier: ${rm.tierName} (${rm.tierVolumeMl}ml)`);
      if (rm.batter) {
        console.log(`  Batter: ${rm.batter.recipe.name} (yields ${rm.batter.recipe.yieldVolumeMl}ml) x${rm.batter.multiplier}`);
      }
      if (rm.filling) {
        console.log(`  Filling: ${rm.filling.recipe.name} (yields ${rm.filling.recipe.yieldVolumeMl}ml) x${rm.filling.multiplier}`);
      }
      if (rm.frosting) {
        console.log(`  Frosting: ${rm.frosting.recipe.name} (yields ${rm.frosting.recipe.yieldVolumeMl}ml) x${rm.frosting.multiplier}`);
      }
    });

    console.log('\n=== COSTING RESULTS ===');
    console.log('Total Servings:', costing.totalServings);
    console.log('');
    console.log('Ingredient Cost: $' + costing.ingredientCost.toFixed(2));
    console.log('Ingredients:');
    costing.ingredients.forEach(i => {
      console.log(`  - ${i.name}: ${i.quantity} ${i.unit} = $${i.cost.toFixed(2)}`);
    });
    console.log('');
    console.log('Labor Cost: $' + costing.totalLaborCost.toFixed(2));
    console.log('Labor Breakdown:');
    costing.laborBreakdown.forEach(l => {
      console.log(`  - ${l.role}: ${l.hours.toFixed(2)} hrs @ $${l.rate}/hr = $${l.cost.toFixed(2)}`);
    });
    console.log('');
    console.log('Decoration Cost: $' + (costing.decorationMaterialCost + costing.decorationLaborCost).toFixed(2));
    console.log('Delivery Cost: $' + costing.deliveryCost.toFixed(2));
    console.log('Topper Cost: $' + costing.topperCost.toFixed(2));
    console.log('');
    console.log('=== TOTALS ===');
    console.log('Total Cost: $' + costing.totalCost.toFixed(2));
    console.log('Markup:', (costing.markupPercent * 100).toFixed(0) + '%');
    console.log('Suggested Price: $' + costing.suggestedPrice.toFixed(2));
    console.log('Final Price: $' + costing.finalPrice.toFixed(2));
    console.log('Price per Serving: $' + costing.suggestedPricePerServing.toFixed(2));

  } catch (error) {
    console.error('Error:', error);
  }

  await prisma.$disconnect();
}

testCosting();
