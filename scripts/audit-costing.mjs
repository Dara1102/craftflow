import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fullAudit() {
  console.log('=== FULL COSTING AUDIT ===\n')

  // 1. Check tier sizes
  console.log('--- TIER SIZES (Admin Setup Data) ---')
  const tiers = await prisma.tierSize.findMany({ include: { LaborRole: true } })
  tiers.forEach(t => {
    const issues = []
    if (!t.volumeMl) issues.push('NO VOLUME')
    if (!t.assemblyMinutes) issues.push('NO ASSEMBLY TIME')
    if (!t.assemblyRoleId) issues.push('NO LABOR ROLE')
    console.log(`  ${t.name}: ${issues.length ? '⚠️ ' + issues.join(', ') : '✓'}`)
  })

  console.log('\n--- RECIPES (Admin Setup Data) ---')
  const recipes = await prisma.recipe.findMany({
    include: { LaborRole: true, RecipeIngredient: true }
  })
  const recipesByType = { BATTER: [], FILLING: [], FROSTING: [] }
  recipes.forEach(r => {
    if (recipesByType[r.type]) recipesByType[r.type].push(r)
  })

  Object.entries(recipesByType).forEach(([type, recs]) => {
    console.log(`  ${type} recipes: ${recs.length}`)
    recs.slice(0, 2).forEach(r => {
      const issues = []
      if (!r.yieldVolumeMl) issues.push('NO YIELD VOLUME')
      if (!r.laborMinutes) issues.push('NO LABOR TIME')
      if (!r.laborRoleId) issues.push('NO LABOR ROLE')
      console.log(`    - ${r.name}: ${r.RecipeIngredient.length} ingredients, ${issues.length ? '⚠️ ' + issues.join(', ') : '✓'}`)
    })
  })

  console.log('\n--- LABOR ROLES (Admin Setup Data) ---')
  const roles = await prisma.laborRole.findMany()
  const expectedRoles = ['Baker', 'Decorator', 'Bakery Assistant']
  expectedRoles.forEach(roleName => {
    const role = roles.find(r => r.name === roleName)
    if (role) {
      console.log(`  ✓ ${roleName}: $${Number(role.hourlyRate)}/hr`)
    } else {
      console.log(`  ⚠️ ${roleName}: MISSING`)
    }
  })

  console.log('\n--- DECORATION TECHNIQUES (sample) ---')
  const decs = await prisma.decorationTechnique.findMany({ include: { LaborRole: true }, take: 5 })
  decs.forEach(d => {
    const issues = []
    if (!d.laborMinutes) issues.push('NO LABOR TIME')
    if (!d.defaultCostPerUnit || Number(d.defaultCostPerUnit) === 0) issues.push('NO MATERIAL COST')
    console.log(`  ${d.name}: $${Number(d.defaultCostPerUnit)} material, ${d.laborMinutes || 0}min labor ${issues.length ? '⚠️ ' + issues.join(', ') : ''}`)
  })

  console.log('\n--- SETTINGS ---')
  const settings = await prisma.setting.findMany()
  const importantSettings = ['MarkupPercent', 'DefaultDepositPercent', 'BakerHourlyRate', 'DecoratorHourlyRate']
  importantSettings.forEach(key => {
    const setting = settings.find(s => s.key === key)
    console.log(`  ${key}: ${setting ? setting.value : '⚠️ NOT SET'}`)
  })

  // Calculate what a 6" tier SHOULD cost
  console.log('\n--- EXPECTED COST CALCULATION (6" Vanilla Cake) ---')
  const tier6 = tiers.find(t => t.name.includes('6'))
  const vanillaBatter = recipes.find(r => r.name.includes('Vanilla') && r.type === 'BATTER')
  const buttercream = recipes.find(r => r.type === 'FROSTING')

  if (tier6) {
    console.log(`\n  TIER: ${tier6.name}`)
    console.log(`    Servings: ${tier6.servings}`)
    console.log(`    Volume: ${tier6.volumeMl ? tier6.volumeMl + 'ml' : '⚠️ NULL - recipe scaling broken!'}`)
    console.log(`    Assembly: ${tier6.assemblyMinutes ? tier6.assemblyMinutes + ' min' : '⚠️ NULL - no assembly labor!'}`)
  }

  if (vanillaBatter) {
    console.log(`\n  BATTER: ${vanillaBatter.name}`)
    console.log(`    Yield: ${vanillaBatter.yieldVolumeMl ? vanillaBatter.yieldVolumeMl + 'ml' : '⚠️ NULL'}`)
    console.log(`    Labor: ${vanillaBatter.laborMinutes ? vanillaBatter.laborMinutes + ' min' : '⚠️ NULL - no recipe labor!'}`)

    // Calculate ingredient cost for base recipe
    let ingredientCost = 0
    const ingredients = await prisma.recipeIngredient.findMany({
      where: { recipeId: vanillaBatter.id },
      include: { Ingredient: true }
    })
    ingredients.forEach(ri => {
      const cost = Number(ri.quantity) * Number(ri.Ingredient.costPerUnit)
      ingredientCost += cost
      console.log(`      ${ri.Ingredient.name}: ${Number(ri.quantity)} ${ri.Ingredient.unit} × $${Number(ri.Ingredient.costPerUnit)} = $${cost.toFixed(2)}`)
    })
    console.log(`    TOTAL INGREDIENT COST (base recipe): $${ingredientCost.toFixed(2)}`)
  }

  if (buttercream) {
    console.log(`\n  FROSTING: ${buttercream.name}`)
    console.log(`    Yield: ${buttercream.yieldVolumeMl ? buttercream.yieldVolumeMl + 'ml' : '⚠️ NULL'}`)
    console.log(`    Labor: ${buttercream.laborMinutes ? buttercream.laborMinutes + ' min' : '⚠️ NULL'}`)
  }

  // Show the workflow gap
  console.log('\n=== WORKFLOW ANALYSIS ===')
  console.log(`
The costing system IS correctly designed with fallback defaults:
- Labor roles default to $30/hr (Decorator), $21/hr (Baker), $18/hr (Assistant)
- Markup defaults from Settings table
- Recipe matching auto-finds recipes by flavor/filling/finish names

HOWEVER, the seed data is incomplete:

1. TIER VOLUMES - Required for recipe scaling
   Problem: Without volume, system uses 1.0x multiplier (base recipe only)
   Solution: Seed tier volumes based on standard cake pan sizes

2. LABOR TIMES - Required for labor cost
   Problem: Recipes and assembly have no labor times
   Solution: Seed realistic labor times (prep, bake, cool, assembly)

3. LABOR ROLES - Only "Baker" exists
   Problem: Decorator labor uses fallback rate
   Solution: Seed Decorator and Bakery Assistant roles

This is a DATA SEEDING issue, not a workflow design flaw.
The workflow correctly uses defaults - we just need to seed the defaults!
`)

  await prisma.$disconnect()
}

fullAudit().catch(console.error)
