import { NextResponse } from 'next/server'
import {
  fetchBootstrap,
  fetchManagerPicks,
  getCurrentGameweek,
  getNextGameweek,
  getPurchasePrices,
  calculateSellingPrice,
} from '@/lib/fpl-api'
import { runTransferOptimizer } from '@/lib/optimizer'
import type { OptimizationParams, OptimizationPlayer, OptimizationResult, TransferSuggestion } from '@/types/optimization'

/**
 * Check if running in Vercel serverless environment
 */
function isVercelEnvironment(): boolean {
  // #region agent log
  const vercelEnv = process.env.VERCEL;
  const nowRegion = process.env.NOW_REGION;
  const result = vercelEnv === '1' || nowRegion !== undefined;
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:16',message:'isVercelEnvironment check',data:{VERCEL:vercelEnv,NOW_REGION:nowRegion,result,allEnvKeys:Object.keys(process.env).filter(k=>k.includes('VERCEL')||k.includes('NOW'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return result;
}

/**
 * Call Python serverless function directly (bypasses runTransferOptimizer to avoid circular calls)
 * In Vercel, Python files in api/ are accessible at /api/{filename} (without .py extension)
 */
async function callPythonOptimizer(params: OptimizationParams): Promise<OptimizationResult> {
  // In Vercel, use the deployment URL. For local dev, use localhost
  const vercelUrl = process.env.VERCEL_URL;
  const nextPublicVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  const baseUrl = vercelUrl
    ? `https://${vercelUrl}`
    : nextPublicVercelUrl
    ? `https://${nextPublicVercelUrl}`
    : 'http://localhost:3000'
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:24',message:'callPythonOptimizer entry',data:{VERCEL_URL:vercelUrl,NEXT_PUBLIC_VERCEL_URL:nextPublicVercelUrl,baseUrl,paramsKeys:Object.keys(params)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // Try /api/optimize first (Vercel auto-routes api/optimize.py to /api/optimize)
  // If that fails, try /api/optimize.py as fallback
  let response: Response
  let lastError: Error | null = null

  for (const endpoint of ['/api/optimize', '/api/optimize.py']) {
    try {
      const fullUrl = `${baseUrl}${endpoint}`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:37',message:'callPythonOptimizer before fetch',data:{fullUrl,endpoint,baseUrl,method:'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
      
      // #region agent log
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v });
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:47',message:'callPythonOptimizer after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:fullUrl,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          const text = await response.text().catch(() => 'Non-JSON response')
          throw new Error(`Optimizer returned non-JSON response: ${text.substring(0, 200)}`)
        }
        return response.json()
      }

      // If 404, try next endpoint
      if (response.status === 404 && endpoint === '/api/optimize') {
        continue
      }

      // For other errors, try to get error message
      const contentType = response.headers.get('content-type')
      // #region agent log
      const responseClone = response.clone();
      let errorText = '';
      try {
        errorText = await responseClone.text().catch(() => 'Unknown error');
      } catch (e) {
        errorText = 'Could not read error body';
      }
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:61',message:'callPythonOptimizer error response',data:{status:response.status,statusText:response.statusText,contentType,errorText:errorText.substring(0,500),url:fullUrl,endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      if (contentType?.includes('application/json')) {
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || 'Optimizer failed')
        } catch (parseErr) {
          throw new Error(`Optimizer returned ${response.status}: ${errorText.substring(0, 200)}`)
        }
      }
      throw new Error(`Optimizer returned ${response.status}: ${errorText.substring(0, 200)}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // If this was the first endpoint and it's a 404, try the second one
      if (endpoint === '/api/optimize' && error instanceof Error && error.message.includes('404')) {
        continue
      }
      // Otherwise, re-throw
      throw error
    }
  }

  // If we get here, both endpoints failed
  throw lastError || new Error('Failed to call Python optimizer')
}

// Helper function to compare two optimization results
function areResultsIdentical(result1: OptimizationResult, result2: OptimizationResult): boolean {
  if (result1.total_transfers !== result2.total_transfers) return false

  const transfers1In = new Set(result1.transfers_in.map(p => p.id))
  const transfers2In = new Set(result2.transfers_in.map(p => p.id))
  const transfers1Out = new Set(result1.transfers_out.map(p => p.id))
  const transfers2Out = new Set(result2.transfers_out.map(p => p.id))

  if (transfers1In.size !== transfers2In.size || transfers1Out.size !== transfers2Out.size) return false

  for (const id of transfers1In) if (!transfers2In.has(id)) return false
  for (const id of transfers1Out) if (!transfers2Out.has(id)) return false

  return true
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { teamId, maxTransfers = 2, horizon = 3, dualMode = true } = body

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

    // Validate squad size and composition
    if (currentSquadIds.length !== 15) {
      return NextResponse.json(
        {
          error: 'Invalid squad size',
          details: `Your squad has ${currentSquadIds.length} players instead of 15. This is likely due to an incomplete squad in FPL. Please ensure your squad is complete before optimizing transfers.`,
        },
        { status: 400 }
      )
    }

    // Check position distribution
    const positionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const playerId of currentSquadIds) {
      const player = bootstrap.elements.find(p => p.id === playerId)
      if (player) {
        positionCounts[player.element_type]++
      }
    }

    if (positionCounts[1] !== 2 || positionCounts[2] !== 5 || positionCounts[3] !== 5 || positionCounts[4] !== 3) {
      return NextResponse.json(
        {
          error: 'Invalid squad composition',
          details: `Your squad has an invalid position distribution: ${positionCounts[1]} GK, ${positionCounts[2]} DEF, ${positionCounts[3]} MID, ${positionCounts[4]} FWD. A valid squad requires 2 GK, 5 DEF, 5 MID, 3 FWD.`,
        },
        { status: 400 }
      )
    }

    const bank = picks.entry_history.bank / 10
    const totalBudget = squadSellingValue + bank

    // Build optimization player list with simple form-based predictions
    const allPlayers: OptimizationPlayer[] = bootstrap.elements.map(player => {
      const isOwned = currentSquadIds.includes(player.id)
      const currentPrice = player.now_cost / 10

      // Calculate selling price for owned players using half-profit rule
      let sellingPrice = currentPrice
      if (isOwned) {
        const purchasePrice = purchasePrices.get(player.id) || currentPrice
        sellingPrice = calculateSellingPrice(purchasePrice, currentPrice)
      }

      const optPlayer: OptimizationPlayer = {
        id: player.id,
        position: player.element_type,
        team: player.team,
        price: currentPrice,  // Market price for buying
        selling_price: sellingPrice,  // Actual selling price (matters for owned players)
        name: player.web_name,
      }

      // Simple form-based expected points calculation
      const form = parseFloat(player.form) || 0
      const ppg = parseFloat(player.points_per_game) || 0
      const baseEP = (form + ppg) / 2

      // Apply availability factor
      let availabilityFactor = 1.0
      if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 75) {
        availabilityFactor = player.chance_of_playing_next_round / 100
      }

      const adjustedEP = baseEP * availabilityFactor

      // Add expected points for each gameweek in horizon
      for (let gw = 1; gw <= horizon; gw++) {
        const epKey = `ep_gw${gw}` as keyof OptimizationPlayer
        optPlayer[epKey] = adjustedEP
      }

      return optPlayer
    })

    // Filter out unavailable players (injured/suspended with low chance of playing)
    // BUT: Always include current squad players so they can be transferred out
    const availablePlayers = allPlayers.filter(player => {
      const rawPlayer = bootstrap.elements.find(p => p.id === player.id)
      if (!rawPlayer) return false

      // Always include current squad players (even if suspended/injured)
      // They need to be available for transfer out
      if (currentSquadIds.includes(player.id)) {
        return true
      }

      // For non-squad players, only include if available to play
      // Include player if chance of playing is > 25% or unknown (null)
      return rawPlayer.chance_of_playing_next_round === null ||
             rawPlayer.chance_of_playing_next_round >= 25
    })

    // Calculate free transfers available for NEXT gameweek
    // FPL rules: You get 1 FT per week, can bank up to 2 total
    // If you made 0 transfers this week AND had a banked FT, you'll have 2 next week
    // If you made transfers this week, you get 1 FT next week

    const transfersMadeThisGW = picks.entry_history.event_transfers

    // Conservative estimate: Assume 1 FT unless we know they banked
    // For more accurate tracking, we'd need previous GW's transfer count
    let freeTransfers = 1
    if (transfersMadeThisGW === 0 && currentGW > 1) {
      // They made no transfers this week, so likely have 2 FT next week (banked + new)
      // Max 2 FT total per FPL rules
      freeTransfers = 2
    }

    // Build optimization params
    const params: OptimizationParams = {
      current_squad: currentSquadIds,
      all_players: availablePlayers,
      budget: totalBudget,  // Total budget (for reference)
      bank,  // Available cash (for budget constraint)
      free_transfers: freeTransfers,
      horizon,
    }

    // Use the same horizon weights as the Python optimizer for consistency
    const HORIZON_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.15]

    // Helper function to build transfer suggestions from optimizer result
    const buildTransferSuggestions = (result: OptimizationResult): TransferSuggestion[] => {
      // Calculate how to distribute the -4 point hit across transfers that incur it
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

        // Calculate weighted xP (matching optimizer logic)
        const outEp = Object.keys(outPlayer)
          .filter(k => k.startsWith('ep_gw'))
          .map(k => {
            const gwNum = parseInt(k.replace('ep_gw', ''))
            const weight = HORIZON_WEIGHTS[gwNum - 1] || 0.1
            return (outPlayer[k] || 0) * weight
          })
          .reduce((sum, val) => sum + val, 0)

        const inEp = Object.keys(inPlayer)
          .filter(k => k.startsWith('ep_gw'))
          .map(k => {
            const gwNum = parseInt(k.replace('ep_gw', ''))
            const weight = HORIZON_WEIGHTS[gwNum - 1] || 0.1
            return (inPlayer[k] || 0) * weight
          })
          .reduce((sum, val) => sum + val, 0)

        // Calculate expected gain, factoring in point hit for non-free transfers
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
          expected_gain: adjustedGain,  // Now includes proportional hit penalty
          cost: isFreeTransfer ? 0 : -4,
        }
      })
    }

    if (dualMode) {
      // DUAL MODE: Run TWO optimizations in parallel
      let conservativeResult: OptimizationResult
      let optimalResult: OptimizationResult

      // In Vercel, call Python endpoint directly to avoid circular dependency
      // In local dev, use runTransferOptimizer which spawns Python process
      const isVercel = isVercelEnvironment();
      const optimizerFn = isVercel ? callPythonOptimizer : runTransferOptimizer
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:336',message:'dualMode optimizer selection',data:{isVercel,optimizerFnName:isVercel?'callPythonOptimizer':'runTransferOptimizer'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      try {
        [conservativeResult, optimalResult] = await Promise.all([
          // Conservative: Use only free transfers (no hits possible)
          optimizerFn({
            ...params,
            max_transfers: freeTransfers,
          } as OptimizationParams & { max_transfers: number }),

          // Optimal: Allow up to maxTransfers (may take hits)
          optimizerFn({
            ...params,
            max_transfers: maxTransfers,
          } as OptimizationParams & { max_transfers: number }),
        ])
      } catch (optimizerError) {
        console.error('Optimizer error:', {
          error: optimizerError instanceof Error ? optimizerError.message : 'Unknown error',
          budget: totalBudget.toFixed(1),
          freeTransfers,
        })

        return NextResponse.json(
          { error: optimizerError instanceof Error ? optimizerError.message : 'Optimization failed' },
          { status: 500 }
        )
      }

      // Validate both results
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

      try {
        validateResult(conservativeResult, 'Conservative')
        validateResult(optimalResult, 'Optimal')
      } catch (validationError) {
        return NextResponse.json(
          { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
          { status: 500 }
        )
      }

      // Check if results are identical
      const identical = areResultsIdentical(conservativeResult, optimalResult)

      // Build transfer suggestions for both scenarios
      const conservativeTransfers = buildTransferSuggestions(conservativeResult)
      const optimalTransfers = buildTransferSuggestions(optimalResult)

      // Calculate comparison metrics
      const netGainFromHits = optimalResult.expected_points - conservativeResult.expected_points
      const hitTransfersCount = Math.max(0, optimalResult.total_transfers - freeTransfers)

      // Calculate budget remaining for each scenario
      const conservativeBudgetRemaining = bank -
        (conservativeResult.transfers_in.reduce((sum, p) => sum + p.price, 0) -
         conservativeResult.transfers_out.reduce((sum, p) => sum + (p.selling_price || p.price), 0))

      const optimalBudgetRemaining = bank -
        (optimalResult.transfers_in.reduce((sum, p) => sum + p.price, 0) -
         optimalResult.transfers_out.reduce((sum, p) => sum + (p.selling_price || p.price), 0))

      // Recommendation logic
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
    } else {
      // SINGLE MODE: Legacy backward compatibility
      let result: OptimizationResult

      // In Vercel, call Python endpoint directly to avoid circular dependency
      // In local dev, use runTransferOptimizer which spawns Python process
      const isVercel = isVercelEnvironment();
      const optimizerFn = isVercel ? callPythonOptimizer : runTransferOptimizer
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:447',message:'singleMode optimizer selection',data:{isVercel,optimizerFnName:isVercel?'callPythonOptimizer':'runTransferOptimizer'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      try {
        result = await optimizerFn({
          ...params,
          max_transfers: maxTransfers,
        } as OptimizationParams & { max_transfers: number })
      } catch (optimizerError) {
        console.error('Optimizer error details:', {
          error: optimizerError instanceof Error ? optimizerError.message : 'Unknown error',
          budget: totalBudget.toFixed(1),
          squadValue: squadSellingValue.toFixed(1),
          bank: bank.toFixed(1),
          currentSquadSize: currentSquadIds.length,
          availablePlayersCount: availablePlayers.length,
          freeTransfers,
        })

        return NextResponse.json(
          {
            error: optimizerError instanceof Error ? optimizerError.message : 'Optimization failed',
            details: `Budget: £${totalBudget.toFixed(1)}m, Squad: ${currentSquadIds.length} players, Available: ${availablePlayers.length} players`,
          },
          { status: 500 }
        )
      }

      // Validate optimizer result
      if (!result.squad || !Array.isArray(result.transfers_in) || !Array.isArray(result.transfers_out)) {
        return NextResponse.json(
          { error: 'Invalid optimizer response structure' },
          { status: 500 }
        )
      }

      if (result.transfers_in.length !== result.transfers_out.length) {
        return NextResponse.json(
          {
            error: 'Optimizer returned unbalanced transfers',
            details: `Transfers in: ${result.transfers_in.length}, Transfers out: ${result.transfers_out.length}`,
          },
          { status: 500 }
        )
      }

      if (result.squad.length !== 15) {
        return NextResponse.json(
          {
            error: 'Optimizer returned invalid squad size',
            details: `Expected 15 players, got ${result.squad.length}`,
          },
          { status: 500 }
        )
      }

      // Validate budget constraint is satisfied
      const transferInCost = result.transfers_in.reduce((sum, p) => sum + p.price, 0)
      const transferOutRevenue = result.transfers_out.reduce((sum, p) => {
        // Use selling price if available, otherwise use price
        return sum + (p.selling_price || p.price)
      }, 0)
      const netSpend = transferInCost - transferOutRevenue

      if (netSpend > bank + 0.1) {  // Small tolerance for floating point
        return NextResponse.json(
          {
            error: 'Transfer exceeds available budget',
            details: `Net spend: £${netSpend.toFixed(1)}m, Bank: £${bank.toFixed(1)}m`,
          },
          { status: 500 }
        )
      }

      const transferSuggestions = buildTransferSuggestions(result)

      // Calculate budget remaining using selling prices
      const budgetRemaining = bank -
        (result.transfers_in.reduce((sum, p) => sum + p.price, 0) -
         result.transfers_out.reduce((sum, p) => sum + (p.selling_price || p.price), 0))

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
    }
  } catch (error) {
    console.error('Error in transfer optimization:', error)

    const errorMessage = error instanceof Error ? error.message : 'Optimization failed'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
