// FPL Official API Client

import type {
  FPLBootstrapStatic,
  Fixture,
  ManagerEntry,
  ManagerPicks,
  Transfer,
  EnrichedPlayer,
  Player
} from '@/types/fpl'

const FPL_API_BASE = 'https://fantasy.premierleague.com/api'

// Default headers for FPL API requests
const FPL_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

// Cache for bootstrap data (updates once per gameweek)
let bootstrapCache: {
  data: FPLBootstrapStatic | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

const CACHE_DURATION = 24 * 60 * 60 * 1000  // 24 hours in milliseconds

/**
 * Fetch bootstrap-static data (all players, teams, gameweeks)
 * This is cached for 24 hours as it only updates once per gameweek
 */
export async function fetchBootstrap(forceRefresh = false): Promise<FPLBootstrapStatic> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:30',message:'fetchBootstrap entry',data:{forceRefresh,hasCache:!!bootstrapCache.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const now = Date.now()

  // Return cached data if fresh
  if (!forceRefresh && bootstrapCache.data && (now - bootstrapCache.timestamp) < CACHE_DURATION) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:35',message:'fetchBootstrap using cache',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return bootstrapCache.data
  }

  const url = `${FPL_API_BASE}/bootstrap-static/`
  const fetchOptions = { 
    cache: 'force-cache' as RequestCache,
    headers: FPL_API_HEADERS
  }
  // #region agent log
  const logData1 = {location:'fpl-api.ts:39',message:'fetchBootstrap before fetch',data:{url,options:fetchOptions,headers:Object.keys(fetchOptions).join(',')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
  console.log('[DEBUG]', JSON.stringify(logData1));
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
  // #endregion

  try {
    const response = await fetch(url, fetchOptions)

    // #region agent log
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })
    const logData2 = {location:'fpl-api.ts:43',message:'fetchBootstrap after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logData2));
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      const logData3 = {location:'fpl-api.ts:44',message:'fetchBootstrap response not ok',data:{status:response.status,statusText:response.statusText,url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
      console.error('[DEBUG ERROR]', JSON.stringify(logData3));
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
      // #endregion
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    const data: FPLBootstrapStatic = await response.json()

    // Update cache
    bootstrapCache = {
      data,
      timestamp: now
    }

    return data
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:66',message:'fetchBootstrap catch error',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching bootstrap data:', error)

    // Return cached data if available, even if stale
    if (bootstrapCache.data) {
      console.warn('Using stale bootstrap cache due to fetch error')
      return bootstrapCache.data
    }

    throw error
  }
}

/**
 * Get current gameweek number
 */
export async function getCurrentGameweek(): Promise<number> {
  const bootstrap = await fetchBootstrap()
  const currentGW = bootstrap.events.find(event => event.is_current)
  return currentGW?.id || 1
}

/**
 * Get next gameweek number
 */
export async function getNextGameweek(): Promise<number> {
  const bootstrap = await fetchBootstrap()
  const nextGW = bootstrap.events.find(event => event.is_next)
  return nextGW?.id || 1
}

/**
 * Fetch all fixtures
 */
export async function fetchFixtures(): Promise<Fixture[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:90',message:'fetchFixtures entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = `${FPL_API_BASE}/fixtures/`
  const fetchOptions = { 
    cache: 'force-cache' as RequestCache,
    headers: FPL_API_HEADERS
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:92',message:'fetchFixtures before fetch',data:{url,options:fetchOptions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  try {
    const response = await fetch(url, fetchOptions)

    // #region agent log
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:96',message:'fetchFixtures after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:97',message:'fetchFixtures response not ok',data:{status:response.status,statusText:response.statusText,url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:115',message:'fetchFixtures catch error',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching fixtures:', error)
    throw error
  }
}

/**
 * Fetch fixtures for a specific gameweek
 */
export async function fetchGameweekFixtures(gameweek: number): Promise<Fixture[]> {
  const allFixtures = await fetchFixtures()
  return allFixtures.filter(fixture => fixture.event === gameweek)
}

/**
 * Fetch manager/entry summary data
 */
export async function fetchManagerEntry(teamId: string): Promise<ManagerEntry> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:118',message:'fetchManagerEntry entry',data:{teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = `${FPL_API_BASE}/entry/${teamId}/`
  const fetchOptions = { 
    cache: 'default' as RequestCache,
    headers: FPL_API_HEADERS
  }
  // #region agent log
  const logData1 = {location:'fpl-api.ts:120',message:'fetchManagerEntry before fetch',data:{url,options:fetchOptions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
  console.log('[DEBUG]', JSON.stringify(logData1));
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
  // #endregion

  try {
    const response = await fetch(url, fetchOptions)

    // #region agent log
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })
    const logData2 = {location:'fpl-api.ts:124',message:'fetchManagerEntry after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logData2));
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      const logData3 = {location:'fpl-api.ts:125',message:'fetchManagerEntry response not ok',data:{status:response.status,statusText:response.statusText,url,teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
      console.error('[DEBUG ERROR]', JSON.stringify(logData3));
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
      // #endregion
      if (response.status === 404) {
        throw new Error('Team not found. Please check the team ID.')
      }
      if (response.status === 403) {
        throw new Error('This team is private.')
      }
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:146',message:'fetchManagerEntry catch error',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error,teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching manager entry:', error)
    throw error
  }
}

/**
 * Fetch manager's picks for a specific gameweek
 */
export async function fetchManagerPicks(teamId: string, gameweek: number): Promise<ManagerPicks> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:144',message:'fetchManagerPicks entry',data:{teamId,gameweek},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = `${FPL_API_BASE}/entry/${teamId}/event/${gameweek}/picks/`
  const fetchOptions = { 
    cache: 'default' as RequestCache,
    headers: FPL_API_HEADERS
  }
  // #region agent log
  const logData1 = {location:'fpl-api.ts:146',message:'fetchManagerPicks before fetch',data:{url,options:fetchOptions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
  console.log('[DEBUG]', JSON.stringify(logData1));
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
  // #endregion

  try {
    const response = await fetch(url, fetchOptions)

    // #region agent log
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })
    const logData2 = {location:'fpl-api.ts:153',message:'fetchManagerPicks after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logData2));
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      const logData3 = {location:'fpl-api.ts:154',message:'fetchManagerPicks response not ok',data:{status:response.status,statusText:response.statusText,url,teamId,gameweek},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
      console.error('[DEBUG ERROR]', JSON.stringify(logData3));
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
      // #endregion
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:172',message:'fetchManagerPicks catch error',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error,teamId,gameweek},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching manager picks:', error)
    throw error
  }
}

/**
 * Fetch manager's transfer history
 */
export async function fetchTransferHistory(teamId: string): Promise<Transfer[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:167',message:'fetchTransferHistory entry',data:{teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = `${FPL_API_BASE}/entry/${teamId}/transfers/`
  const fetchOptions = { 
    cache: 'default' as RequestCache,
    headers: FPL_API_HEADERS
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:169',message:'fetchTransferHistory before fetch',data:{url,options:fetchOptions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  try {
    const response = await fetch(url, fetchOptions)

    // #region agent log
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => { responseHeaders[k] = v })
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:173',message:'fetchTransferHistory after fetch',data:{status:response.status,statusText:response.statusText,ok:response.ok,responseHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:174',message:'fetchTransferHistory response not ok',data:{status:response.status,statusText:response.statusText,url,teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f141b307-52cd-40dd-bce7-33bd443aab97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fpl-api.ts:192',message:'fetchTransferHistory catch error',data:{error:error instanceof Error ? error.message : String(error),errorType:error instanceof Error ? error.constructor.name : typeof error,teamId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching transfer history:', error)
    throw error
  }
}

/**
 * Enrich player data with team and position names
 */
export function enrichPlayer(
  player: Player,
  bootstrap: FPLBootstrapStatic
): EnrichedPlayer {
  const team = bootstrap.teams.find(t => t.id === player.team)
  const position = bootstrap.element_types.find(p => p.id === player.element_type)

  return {
    ...player,
    team_name: team?.name || 'Unknown',
    team_short_name: team?.short_name || 'UNK',
    position_name: position?.singular_name || 'Unknown',
    price: player.now_cost / 10  // Convert to £m
  }
}

/**
 * Get enriched players (with team and position names)
 */
export async function getEnrichedPlayers(): Promise<EnrichedPlayer[]> {
  const bootstrap = await fetchBootstrap()
  return bootstrap.elements.map(player => enrichPlayer(player, bootstrap))
}

/**
 * Get a single enriched player by ID
 */
export async function getEnrichedPlayer(playerId: number): Promise<EnrichedPlayer | null> {
  const bootstrap = await fetchBootstrap()
  const player = bootstrap.elements.find(p => p.id === playerId)

  if (!player) return null

  return enrichPlayer(player, bootstrap)
}

/**
 * Calculate selling price based on FPL's half-profit rule
 */
export function calculateSellingPrice(purchasePrice: number, currentPrice: number): number {
  if (currentPrice <= purchasePrice) {
    return currentPrice
  }

  // Half-profit rule: only half of profit is realized, rounded down to 0.1
  const profit = currentPrice - purchasePrice
  const realizedProfit = Math.floor(profit / 0.2) * 0.1  // Round down to nearest 0.1

  return purchasePrice + realizedProfit
}

/**
 * Build purchase price map from transfer history
 * This reconstructs what each player was bought for
 */
export async function getPurchasePrices(teamId: string): Promise<Map<number, number>> {
  const transfers = await fetchTransferHistory(teamId)
  const purchasePrices = new Map<number, number>()

  // Process transfers chronologically
  for (const transfer of transfers) {
    // Add new player with their purchase price
    if (transfer.element_in) {
      purchasePrices.set(transfer.element_in, transfer.element_in_cost / 10)
    }
    // Remove sold player
    if (transfer.element_out) {
      purchasePrices.delete(transfer.element_out)
    }
  }

  return purchasePrices
}

/**
 * Get player's selling price
 * Returns current price if never transferred, otherwise calculates based on purchase price
 */
export async function getPlayerSellingPrice(
  playerId: number,
  teamId: string
): Promise<number> {
  const bootstrap = await fetchBootstrap()
  const player = bootstrap.elements.find(p => p.id === playerId)

  if (!player) {
    throw new Error(`Player ${playerId} not found`)
  }

  const currentPrice = player.now_cost / 10

  try {
    const purchasePrices = await getPurchasePrices(teamId)
    const purchasePrice = purchasePrices.get(playerId)

    // If no purchase price found, assume player was in team from start
    // so use current price as both purchase and selling price
    if (!purchasePrice) {
      return currentPrice
    }

    return calculateSellingPrice(purchasePrice, currentPrice)
  } catch (error) {
    console.error('Error calculating selling price:', error)
    // Fallback to current price
    return currentPrice
  }
}

/**
 * Calculate total available budget (bank + selling value of squad)
 */
export async function calculateAvailableBudget(
  teamId: string,
  playersToSell: number[] = []
): Promise<number> {
  const currentGW = await getCurrentGameweek()
  const picks = await fetchManagerPicks(teamId, currentGW)
  const bank = picks.entry_history.bank / 10  // Convert to £m

  if (playersToSell.length === 0) {
    return bank
  }

  // Calculate selling value of specified players
  let sellingValue = 0
  for (const playerId of playersToSell) {
    const sellingPrice = await getPlayerSellingPrice(playerId, teamId)
    sellingValue += sellingPrice
  }

  return bank + sellingValue
}

/**
 * Count fixtures for a team in a specific gameweek
 * Returns 0 for blank GW, 1 for normal GW, 2 for double GW
 */
export async function getFixtureCount(teamId: number, gameweek: number): Promise<number> {
  const fixtures = await fetchGameweekFixtures(gameweek)
  const teamFixtures = fixtures.filter(
    fixture => fixture.team_h === teamId || fixture.team_a === teamId
  )
  return teamFixtures.length
}

/**
 * Check if gameweek is a blank or double for a specific team
 */
export async function getGameweekType(
  teamId: number,
  gameweek: number
): Promise<'blank' | 'normal' | 'double'> {
  const count = await getFixtureCount(teamId, gameweek)

  if (count === 0) return 'blank'
  if (count === 2) return 'double'
  return 'normal'
}
