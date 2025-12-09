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
    throw new Error('Failed to fetch Airtable schema')
  }

  const data = await response.json()
  const cakeDirectoryTable = data.tables.find(
    (t: { id: string }) => t.id === AIRTABLE_TABLE_ID
  )

  if (!cakeDirectoryTable) {
    throw new Error('Cake Directory table not found')
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
