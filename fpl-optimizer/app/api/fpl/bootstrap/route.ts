import { NextResponse } from 'next/server'
import { fetchBootstrap } from '@/lib/fpl-api'

export async function GET() {
  try {
    const data = await fetchBootstrap()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Error in bootstrap API route:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch bootstrap data',
      },
      { status: 500 }
    )
  }
}
