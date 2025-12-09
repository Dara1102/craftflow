import { NextResponse } from 'next/server'
import { getAirtableFieldOptions } from '@/lib/airtable'

// GET /api/airtable/options - Get all field options from Airtable
export async function GET() {
  try {
    const options = await getAirtableFieldOptions()
    return NextResponse.json(options)
  } catch (error) {
    console.error('Failed to fetch Airtable options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch options from Airtable' },
      { status: 500 }
    )
  }
}
