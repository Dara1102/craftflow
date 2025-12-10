import { NextRequest, NextResponse } from 'next/server'

// Google Places API for venue/address autocomplete
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')

  if (!query || query.length < 3) {
    return NextResponse.json([])
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    // Return mock data if no API key configured
    console.warn('GOOGLE_PLACES_API_KEY not configured - returning empty results')
    return NextResponse.json([])
  }

  try {
    // Use Google Places Autocomplete API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment|geocode&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Places API')
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message)
      return NextResponse.json([])
    }

    // Transform results
    const results = (data.predictions || []).map((prediction: {
      place_id: string
      description: string
      structured_formatting?: {
        main_text: string
        secondary_text: string
      }
    }) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json([])
  }
}
