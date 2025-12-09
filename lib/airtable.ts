const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ''
const AIRTABLE_BASE_ID = 'appj0hJeqKmDnpYTG'
const AIRTABLE_TABLE_ID = 'tblFuxFxOW5A05YGX' // Cake Directory

interface AirtableChoice {
  id: string
  name: string
  color?: string
}

interface AirtableFieldOptions {
  product: AirtableChoice[]
  type: AirtableChoice[]
  cakeSurface: AirtableChoice[]
  design: AirtableChoice[]
  size: AirtableChoice[]
  servingSize: AirtableChoice[]
  occasion: AirtableChoice[]
  theme: AirtableChoice[]
  colors: AirtableChoice[]
  decorations: AirtableChoice[]
  brands: AirtableChoice[]
}

// Fallback options when Airtable is not configured
const FALLBACK_OPTIONS: AirtableFieldOptions = {
  product: [
    { id: '1', name: 'Birthday Cake' },
    { id: '2', name: 'Wedding Cake' },
    { id: '3', name: 'Custom Cake' },
    { id: '4', name: 'Cupcakes' },
  ],
  type: [
    { id: '1', name: 'Round' },
    { id: '2', name: 'Sheet' },
    { id: '3', name: 'Tiered' },
    { id: '4', name: 'Sculpted' },
  ],
  cakeSurface: [
    { id: '1', name: 'Buttercream' },
    { id: '2', name: 'Fondant' },
    { id: '3', name: 'Naked/Semi-naked' },
    { id: '4', name: 'Ganache' },
    { id: '5', name: 'Whipped Cream' },
  ],
  design: [
    { id: '1', name: 'Simple' },
    { id: '2', name: 'Moderate' },
    { id: '3', name: 'Elaborate' },
    { id: '4', name: 'Custom' },
  ],
  size: [
    { id: '1', name: '6 inch' },
    { id: '2', name: '8 inch' },
    { id: '3', name: '10 inch' },
    { id: '4', name: '12 inch' },
  ],
  servingSize: [
    { id: '1', name: '10-15' },
    { id: '2', name: '20-30' },
    { id: '3', name: '40-50' },
    { id: '4', name: '75+' },
  ],
  occasion: [
    { id: '1', name: 'Birthday' },
    { id: '2', name: 'Wedding' },
    { id: '3', name: 'Baby Shower' },
    { id: '4', name: 'Anniversary' },
    { id: '5', name: 'Graduation' },
    { id: '6', name: 'Corporate Event' },
    { id: '7', name: 'Holiday' },
    { id: '8', name: 'Other' },
  ],
  theme: [
    { id: '1', name: 'Floral' },
    { id: '2', name: 'Rustic' },
    { id: '3', name: 'Elegant' },
    { id: '4', name: 'Modern' },
    { id: '5', name: 'Cartoon/Character' },
    { id: '6', name: 'Sports' },
    { id: '7', name: 'Princess' },
    { id: '8', name: 'Superhero' },
    { id: '9', name: 'Tropical' },
    { id: '10', name: 'Vintage' },
  ],
  colors: [
    { id: '1', name: 'White' },
    { id: '2', name: 'Pink' },
    { id: '3', name: 'Blue' },
    { id: '4', name: 'Gold' },
    { id: '5', name: 'Silver' },
    { id: '6', name: 'Red' },
    { id: '7', name: 'Purple' },
    { id: '8', name: 'Green' },
    { id: '9', name: 'Yellow' },
    { id: '10', name: 'Black' },
    { id: '11', name: 'Rose Gold' },
    { id: '12', name: 'Pastels' },
  ],
  decorations: [],
  brands: [],
}

// Field IDs from Airtable schema
const FIELD_IDS = {
  product: 'fldQsdLp0orGkhh8B',
  type: 'fldsUfGwvaPafjdjJ',
  cakeSurface: 'fldMuaj690LykXWKz',
  design: 'fldsSMGdO6DIPfikT',
  size: 'fldIFm1cigIVnzu2W',
  servingSize: 'fldXd9TDkHDxC5CqA',
  occasion: 'fldNOhBMhyyhgfcmc',
  theme: 'fldMhAM8sQk4olk9k',
  colors: 'fldAuGOkW5VfFNW4E',
  decorations: 'fld8MvzRKBksTxdBl',
  brands: 'fldjeeGLuSAWWcyyQ',
}

// Cache for field options (refresh every hour)
let cachedOptions: AirtableFieldOptions | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function getAirtableFieldOptions(): Promise<AirtableFieldOptions> {
  // Return cached options if still valid
  if (cachedOptions && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedOptions
  }

  // If no API key, return fallback options
  if (!AIRTABLE_API_KEY) {
    console.log('No Airtable API key configured, using fallback options')
    cachedOptions = FALLBACK_OPTIONS
    cacheTimestamp = Date.now()
    return FALLBACK_OPTIONS
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch Airtable schema, using fallback options')
      cachedOptions = FALLBACK_OPTIONS
      cacheTimestamp = Date.now()
      return FALLBACK_OPTIONS
    }

    const data = await response.json()
    const cakeDirectoryTable = data.tables.find(
      (t: { id: string }) => t.id === AIRTABLE_TABLE_ID
    )

    if (!cakeDirectoryTable) {
      console.error('Cake Directory table not found, using fallback options')
      cachedOptions = FALLBACK_OPTIONS
      cacheTimestamp = Date.now()
      return FALLBACK_OPTIONS
    }

    const options: AirtableFieldOptions = {
      product: [],
      type: [],
      cakeSurface: [],
      design: [],
      size: [],
      servingSize: [],
      occasion: [],
      theme: [],
      colors: [],
      decorations: [],
      brands: [],
    }

    // Extract choices from each field
    for (const field of cakeDirectoryTable.fields) {
      const fieldKey = Object.entries(FIELD_IDS).find(
        ([, id]) => id === field.id
      )?.[0] as keyof AirtableFieldOptions | undefined

      if (fieldKey && field.options?.choices) {
        options[fieldKey] = field.options.choices.map((choice: AirtableChoice) => ({
          id: choice.id,
          name: choice.name,
          color: choice.color,
        }))
      }
    }

    // Update cache
    cachedOptions = options
    cacheTimestamp = Date.now()

    return options
  } catch (error) {
    console.error('Error fetching Airtable options:', error)
    cachedOptions = FALLBACK_OPTIONS
    cacheTimestamp = Date.now()
    return FALLBACK_OPTIONS
  }
}

// Get records from the Cake Directory (gallery of past cakes)
export async function getCakeGallery(limit = 100) {
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?maxRecords=${limit}&view=Gallery`,
    {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch cake gallery')
  }

  const data = await response.json()
  return data.records
}
