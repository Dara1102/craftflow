import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Airtable decoration types that represent sculpted/topper add-ons
// These are priced based on complexity
const airtableDecorations = [
  // Sculpted Characters & Figures - HIGH complexity
  { name: 'Sculpted Animal Figure', category: 'Sculpted', subcategory: '3D Figures', cost: 45, labor: 120, skill: 'HIGH' },
  { name: 'Sculpted Character Figure', category: 'Sculpted', subcategory: '3D Figures', cost: 55, labor: 150, skill: 'HIGH' },
  { name: 'Sculpted Doll/Person', category: 'Sculpted', subcategory: '3D Figures', cost: 50, labor: 140, skill: 'HIGH' },
  { name: 'Sculpted Monster/Creature', category: 'Sculpted', subcategory: '3D Figures', cost: 55, labor: 150, skill: 'HIGH' },
  { name: 'Sculpted Car/Vehicle', category: 'Sculpted', subcategory: '3D Figures', cost: 60, labor: 160, skill: 'HIGH' },
  { name: 'Sculpted Building/Structure', category: 'Sculpted', subcategory: '3D Figures', cost: 65, labor: 180, skill: 'HIGH' },
  { name: 'Sculpted Boat/Ship', category: 'Sculpted', subcategory: '3D Figures', cost: 55, labor: 150, skill: 'HIGH' },
  { name: 'Sculpted Plane/Aircraft', category: 'Sculpted', subcategory: '3D Figures', cost: 55, labor: 150, skill: 'HIGH' },

  // Sculpted Objects - MEDIUM to HIGH
  { name: 'Sculpted Shoe/Sneaker', category: 'Sculpted', subcategory: '3D Objects', cost: 40, labor: 100, skill: 'HIGH' },
  { name: 'Sculpted Bag/Purse', category: 'Sculpted', subcategory: '3D Objects', cost: 38, labor: 90, skill: 'MEDIUM' },
  { name: 'Sculpted Camera', category: 'Sculpted', subcategory: '3D Objects', cost: 35, labor: 85, skill: 'MEDIUM' },
  { name: 'Sculpted Bottle', category: 'Sculpted', subcategory: '3D Objects', cost: 30, labor: 70, skill: 'MEDIUM' },
  { name: 'Sculpted Cup/Mug', category: 'Sculpted', subcategory: '3D Objects', cost: 25, labor: 60, skill: 'MEDIUM' },
  { name: 'Sculpted Book', category: 'Sculpted', subcategory: '3D Objects', cost: 28, labor: 65, skill: 'MEDIUM' },
  { name: 'Sculpted Ball/Sports Ball', category: 'Sculpted', subcategory: '3D Objects', cost: 25, labor: 55, skill: 'MEDIUM' },
  { name: 'Sculpted Hat', category: 'Sculpted', subcategory: '3D Objects', cost: 28, labor: 60, skill: 'MEDIUM' },
  { name: 'Sculpted Furniture', category: 'Sculpted', subcategory: '3D Objects', cost: 45, labor: 110, skill: 'HIGH' },
  { name: 'Sculpted Machine/Device', category: 'Sculpted', subcategory: '3D Objects', cost: 50, labor: 130, skill: 'HIGH' },
  { name: 'Sculpted Game Controller', category: 'Sculpted', subcategory: '3D Objects', cost: 32, labor: 75, skill: 'MEDIUM' },

  // Decorative Toppers - MEDIUM
  { name: 'Crown Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 22, labor: 50, skill: 'MEDIUM' },
  { name: 'Tiara Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 22, labor: 50, skill: 'MEDIUM' },
  { name: 'Bow Topper Set', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 15, labor: 35, skill: 'LOW' },
  { name: 'Heart Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 12, labor: 30, skill: 'LOW' },
  { name: 'Star Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 12, labor: 30, skill: 'LOW' },
  { name: 'Custom Name Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 18, labor: 45, skill: 'MEDIUM' },
  { name: 'Age Number Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 10, labor: 25, skill: 'LOW' },
  { name: 'Letter(s) Topper', category: 'Toppers', subcategory: 'Decorative Toppers', cost: 15, labor: 35, skill: 'LOW' },

  // 2D Decorations - LOW to MEDIUM
  { name: '2D Edible Image/Print', category: 'Flat Decorations', subcategory: '2D Elements', cost: 8, labor: 15, skill: 'LOW' },
  { name: '2D Fondant Cutouts', category: 'Flat Decorations', subcategory: '2D Elements', cost: 12, labor: 30, skill: 'LOW' },
  { name: 'Cameo Portrait (Edible)', category: 'Flat Decorations', subcategory: '2D Elements', cost: 20, labor: 50, skill: 'MEDIUM' },

  // Sugar Flowers & Naturals - MEDIUM to HIGH
  { name: 'Sugar Flowers - Simple', category: 'Sugar Flowers', subcategory: 'Florals', cost: 18, labor: 45, skill: 'MEDIUM' },
  { name: 'Sugar Flowers - Premium', category: 'Sugar Flowers', subcategory: 'Florals', cost: 35, labor: 90, skill: 'HIGH' },
  { name: 'Sugar Birds', category: 'Sugar Flowers', subcategory: 'Naturals', cost: 25, labor: 60, skill: 'MEDIUM' },
  { name: 'Sugar Fish', category: 'Sugar Flowers', subcategory: 'Naturals', cost: 22, labor: 55, skill: 'MEDIUM' },
  { name: 'Sugar Feathers', category: 'Sugar Flowers', subcategory: 'Naturals', cost: 15, labor: 35, skill: 'MEDIUM' },
  { name: 'Sugar Snowflakes', category: 'Sugar Flowers', subcategory: 'Naturals', cost: 12, labor: 30, skill: 'LOW' },
  { name: 'Sugar Butterflies', category: 'Sugar Flowers', subcategory: 'Naturals', cost: 15, labor: 35, skill: 'MEDIUM' },

  // Fresh Additions
  { name: 'Fresh Flower Arrangement', category: 'Fresh Elements', subcategory: 'Fresh Florals', cost: 25, labor: 20, skill: 'MEDIUM' },
  { name: 'Fresh Fruit Arrangement', category: 'Fresh Elements', subcategory: 'Fresh Food', cost: 18, labor: 20, skill: 'LOW' },
  { name: 'Fresh Macarons (per dozen)', category: 'Fresh Elements', subcategory: 'Confections', cost: 24, labor: 10, skill: 'LOW' },
  { name: 'Candy/Sweet Arrangement', category: 'Fresh Elements', subcategory: 'Confections', cost: 15, labor: 20, skill: 'LOW' },

  // Decorative Accents
  { name: 'Pearl String/Strand', category: 'Accents', subcategory: 'Beads & Pearls', cost: 8, labor: 15, skill: 'LOW' },
  { name: 'Dragees Application', category: 'Accents', subcategory: 'Beads & Pearls', cost: 10, labor: 20, skill: 'LOW' },
  { name: 'Rhinestone Application', category: 'Accents', subcategory: 'Sparkle', cost: 12, labor: 25, skill: 'LOW' },
  { name: 'Edible Glitter Application', category: 'Accents', subcategory: 'Sparkle', cost: 8, labor: 15, skill: 'LOW' },
  { name: 'Money Pull Strings', category: 'Accents', subcategory: 'Special', cost: 15, labor: 30, skill: 'LOW' },

  // Themed Decorations
  { name: 'Sky Elements (stars, moon, clouds)', category: 'Themed', subcategory: 'Nature', cost: 18, labor: 40, skill: 'MEDIUM' },
  { name: 'Anatomy/Body Parts (fondant)', category: 'Themed', subcategory: 'Special', cost: 25, labor: 60, skill: 'MEDIUM' },
  { name: 'Clothing Items (fondant)', category: 'Themed', subcategory: 'Fashion', cost: 22, labor: 55, skill: 'MEDIUM' },
  { name: 'Jewelry (fondant/gumpaste)', category: 'Themed', subcategory: 'Fashion', cost: 18, labor: 45, skill: 'MEDIUM' },
  { name: 'Bible/Religious Item', category: 'Themed', subcategory: 'Religious', cost: 28, labor: 65, skill: 'MEDIUM' },
  { name: 'Monument/Landmark', category: 'Themed', subcategory: 'Architectural', cost: 55, labor: 140, skill: 'HIGH' },
  { name: 'Tutu/Dress Decoration', category: 'Themed', subcategory: 'Fashion', cost: 25, labor: 55, skill: 'MEDIUM' },
  { name: 'Toy Figurine Placement', category: 'Themed', subcategory: 'Non-Edible', cost: 5, labor: 10, skill: 'LOW' },
  { name: 'Ornate Frame/Border', category: 'Themed', subcategory: 'Frames', cost: 20, labor: 50, skill: 'MEDIUM' },
]

async function main() {
  console.log('Seeding Airtable-inspired decoration techniques...')

  let created = 0
  let skipped = 0

  for (const dec of airtableDecorations) {
    const sku = `DEC-${dec.category.substring(0, 6).toUpperCase()}-${dec.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}`.substring(0, 20)

    // Check if already exists by name
    const existing = await prisma.decorationTechnique.findFirst({
      where: { name: dec.name }
    })

    if (existing) {
      console.log(`  Skipped (exists): ${dec.name}`)
      skipped++
      continue
    }

    await prisma.decorationTechnique.create({
      data: {
        sku: `${sku}-${Date.now().toString().slice(-4)}`,
        name: dec.name,
        category: dec.category,
        subcategory: dec.subcategory,
        skillLevel: dec.skill,
        description: `${dec.name} decoration for cakes`,
        unit: 'CAKE',
        baseCakeSize: '6" round',
        defaultCostPerUnit: dec.cost,
        laborMinutes: dec.labor,
        wasteFactorPercent: 10,
        materialGrade: dec.skill === 'HIGH' ? 'PREMIUM' : 'STANDARD',
        toolsRequired: 'Various modeling tools',
        isActive: true,
      }
    })

    console.log(`  Created: ${dec.name}`)
    created++
  }

  console.log(`\nDone! Created ${created} decorations, skipped ${skipped} existing.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
