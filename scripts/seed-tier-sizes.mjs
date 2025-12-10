import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Additional tier sizes - various shapes and sizes
const tierSizes = [
  // Square cakes
  { name: '6 inch square', shape: 'Square', diameterCm: 15.24, heightCm: 10.16, servings: 18, batterMultiplier: 0.65, frostingMultiplier: 0.65 },
  { name: '8 inch square', shape: 'Square', diameterCm: 20.32, heightCm: 10.16, servings: 32, batterMultiplier: 1.3, frostingMultiplier: 1.3 },
  { name: '10 inch square', shape: 'Square', diameterCm: 25.40, heightCm: 10.16, servings: 50, batterMultiplier: 2.0, frostingMultiplier: 2.0 },
  { name: '12 inch square', shape: 'Square', diameterCm: 30.48, heightCm: 10.16, servings: 72, batterMultiplier: 2.6, frostingMultiplier: 2.6 },

  // Sheet cakes (half sheet, full sheet)
  { name: 'Quarter Sheet', shape: 'Sheet', diameterCm: 22.86, lengthCm: 33.02, heightCm: 7.62, servings: 24, batterMultiplier: 1.0, frostingMultiplier: 0.8 },
  { name: 'Half Sheet', shape: 'Sheet', diameterCm: 33.02, lengthCm: 45.72, heightCm: 7.62, servings: 48, batterMultiplier: 2.0, frostingMultiplier: 1.5 },
  { name: 'Full Sheet', shape: 'Sheet', diameterCm: 45.72, lengthCm: 66.04, heightCm: 7.62, servings: 96, batterMultiplier: 4.0, frostingMultiplier: 3.0 },

  // Tall round cakes (for sculpted/3D)
  { name: '6 inch tall', shape: 'Round Tall', diameterCm: 15.24, heightCm: 15.24, servings: 18, batterMultiplier: 0.75, frostingMultiplier: 0.75 },
  { name: '8 inch tall', shape: 'Round Tall', diameterCm: 20.32, heightCm: 15.24, servings: 36, batterMultiplier: 1.5, frostingMultiplier: 1.5 },

  // Heart shapes
  { name: '8 inch heart', shape: 'Heart', diameterCm: 20.32, heightCm: 10.16, servings: 20, batterMultiplier: 0.8, frostingMultiplier: 0.9 },
  { name: '10 inch heart', shape: 'Heart', diameterCm: 25.40, heightCm: 10.16, servings: 32, batterMultiplier: 1.3, frostingMultiplier: 1.4 },

  // Oval cakes
  { name: '9x12 oval', shape: 'Oval', diameterCm: 22.86, lengthCm: 30.48, heightCm: 10.16, servings: 28, batterMultiplier: 1.1, frostingMultiplier: 1.2 },

  // Small/petite sizes
  { name: '4 inch round', shape: 'Round', diameterCm: 10.16, heightCm: 10.16, servings: 6, batterMultiplier: 0.25, frostingMultiplier: 0.25 },
  { name: '5 inch round', shape: 'Round', diameterCm: 12.70, heightCm: 10.16, servings: 8, batterMultiplier: 0.35, frostingMultiplier: 0.35 },

  // Extra large
  { name: '14 inch round', shape: 'Round', diameterCm: 35.56, heightCm: 10.16, servings: 78, batterMultiplier: 2.5, frostingMultiplier: 2.5 },
  { name: '16 inch round', shape: 'Round', diameterCm: 40.64, heightCm: 10.16, servings: 100, batterMultiplier: 3.2, frostingMultiplier: 3.2 },

  // Cupcakes
  { name: '12 Cupcakes', shape: 'Cupcakes', diameterCm: 5.08, heightCm: 5.08, servings: 12, batterMultiplier: 0.3, frostingMultiplier: 0.3 },
  { name: '24 Cupcakes', shape: 'Cupcakes', diameterCm: 5.08, heightCm: 5.08, servings: 24, batterMultiplier: 0.6, frostingMultiplier: 0.6 },
  { name: '48 Cupcakes', shape: 'Cupcakes', diameterCm: 5.08, heightCm: 5.08, servings: 48, batterMultiplier: 1.2, frostingMultiplier: 1.2 },

  // Number/Letter cakes (approximate)
  { name: 'Number Cake (single digit)', shape: 'Number', diameterCm: 30.48, heightCm: 5.08, servings: 12, batterMultiplier: 0.5, frostingMultiplier: 0.4 },
  { name: 'Number Cake (double digit)', shape: 'Number', diameterCm: 60.96, heightCm: 5.08, servings: 24, batterMultiplier: 1.0, frostingMultiplier: 0.8 },
]

async function main() {
  console.log('Seeding additional tier sizes...')

  // First, get the default batter and frosting recipes
  const batterRecipe = await prisma.recipe.findFirst({
    where: { type: 'BATTER' }
  })

  const frostingRecipe = await prisma.recipe.findFirst({
    where: { type: 'FROSTING' }
  })

  if (!batterRecipe) {
    console.error('No batter recipe found. Please run the main seed first.')
    return
  }

  let created = 0
  let skipped = 0

  for (const tier of tierSizes) {
    // Check if already exists
    const existing = await prisma.tierSize.findFirst({
      where: { name: tier.name }
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.tierSize.create({
      data: {
        name: tier.name,
        shape: tier.shape,
        diameterCm: tier.diameterCm,
        lengthCm: tier.lengthCm || null,
        heightCm: tier.heightCm,
        servings: tier.servings,
        batterRecipeId: batterRecipe.id,
        batterMultiplier: tier.batterMultiplier,
        frostingRecipeId: frostingRecipe?.id || null,
        frostingMultiplier: frostingRecipe ? tier.frostingMultiplier : null,
      }
    })
    created++
    console.log(`  Created: ${tier.name}`)
  }

  console.log(`\nDone! Created ${created} tier sizes, skipped ${skipped} existing.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
