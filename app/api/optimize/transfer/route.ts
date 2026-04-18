import { NextResponse } from 'next/server'
import {
  fetchBootstrap,
  fetchManagerPicks,
  getCurrentGameweek,
  getNextGameweek,
  getPurchasePrices,
  calculateSellingPrice,
} from '@/lib/fpl-api'
import { calculateFreeTransfers } from '@/lib/fpl-rules'
import { callPythonOptimizer, isVercelEnvironment, runTransferOptimizer } from '@/lib/optimizer'
import type {
  OptimizationParams,
  OptimizationPlayer,
  OptimizationResult,
  TransferSuggestion,
} from '@/types/optimization'

// Must match api/optimize.py
const HORIZON_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.15]

function weightedEp(player: OptimizationPlayer): number {
  let total = 0
  for (const key of Object.keys(player)) {
    if (!key.startsWith('ep_gw')) continue
    const gw = parseInt(key.slice(5), 10)
    if (!Number.isFinite(gw) || gw < 1) continue
    const weight = HORIZON_WEIGHTS[gw - 1] ?? 0.1
    const value = Number(player[key]) || 0
    total += value * weight
  }
  return total
}

function areResultsIdentical(a: OptimizationResult, b: OptimizationResult): boolean {
  if (a.total_transfers !== b.total_transfers) return false
  const ids = (players: OptimizationPlayer[]) => new Set(players.map(p => p.id))
  const aIn = ids(a.transfers_in)
  const bIn = ids(b.transfers_in)
  const aOut = ids(a.transfers_out)
  const bOut = ids(b.transfers_out)
  if (aIn.size !== bIn.size || aOut.size !== bOut.size) return false
  for (const id of aIn) if (!bIn.has(id)) return false
  for (const id of aOut) if (!bOut.has(id)) return false
  return true
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { teamId, maxTransfers = 2, horizon = 3, dualMode = true } = body

    if (!teamId || !/^\d+$/.test(String(teamId))) {
      return NextResponse.json(
        { error: 'Invalid team ID. Must be a number.' },
        { status: 400 },
      )
    }

    const [bootstrap, currentGW, nextGW] = await Promise.all([
      fetchBootstrap(),
      getCurrentGameweek(),
      getNextGameweek(),
    ])

    const planningGW = nextGW > 1 ? nextGW : currentGW
    const picksGW = currentGW

    const picks = await fetchManagerPicks(String(teamId), picksGW)

    let purchasePrices: Map<number, number>
    try {
      purchasePrices = await getPurchasePrices(String(teamId))
    } catch {
      purchasePrices = new Map()
    }

    const currentSquadIds = picks.picks.map(pick => pick.element)

    if (currentSquadIds.length !== 15) {
      return NextResponse.json(
        {
          error: 'Invalid squad size',
          details: `Your squad has ${currentSquadIds.length} players instead of 15. Please ensure your squad is complete before optimizing transfers.`,
        },
        { status: 400 },
      )
    }

    const positionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    let squadSellingValue = 0
    for (const playerId of currentSquadIds) {
      const player = bootstrap.elements.find(p => p.id === playerId)
      if (!player) {
        return NextResponse.json(
          { error: `Squad contains player ${playerId} not present in the FPL bootstrap.` },
          { status: 500 },
        )
      }
      positionCounts[player.element_type]++
      const purchasePrice = purchasePrices.get(playerId) || player.now_cost / 10
      squadSellingValue += calculateSellingPrice(purchasePrice, player.now_cost / 10)
    }

    if (positionCounts[1] !== 2 || positionCounts[2] !== 5 || positionCounts[3] !== 5 || positionCounts[4] !== 3) {
      return NextResponse.json(
        {
          error: 'Invalid squad composition',
          details: `Your squad has an invalid position distribution: ${positionCounts[1]} GK, ${positionCounts[2]} DEF, ${positionCounts[3]} MID, ${positionCounts[4]} FWD. A valid squad requires 2 GK, 5 DEF, 5 MID, 3 FWD.`,
        },
        { status: 400 },
      )
    }

    const bank = picks.entry_history.bank / 10
    const totalBudget = squadSellingValue + bank

    const allPlayers: OptimizationPlayer[] = bootstrap.elements.map(player => {
      const isOwned = currentSquadIds.includes(player.id)
      const currentPrice = player.now_cost / 10

      let sellingPrice = currentPrice
      if (isOwned) {
        const purchasePrice = purchasePrices.get(player.id) || currentPrice
        sellingPrice = calculateSellingPrice(purchasePrice, currentPrice)
      }

      const optPlayer: OptimizationPlayer = {
        id: player.id,
        position: player.element_type,
        team: player.team,
        price: currentPrice,
        selling_price: sellingPrice,
        name: player.web_name,
      }

      const form = parseFloat(player.form) || 0
      const ppg = parseFloat(player.points_per_game) || 0
      const baseEP = (form + ppg) / 2

      let availabilityFactor = 1.0
      if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 75) {
        availabilityFactor = player.chance_of_playing_next_round / 100
      }
      const adjustedEP = baseEP * availabilityFactor

      for (let gw = 1; gw <= horizon; gw++) {
        optPlayer[`ep_gw${gw}`] = adjustedEP
      }

      return optPlayer
    })

    const availablePlayers = allPlayers.filter(player => {
      const raw = bootstrap.elements.find(p => p.id === player.id)
      if (!raw) return false
      if (currentSquadIds.includes(player.id)) return true
      return raw.chance_of_playing_next_round === null ||
             raw.chance_of_playing_next_round >= 25
    })

    const freeTransfers = await calculateFreeTransfers(String(teamId), planningGW)

    const baseParams: OptimizationParams = {
      current_squad: currentSquadIds,
      all_players: availablePlayers,
      budget: totalBudget,
      bank,
      free_transfers: freeTransfers,
      horizon,
    }

    const originHeader = request.headers.get('origin')
    const optimizerFn = isVercelEnvironment()
      ? (params: OptimizationParams) => callPythonOptimizer(params, { originHeader })
      : runTransferOptimizer

    const buildTransferSuggestions = (result: OptimizationResult): TransferSuggestion[] => {
      const hitTransfersCount = Math.max(0, result.total_transfers - freeTransfers)
      const penaltyPerHitTransfer = hitTransfersCount > 0 ? -4 / hitTransfersCount : 0

      return result.transfers_out.map((outPlayer, index) => {
        const inPlayer = result.transfers_in[index]
        const outRaw = bootstrap.elements.find(p => p.id === outPlayer.id)
        const inRaw = bootstrap.elements.find(p => p.id === inPlayer.id)
        const outTeam = bootstrap.teams.find(t => t.id === outPlayer.team)
        const inTeam = bootstrap.teams.find(t => t.id === inPlayer.team)
        const outPos = bootstrap.element_types.find(p => p.id === outPlayer.position)
        const inPos = bootstrap.element_types.find(p => p.id === inPlayer.position)

        const outEp = weightedEp(outPlayer)
        const inEp = weightedEp(inPlayer)
        const isFreeTransfer = index < freeTransfers
        const rawGain = inEp - outEp
        const adjustedGain = isFreeTransfer ? rawGain : rawGain + penaltyPerHitTransfer

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
          expected_gain: adjustedGain,
          cost: isFreeTransfer ? 0 : -4,
        }
      })
    }

    const validateResult = (result: OptimizationResult, label: string) => {
      if (!result.squad || !Array.isArray(result.transfers_in) || !Array.isArray(result.transfers_out)) {
        throw new Error(`${label} optimizer returned invalid structure`)
      }
      if (result.transfers_in.length !== result.transfers_out.length) {
        throw new Error(`${label} optimizer returned unbalanced transfers`)
      }
      if (result.squad.length !== 15) {
        throw new Error(`${label} optimizer returned invalid squad size: ${result.squad.length}`)
      }
    }

    if (dualMode) {
      let conservativeResult: OptimizationResult
      let optimalResult: OptimizationResult

      try {
        [conservativeResult, optimalResult] = await Promise.all([
          optimizerFn({ ...baseParams, max_transfers: Math.max(1, freeTransfers) }),
          optimizerFn({ ...baseParams, max_transfers: maxTransfers }),
        ])
      } catch (optimizerError) {
        console.error('Optimizer error:', optimizerError)
        return NextResponse.json(
          { error: optimizerError instanceof Error ? optimizerError.message : 'Optimization failed' },
          { status: 500 },
        )
      }

      try {
        validateResult(conservativeResult, 'Conservative')
        validateResult(optimalResult, 'Optimal')
      } catch (validationError) {
        return NextResponse.json(
          { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
          { status: 500 },
        )
      }

      const identical = areResultsIdentical(conservativeResult, optimalResult)

      const conservativeTransfers = buildTransferSuggestions(conservativeResult)
      const optimalTransfers = buildTransferSuggestions(optimalResult)

      const netGainFromHits = optimalResult.expected_points - conservativeResult.expected_points
      const hitTransfersCount = Math.max(0, optimalResult.total_transfers - freeTransfers)

      const netSpend = (r: OptimizationResult) =>
        r.transfers_in.reduce((sum, p) => sum + p.price, 0) -
        r.transfers_out.reduce((sum, p) => sum + (p.selling_price || p.price), 0)

      const conservativeBudgetRemaining = bank - netSpend(conservativeResult)
      const optimalBudgetRemaining = bank - netSpend(optimalResult)

      let recommendation: 'conservative' | 'optimal' | 'either' = 'either'
      if (!identical) {
        recommendation = netGainFromHits > 0 ? 'optimal' : 'conservative'
      }

      return NextResponse.json({
        mode: 'dual',
        conservative: {
          transfers: conservativeTransfers,
          total_transfers: conservativeResult.total_transfers,
          point_hit: conservativeResult.point_hit,
          expected_points: conservativeResult.expected_points,
          free_transfers: freeTransfers,
          horizon,
          budget_remaining: conservativeBudgetRemaining,
        },
        optimal: {
          transfers: optimalTransfers,
          total_transfers: optimalResult.total_transfers,
          point_hit: optimalResult.point_hit,
          expected_points: optimalResult.expected_points,
          free_transfers: freeTransfers,
          horizon,
          budget_remaining: optimalBudgetRemaining,
        },
        comparison: {
          are_identical: identical,
          net_gain_from_hits: netGainFromHits,
          hit_transfers_count: hitTransfersCount,
          recommendation,
        },
      })
    }

    let result: OptimizationResult
    try {
      result = await optimizerFn({ ...baseParams, max_transfers: maxTransfers })
    } catch (optimizerError) {
      console.error('Optimizer error:', optimizerError)
      return NextResponse.json(
        {
          error: optimizerError instanceof Error ? optimizerError.message : 'Optimization failed',
          details: `Budget: £${totalBudget.toFixed(1)}m, Squad: ${currentSquadIds.length} players, Available: ${availablePlayers.length} players`,
        },
        { status: 500 },
      )
    }

    try {
      validateResult(result, 'Single')
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 500 },
      )
    }

    const transferInCost = result.transfers_in.reduce((sum, p) => sum + p.price, 0)
    const transferOutRevenue = result.transfers_out.reduce(
      (sum, p) => sum + (p.selling_price || p.price),
      0,
    )
    const netSpend = transferInCost - transferOutRevenue
    if (netSpend > bank + 0.05) {
      return NextResponse.json(
        {
          error: 'Transfer exceeds available budget',
          details: `Net spend: £${netSpend.toFixed(1)}m, Bank: £${bank.toFixed(1)}m`,
        },
        { status: 500 },
      )
    }

    const transferSuggestions = buildTransferSuggestions(result)
    const budgetRemaining = bank - netSpend

    return NextResponse.json({
      mode: 'single',
      transfers: transferSuggestions,
      total_transfers: result.total_transfers,
      point_hit: result.point_hit,
      expected_points: result.expected_points,
      budget_remaining: budgetRemaining,
      free_transfers: freeTransfers,
      horizon,
    })
  } catch (error) {
    console.error('Error in transfer optimization:', error)
    const errorMessage = error instanceof Error ? error.message : 'Optimization failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
