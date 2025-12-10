import { NextRequest, NextResponse } from 'next/server'

// Calculate driving distance between two points
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const originLat = searchParams.get('originLat')
  const originLng = searchParams.get('originLng')
  const destLat = searchParams.get('destLat')
  const destLng = searchParams.get('destLng')

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'All coordinates are required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_DISTANCE_API_KEY || process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    // Calculate straight-line distance if no API key
    const distanceMiles = calculateHaversineDistance(
      parseFloat(originLat), parseFloat(originLng),
      parseFloat(destLat), parseFloat(destLng)
    )
    return NextResponse.json({
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      durationMinutes: null,
      isEstimate: true,
    })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&units=imperial&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Google Distance Matrix API')
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Distance Matrix API error:', data.status, data.error_message)
      // Fall back to straight-line calculation
      const distanceMiles = calculateHaversineDistance(
        parseFloat(originLat), parseFloat(originLng),
        parseFloat(destLat), parseFloat(destLng)
      )
      return NextResponse.json({
        distanceMiles: Math.round(distanceMiles * 10) / 10,
        durationMinutes: null,
        isEstimate: true,
      })
    }

    const element = data.rows?.[0]?.elements?.[0]

    if (element?.status !== 'OK') {
      // Fall back to straight-line calculation
      const distanceMiles = calculateHaversineDistance(
        parseFloat(originLat), parseFloat(originLng),
        parseFloat(destLat), parseFloat(destLng)
      )
      return NextResponse.json({
        distanceMiles: Math.round(distanceMiles * 10) / 10,
        durationMinutes: null,
        isEstimate: true,
      })
    }

    // Distance is in meters from the API, convert to miles
    const distanceMeters = element.distance?.value || 0
    const distanceMiles = distanceMeters / 1609.344

    // Duration is in seconds
    const durationSeconds = element.duration?.value || 0
    const durationMinutes = Math.round(durationSeconds / 60)

    return NextResponse.json({
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      durationMinutes,
      isEstimate: false,
    })
  } catch (error) {
    console.error('Error calculating distance:', error)
    // Fall back to straight-line calculation
    const distanceMiles = calculateHaversineDistance(
      parseFloat(originLat), parseFloat(originLng),
      parseFloat(destLat), parseFloat(destLng)
    )
    return NextResponse.json({
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      durationMinutes: null,
      isEstimate: true,
    })
  }
}

// Calculate straight-line distance using Haversine formula
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
