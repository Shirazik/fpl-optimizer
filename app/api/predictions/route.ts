import { NextResponse } from 'next/server'
import { getActivePredictionProvider } from '@/lib/predictions'
import { getCurrentGameweek } from '@/lib/fpl-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameweek = searchParams.get('gameweek')
    const horizon = searchParams.get('horizon')
    const playerIds = searchParams.get('playerIds')

    const provider = getActivePredictionProvider()
    const currentGW = gameweek ? parseInt(gameweek) : await getCurrentGameweek()
    const predictionHorizon = horizon ? parseInt(horizon) : 3

    // Fetch predictions
    const predictions = await provider.fetchPredictions(currentGW, predictionHorizon)

    // Filter by player IDs if specified
    const filteredPredictions = playerIds
      ? predictions.filter(p =>
        playerIds.split(',').map(Number).includes(p.player_id)
      )
      : predictions

    return NextResponse.json({
      provider: provider.name,
      gameweek: currentGW,
      horizon: predictionHorizon,
      predictions: filteredPredictions,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error in predictions API route:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
      },
      { status: 500 }
    )
  }
}
