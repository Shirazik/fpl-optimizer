import { NextResponse } from 'next/server'
import { fetchFixtures } from '@/lib/fpl-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameweek = searchParams.get('gameweek')

    const allFixtures = await fetchFixtures()

    // Filter by gameweek if specified
    const fixtures = gameweek
      ? allFixtures.filter(f => f.event === parseInt(gameweek))
      : allFixtures

    return NextResponse.json(fixtures, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
      },
    })
  } catch (error) {
    console.error('Error in fixtures API route:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch fixtures',
      },
      { status: 500 }
    )
  }
}
