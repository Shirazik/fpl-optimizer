import { NextResponse } from 'next/server'
import {
  fetchManagerEntry,
  fetchManagerPicks,
  fetchBootstrap,
  getCurrentGameweek,
  enrichPlayer,
  getPurchasePrices,
  calculateSellingPrice,
} from '@/lib/fpl-api'
import type { TeamAnalysis, SquadPlayer } from '@/types/fpl'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params

  try {
    // Validate team ID
    if (!teamId || !/^\d+$/.test(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID. Must be a number.' },
        { status: 400 }
      )
    }

    // Fetch data in parallel
    const [manager, bootstrap, currentGW] = await Promise.all([
      fetchManagerEntry(teamId),
      fetchBootstrap(),
      getCurrentGameweek(),
    ])

    const picks = await fetchManagerPicks(teamId, currentGW)

    // Get purchase prices for selling price calculation
    let purchasePrices: Map<number, number>
    try {
      purchasePrices = await getPurchasePrices(teamId)
    } catch (error) {
      console.warn('Could not fetch purchase prices:', error)
      purchasePrices = new Map()
    }

    // Build squad with enriched player data
    const squad: SquadPlayer[] = picks.picks.map(pick => {
      const player = bootstrap.elements.find(p => p.id === pick.element)
      if (!player) {
        throw new Error(`Player ${pick.element} not found`)
      }

      const enrichedPlayer = enrichPlayer(player, bootstrap)

      // Calculate selling price
      const purchasePrice = purchasePrices.get(pick.element) || enrichedPlayer.price
      const sellingPrice = calculateSellingPrice(purchasePrice, enrichedPlayer.price)

      return {
        player: {
          ...enrichedPlayer,
          selling_price: sellingPrice,
        },
        pick_position: pick.position,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
        multiplier: pick.multiplier,
      }
    })

    // Sort by position (1-11 starting XI, 12-15 bench)
    squad.sort((a, b) => a.pick_position - b.pick_position)

    const teamAnalysis: TeamAnalysis = {
      manager,
      squad,
      bank: picks.entry_history.bank / 10,  // Convert to £m
      team_value: picks.entry_history.value / 10,  // Convert to £m
      free_transfers: picks.entry_history.event_transfers === 0
        ? Math.min(2, (manager.last_deadline_total_transfers === 0 ? 1 : 0) + 1)
        : 1,  // Simplified FT calculation
      current_gameweek: currentGW,
      total_expected_points: 0,  // Will be calculated after adding predictions
    }

    return NextResponse.json(teamAnalysis, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error in team API route:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team data'
    const statusCode = errorMessage.includes('not found') ? 404
      : errorMessage.includes('private') ? 403
        : 500

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
