import { NextResponse } from 'next/server'
import {
  fetchBootstrap,
  fetchManagerPicks,
  getCurrentGameweek,
  getNextGameweek,
  getPurchasePrices,
  calculateSellingPrice,
} from '@/lib/fpl-api'
import { getActivePredictionProvider } from '@/lib/predictions'
import { runTransferOptimizer } from '@/lib/optimizer'
import type { OptimizationParams, OptimizationPlayer, TransferSuggestion } from '@/types/optimization'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { teamId, maxTransfers = 2, horizon = 3 } = body

    // Validate team ID
    if (!teamId || !/^\d+$/.test(String(teamId))) {
      return NextResponse.json(
        { error: 'Invalid team ID. Must be a number.' },
        { status: 400 }
      )
    }

    // Fetch data in parallel
    const [bootstrap, currentGW, nextGW] = await Promise.all([
      fetchBootstrap(),
      getCurrentGameweek(),
      getNextGameweek(),
    ])

    const picks = await fetchManagerPicks(String(teamId), currentGW)

    // Get purchase prices for selling price calculation
    let purchasePrices: Map<number, number>
    try {
      purchasePrices = await getPurchasePrices(String(teamId))
    } catch {
      purchasePrices = new Map()
    }

    // Calculate current squad value (based on selling prices)
    const currentSquadIds = picks.picks.map(pick => pick.element)
    let squadSellingValue = 0

    for (const playerId of currentSquadIds) {
      const player = bootstrap.elements.find(p => p.id === playerId)
      if (player) {
        const purchasePrice = purchasePrices.get(playerId) || player.now_cost / 10
        const sellingPrice = calculateSellingPrice(purchasePrice, player.now_cost / 10)
        squadSellingValue += sellingPrice
      }
    }

    const bank = picks.entry_history.bank / 10
    const totalBudget = squadSellingValue + bank

    // Get predictions for all players
    const predictionProvider = getActivePredictionProvider()
    const predictions = await predictionProvider.fetchPredictions(nextGW, horizon)

    // Build optimization player list with predictions
    const allPlayers: OptimizationPlayer[] = bootstrap.elements.map(player => {
      const optPlayer: OptimizationPlayer = {
        id: player.id,
        position: player.element_type,
        team: player.team,
        price: player.now_cost / 10,
        name: player.web_name,
      }

      // Add expected points for each gameweek in horizon
      for (let gw = 1; gw <= horizon; gw++) {
        const epKey = `ep_gw${gw}` as keyof OptimizationPlayer
        // Find prediction for this player and gameweek
        const gwPrediction = predictions.find(
          (p) => p.player_id === player.id && p.gameweek === nextGW + gw - 1
        )

        if (gwPrediction) {
          optPlayer[epKey] = gwPrediction.expected_points
        } else {
          // Fallback to form + PPG average
          const form = parseFloat(player.form) || 0
          const ppg = parseFloat(player.points_per_game) || 0
          optPlayer[epKey] = (form + ppg) / 2
        }
      }

      return optPlayer
    })

    // Filter out unavailable players (injured/suspended with low chance of playing)
    const availablePlayers = allPlayers.filter(player => {
      const rawPlayer = bootstrap.elements.find(p => p.id === player.id)
      if (!rawPlayer) return false
      // Include player if chance of playing is > 25% or unknown (null)
      return rawPlayer.chance_of_playing_next_round === null ||
             rawPlayer.chance_of_playing_next_round >= 25
    })

    // Estimate free transfers (simplified)
    const freeTransfers = picks.entry_history.event_transfers === 0 ? 2 : 1

    // Build optimization params
    const params: OptimizationParams = {
      current_squad: currentSquadIds,
      all_players: availablePlayers,
      budget: totalBudget,
      free_transfers: freeTransfers,
      horizon,
    }

    // Run optimizer
    const result = await runTransferOptimizer({
      ...params,
      max_transfers: maxTransfers,
    } as OptimizationParams & { max_transfers: number })

    // Build transfer suggestions with player details
    const transferSuggestions: TransferSuggestion[] = result.transfers_out.map((outPlayer, index) => {
      const inPlayer = result.transfers_in[index]
      const outRaw = bootstrap.elements.find(p => p.id === outPlayer.id)
      const inRaw = bootstrap.elements.find(p => p.id === inPlayer.id)
      const outTeam = bootstrap.teams.find(t => t.id === outPlayer.team)
      const inTeam = bootstrap.teams.find(t => t.id === inPlayer.team)
      const outPos = bootstrap.element_types.find(p => p.id === outPlayer.position)
      const inPos = bootstrap.element_types.find(p => p.id === inPlayer.position)

      const outEp = Object.keys(outPlayer)
        .filter(k => k.startsWith('ep_gw'))
        .reduce((sum, k) => sum + (outPlayer[k] || 0), 0)
      const inEp = Object.keys(inPlayer)
        .filter(k => k.startsWith('ep_gw'))
        .reduce((sum, k) => sum + (inPlayer[k] || 0), 0)

      return {
        player_out: {
          id: outPlayer.id,
          name: outRaw?.web_name || 'Unknown',
          position: outPos?.singular_name_short || 'UNK',
          team: outTeam?.short_name || 'UNK',
          price: outPlayer.price,
          expected_points: outEp,
        },
        player_in: {
          id: inPlayer.id,
          name: inRaw?.web_name || 'Unknown',
          position: inPos?.singular_name_short || 'UNK',
          team: inTeam?.short_name || 'UNK',
          price: inPlayer.price,
          expected_points: inEp,
        },
        expected_gain: inEp - outEp,
        cost: index < freeTransfers ? 0 : -4,
      }
    })

    return NextResponse.json({
      transfers: transferSuggestions,
      total_transfers: result.total_transfers,
      point_hit: result.point_hit,
      expected_points: result.expected_points,
      budget_remaining: totalBudget - result.transfers_in.reduce((sum, p) => sum + p.price, 0)
        + result.transfers_out.reduce((sum, p) => sum + p.price, 0),
      free_transfers: freeTransfers,
      horizon,
    })
  } catch (error) {
    console.error('Error in transfer optimization:', error)

    const errorMessage = error instanceof Error ? error.message : 'Optimization failed'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
