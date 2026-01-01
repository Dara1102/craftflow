import { PrismaClient } from '@prisma/client'
import {
  PRODUCTION_DEFAULTS,
  calculateTierVolumeMl,
  getAssemblyMinutes,
} from '../lib/production-settings'

const prisma = new PrismaClient()

/**
 * Seed missing costing defaults
 * Uses lib/production-settings.ts as single source of truth for calculations
 */
async function seedCostingDefaults() {
  console.log('🔧 Seeding costing defaults...\n')
  console.log(`Tier structure: ${PRODUCTION_DEFAULTS.layersPerTier} layers × ${PRODUCTION_DEFAULTS.layerHeightInches}" each\n`)

  // ============================================
  // 1. LABOR ROLES (with realistic hourly rates)
  // ============================================
  console.log('--- Labor Roles ---')

  const laborRoles = [
    { name: 'Baker', hourlyRate: 25, description: 'Prepares batters, bakes cakes, makes frostings', isActive: true },
    { name: 'Decorator', hourlyRate: 35, description: 'Decorates cakes, creates designs, fondant work', isActive: true },
    { name: 'Bakery Assistant', hourlyRate: 18, description: 'Assists with prep, cleaning, packaging', isActive: true },
  ]

  for (const role of laborRoles) {
    const existing = await prisma.laborRole.findFirst({ where: { name: role.name } })
    if (existing) {
      await prisma.laborRole.update({
        where: { id: existing.id },
        data: { hourlyRate: role.hourlyRate, description: role.description, isActive: role.isActive, updatedAt: new Date() }
      })
      console.log(`  ✓ Updated ${role.name}: $${role.hourlyRate}/hr`)
    } else {
      await prisma.laborRole.create({ data: { ...role, updatedAt: new Date() } })
      console.log(`  ✓ Created ${role.name}: $${role.hourlyRate}/hr`)
    }
  }

  // Get role IDs for later use
  const bakerRole = await prisma.laborRole.findFirst({ where: { name: 'Baker' } })
  const decoratorRole = await prisma.laborRole.findFirst({ where: { name: 'Decorator' } })

  // ============================================
  // 2. TIER SIZES (with volumes and assembly times)
  // ============================================
  console.log('\n--- Tier Sizes ---')

  // Tier data - uses production-settings functions for volume/assembly calculation
  const tierSizeData: Array<{ name: string; diameterInches: number; shape: 'round' | 'square' }> = [
    { name: '6 inch round', diameterInches: 6, shape: 'round' },
    { name: '8 inch round', diameterInches: 8, shape: 'round' },
    { name: '10 inch round', diameterInches: 10, shape: 'round' },
    { name: '12 inch round', diameterInches: 12, shape: 'round' },
    { name: '10 inch square', diameterInches: 10, shape: 'square' },
  ]

  for (const tierData of tierSizeData) {
    const tier = await prisma.tierSize.findFirst({
      where: { name: { contains: tierData.name.split(' ')[0] } } // Match by first word (size)
    })

    if (tier) {
      // Use production-settings functions (single source of truth)
      const volumeMl = calculateTierVolumeMl(tierData.diameterInches, tierData.shape)
      const assemblyMinutes = getAssemblyMinutes(tierData.diameterInches)

      await prisma.tierSize.update({
        where: { id: tier.id },
        data: {
          volumeMl,
          assemblyMinutes,
          ...(bakerRole ? { LaborRole: { connect: { id: bakerRole.id } } } : {}),
          updatedAt: new Date()
        }
      })
      console.log(`  ✓ ${tier.name}: ${volumeMl}ml volume, ${assemblyMinutes}min assembly`)
    }
  }

  // ============================================
  // 3. RECIPES (with labor times)
  // ============================================
  console.log('\n--- Recipes ---')

  // Realistic labor times for different recipe types
  const recipeLabor: Record<string, { laborMinutes: number; description: string }> = {
    'BATTER': { laborMinutes: 30, description: 'Mix, bake, cool time per batch' },
    'FILLING': { laborMinutes: 15, description: 'Prep and cook filling' },
    'FROSTING': { laborMinutes: 20, description: 'Mix buttercream/frosting' },
  }

  const recipes = await prisma.recipe.findMany()
  for (const recipe of recipes) {
    const laborData = recipeLabor[recipe.type]
    if (laborData && !recipe.laborMinutes) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          laborMinutes: laborData.laborMinutes,
          ...(bakerRole ? { LaborRole: { connect: { id: bakerRole.id } } } : {}),
          updatedAt: new Date()
        }
      })
      console.log(`  ✓ ${recipe.name}: ${laborData.laborMinutes}min labor`)
    }
  }

  // ============================================
  // 4. DECORATION TECHNIQUES (ensure labor roles assigned)
  // ============================================
  console.log('\n--- Decoration Techniques ---')

  // Update decorations without labor roles to use Decorator
  const decorationsWithoutRole = await prisma.decorationTechnique.count({
    where: { laborRoleId: null }
  })

  if (decorationsWithoutRole > 0 && decoratorRole) {
    await prisma.decorationTechnique.updateMany({
      where: { laborRoleId: null },
      data: { laborRoleId: decoratorRole.id }
    })
    console.log(`  ✓ Assigned Decorator role to ${decorationsWithoutRole} techniques`)
  }

  // ============================================
  // 5. SETTINGS (defaults for costing)
  // ============================================
  console.log('\n--- Settings ---')

  const settings = [
    { key: 'MarkupPercent', value: '0.70' },
    { key: 'DefaultDepositPercent', value: '0.50' },
    { key: 'BakerHourlyRate', value: '25' },
    { key: 'DecoratorHourlyRate', value: '35' },
    { key: 'AssistantHourlyRate', value: '18' },
  ]

  for (const setting of settings) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } })
    if (!existing) {
      await prisma.setting.create({
        data: {
          key: setting.key,
          value: setting.value,
          updatedAt: new Date()
        }
      })
      console.log(`  ✓ Created ${setting.key}: ${setting.value}`)
    } else {
      console.log(`  - ${setting.key}: ${existing.value} (already exists)`)
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n=== SEEDING COMPLETE ===')
  console.log(`
What was fixed:
✓ Labor roles: Baker ($25/hr), Decorator ($35/hr), Assistant ($18/hr)
✓ Tier volumes: Using production-settings (${PRODUCTION_DEFAULTS.layersPerTier} layers × ${PRODUCTION_DEFAULTS.layerHeightInches}")
✓ Assembly times: From production-settings (15-35 min by size)
✓ Recipe labor: 15-30 minutes per batch based on type
✓ Settings: 70% markup, 50% deposit defaults

Single source of truth: lib/production-settings.ts
- Tier volume formula: π × r² × (layers × layerHeight) → ml
- Assembly times: Configurable by tier size
- All calculations use these same settings

Cost calculation should now work correctly!
  `)

  await prisma.$disconnect()
}

seedCostingDefaults().catch(console.error)
