import { NextRequest, NextResponse } from 'next/server'

// Get place details including coordinates
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const placeId = searchParams.get('placeId')

  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not configured')
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,name&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Places API')
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message)
      return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 })
    }

    const result = data.result
    return NextResponse.json({
      name: result.name,
      address: result.formatted_address,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
    })
  } catch (error) {
    console.error('Error fetching place details:', error)
    return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 })
  }
}
