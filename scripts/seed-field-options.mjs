import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Field options data - these match what was in Airtable
const fieldOptions = {
  occasion: [
    'Birthday',
    'Wedding',
    'Baby Shower',
    'Gender Reveal',
    'Anniversary',
    'Graduation',
    'Corporate Event',
    'Holiday',
    'Retirement',
    'Engagement',
    'Bridal Shower',
    'Baptism/Christening',
    'First Communion',
    'Quinceañera',
    'Sweet 16',
    'Funeral/Memorial',
    'Other',
  ],
  theme: [
    'Floral',
    'Rustic',
    'Elegant',
    'Modern/Minimalist',
    'Bohemian',
    'Vintage',
    'Tropical',
    'Nautical',
    'Garden',
    'Fairy Tale',
    'Princess',
    'Superhero',
    'Sports',
    'Cartoon/Character',
    'Gaming',
    'Music',
    'Travel',
    'Safari/Animals',
    'Under the Sea',
    'Space/Galaxy',
    'Unicorn',
    'Dinosaur',
    'Construction',
    'Farm',
    'Circus/Carnival',
    'Hollywood/Glam',
    'Art Deco',
    'Mexican/Fiesta',
    'Winter Wonderland',
    'Fall/Autumn',
    'Spring',
    'Summer',
    'Christmas',
    'Halloween',
    'Easter',
    'Thanksgiving',
    'Valentines',
    'St Patricks Day',
    'Custom',
  ],
  color: [
    'White',
    'Ivory/Cream',
    'Blush Pink',
    'Hot Pink',
    'Rose',
    'Coral',
    'Peach',
    'Red',
    'Burgundy',
    'Maroon',
    'Orange',
    'Yellow',
    'Gold',
    'Champagne',
    'Tan/Nude',
    'Brown',
    'Mint',
    'Sage',
    'Green',
    'Forest Green',
    'Teal',
    'Turquoise',
    'Baby Blue',
    'Royal Blue',
    'Navy',
    'Lavender',
    'Purple',
    'Plum',
    'Silver',
    'Gray',
    'Black',
    'Rose Gold',
    'Copper',
    'Pastels',
    'Rainbow',
  ],
  cakeSurface: [
    'Buttercream - Smooth',
    'Buttercream - Textured',
    'Buttercream - Rustic',
    'Fondant - Smooth',
    'Fondant - Textured',
    'Naked',
    'Semi-Naked',
    'Ganache',
    'Whipped Cream',
    'Cream Cheese',
    'Mirror Glaze',
    'Royal Icing',
    'Meringue',
  ],
  flavor: [
    'Vanilla',
    'Chocolate',
    'Red Velvet',
    'Marble',
    'Funfetti/Confetti',
    'Lemon',
    'Orange',
    'Coconut',
    'Almond',
    'Strawberry',
    'Carrot',
    'Banana',
    'Pumpkin',
    'Spice',
    'Coffee',
    'Mocha',
    'Cookies & Cream',
    'Peanut Butter',
    'Caramel',
    'Dulce de Leche',
    'Champagne',
    'Rum',
    'Amaretto',
    'Tres Leches',
    'Cheesecake',
  ],
  filling: [
    'Vanilla Buttercream',
    'Chocolate Buttercream',
    'Strawberry',
    'Raspberry',
    'Blueberry',
    'Mixed Berry',
    'Lemon Curd',
    'Passionfruit',
    'Mango',
    'Cream Cheese',
    'Chocolate Ganache',
    'Salted Caramel',
    'Dulce de Leche',
    'Peanut Butter',
    'Nutella',
    'Cookie Butter',
    'Oreo',
    'Bavarian Cream',
    'Whipped Cream',
    'Mousse',
    'Fruit Preserves',
    'Fresh Fruit',
    'Coconut',
    'Almond',
    'Guava',
  ],
}

async function main() {
  console.log('Seeding field options...')

  let created = 0
  let skipped = 0

  for (const [category, options] of Object.entries(fieldOptions)) {
    for (let i = 0; i < options.length; i++) {
      const name = options[i]

      // Check if already exists
      const existing = await prisma.fieldOption.findFirst({
        where: { category, name }
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.fieldOption.create({
        data: {
          category,
          name,
          sortOrder: i,
          isActive: true,
        }
      })
      created++
    }
    console.log(`  ${category}: ${options.length} options`)
  }

  console.log(`\nDone! Created ${created} options, skipped ${skipped} existing.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
