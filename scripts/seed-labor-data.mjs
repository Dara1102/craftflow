import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Realistic labor times based on professional bakery research
// Sources: Wicked Goodies, Craftsy cake timelines, industry standards
//
// Assumptions:
// - Single batch production (not mass production)
// - Includes setup, mixing, cleanup
// - Does NOT include baking/cooling time (passive wait)

// Default labor times by recipe type (in minutes)
// Based on Wicked Goodies: single cake batter takes ~35 min including all prep
const RECIPE_LABOR_DEFAULTS = {
  // Batter: measuring ingredients, mixing (3-5 min active), pan prep, cleanup
  // For single batch: ~20-25 min active labor (excluding baking time)
  BATTER: { minutes: 25, roleName: 'Baker' },

  // Buttercream: cream butter (~3 min), add sugar/beat (3 min), add flavorings
  // Total active time per batch: ~10-15 min for American buttercream
  // Swiss meringue takes longer (~20-25 min)
  FROSTING: { minutes: 15, roleName: 'Baker' },

  // Fillings: varies widely - ganache is quick, curds take longer
  // Average active time: ~15-20 min
  FILLING: { minutes: 18, roleName: 'Baker' },
}

// Assembly times by tier size (in minutes)
// Based on Craftsy timelines: crumb coat 5 min, final coat 10-20 min
// Plus: leveling/torting (5-10 min), filling layers (10-15 min)
// Total assembly per tier: 25-45 min depending on size
const TIER_ASSEMBLY_DEFAULTS = {
  // 4-6" tiers: level/split (5 min), fill (8 min), crumb coat (5 min), final (10 min)
  small: { maxDiameter: 15.25, minutes: 28, roleName: 'Baker' },   // up to 6"

  // 7-10" tiers: level/split (8 min), fill (12 min), crumb coat (5 min), final (15 min)
  medium: { maxDiameter: 25.4, minutes: 40, roleName: 'Baker' },   // 6-10"

  // 11-14" tiers: level/split (10 min), fill (15 min), crumb coat (8 min), final (18 min)
  large: { maxDiameter: 35.6, minutes: 51, roleName: 'Baker' },    // 10-14"

  // 15"+ tiers: level/split (12 min), fill (18 min), crumb coat (10 min), final (20 min)
  xlarge: { maxDiameter: 999, minutes: 60, roleName: 'Baker' },    // 14"+
}

async function main() {
  console.log('Seeding labor data for recipes and tier sizes...\n')

  // Get labor roles
  const laborRoles = await prisma.laborRole.findMany()
  const roleMap = new Map(laborRoles.map(r => [r.name, r.id]))

  if (laborRoles.length === 0) {
    console.log('No labor roles found. Please run seed-labor-roles.mjs first.')
    return
  }

  console.log('Found labor roles:')
  laborRoles.forEach(r => console.log(`  - ${r.name} ($${r.hourlyRate}/hr)`))
  console.log('')

  // Update recipes with labor data
  const recipes = await prisma.recipe.findMany()
  console.log(`Updating ${recipes.length} recipes with labor data...`)

  for (const recipe of recipes) {
    const defaults = RECIPE_LABOR_DEFAULTS[recipe.type] || RECIPE_LABOR_DEFAULTS.BATTER
    const roleId = roleMap.get(defaults.roleName)

    if (!roleId) {
      console.log(`  Warning: Role "${defaults.roleName}" not found, skipping ${recipe.name}`)
      continue
    }

    // Only update if not already set
    if (!recipe.laborMinutes) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          laborMinutes: defaults.minutes,
          laborRoleId: roleId
        }
      })
      console.log(`  Updated: ${recipe.name} -> ${defaults.minutes} min (${defaults.roleName})`)
    } else {
      console.log(`  Skipped: ${recipe.name} (already has labor data)`)
    }
  }

  console.log('')

  // Update tier sizes with assembly data
  const tierSizes = await prisma.tierSize.findMany()
  console.log(`Updating ${tierSizes.length} tier sizes with assembly data...`)

  for (const tier of tierSizes) {
    // Determine assembly time based on diameter
    let assemblyConfig
    const diameterCm = Number(tier.diameterCm)

    if (diameterCm <= TIER_ASSEMBLY_DEFAULTS.small.maxDiameter) {
      assemblyConfig = TIER_ASSEMBLY_DEFAULTS.small
    } else if (diameterCm <= TIER_ASSEMBLY_DEFAULTS.medium.maxDiameter) {
      assemblyConfig = TIER_ASSEMBLY_DEFAULTS.medium
    } else if (diameterCm <= TIER_ASSEMBLY_DEFAULTS.large.maxDiameter) {
      assemblyConfig = TIER_ASSEMBLY_DEFAULTS.large
    } else {
      assemblyConfig = TIER_ASSEMBLY_DEFAULTS.xlarge
    }

    const roleId = roleMap.get(assemblyConfig.roleName)

    if (!roleId) {
      console.log(`  Warning: Role "${assemblyConfig.roleName}" not found, skipping ${tier.name}`)
      continue
    }

    // Only update if not already set
    if (!tier.assemblyMinutes) {
      await prisma.tierSize.update({
        where: { id: tier.id },
        data: {
          assemblyMinutes: assemblyConfig.minutes,
          assemblyRoleId: roleId
        }
      })
      console.log(`  Updated: ${tier.name} (${diameterCm.toFixed(1)}cm) -> ${assemblyConfig.minutes} min (${assemblyConfig.roleName})`)
    } else {
      console.log(`  Skipped: ${tier.name} (already has assembly data)`)
    }
  }

  console.log('\nDone!')

  // Show summary
  const updatedRecipes = await prisma.recipe.findMany({ where: { laborMinutes: { not: null } } })
  const updatedTiers = await prisma.tierSize.findMany({ where: { assemblyMinutes: { not: null } } })

  console.log('\nSummary:')
  console.log(`  Recipes with labor data: ${updatedRecipes.length}/${recipes.length}`)
  console.log(`  Tier sizes with assembly data: ${updatedTiers.length}/${tierSizes.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
