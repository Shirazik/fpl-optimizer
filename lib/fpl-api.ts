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
  'Referer': 'https://fantasy.premierleague.com/',
  'Origin': 'https://fantasy.premierleague.com',
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
const STALE_CACHE_MAX = 7 * 24 * 60 * 60 * 1000  // cap stale-on-error at 7 days

/**
 * Fetch bootstrap-static data (all players, teams, gameweeks)
 * Cached for 24 hours as it only updates once per gameweek.
 */
export async function fetchBootstrap(forceRefresh = false): Promise<FPLBootstrapStatic> {
  const now = Date.now()

  if (!forceRefresh && bootstrapCache.data && (now - bootstrapCache.timestamp) < CACHE_DURATION) {
    return bootstrapCache.data
  }

  const url = `${FPL_API_BASE}/bootstrap-static/`
  try {
    const response = await fetch(url, {
      headers: FPL_API_HEADERS,
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
    }

    const data: FPLBootstrapStatic = await response.json()
    bootstrapCache = { data, timestamp: now }
    return data
  } catch (error) {
    console.error('Error fetching bootstrap data:', error)
    if (bootstrapCache.data && (now - bootstrapCache.timestamp) < STALE_CACHE_MAX) {
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
  const url = `${FPL_API_BASE}/fixtures/`
  const response = await fetch(url, {
    headers: FPL_API_HEADERS,
    next: { revalidate: 3600 },
  })
  if (!response.ok) {
    throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
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
  const url = `${FPL_API_BASE}/entry/${teamId}/`
  const response = await fetch(url, {
    cache: 'default',
    headers: FPL_API_HEADERS,
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Team not found. Please check the team ID.')
    }
    if (response.status === 403) {
      throw new Error('This team is private.')
    }
    throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch manager's picks for a specific gameweek
 */
export async function fetchManagerPicks(teamId: string, gameweek: number): Promise<ManagerPicks> {
  const url = `${FPL_API_BASE}/entry/${teamId}/event/${gameweek}/picks/`
  const response = await fetch(url, {
    cache: 'default',
    headers: FPL_API_HEADERS,
  })
  if (!response.ok) {
    throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * Fetch manager's transfer history
 */
export async function fetchTransferHistory(teamId: string): Promise<Transfer[]> {
  const url = `${FPL_API_BASE}/entry/${teamId}/transfers/`
  const response = await fetch(url, {
    cache: 'default',
    headers: FPL_API_HEADERS,
  })
  if (!response.ok) {
    throw new Error(`FPL API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
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
 * Selling price using FPL's half-profit rule.
 * Works in integer tenths to avoid float drift.
 */
export function calculateSellingPrice(purchasePrice: number, currentPrice: number): number {
  const purchaseTenths = Math.round(purchasePrice * 10)
  const currentTenths = Math.round(currentPrice * 10)
  if (currentTenths <= purchaseTenths) {
    return currentTenths / 10
  }
  const profitTenths = currentTenths - purchaseTenths
  // Half-profit, rounded down to whole tenths of £m (i.e., every 2 tenths of profit = 1 tenth realized)
  const realizedTenths = Math.floor(profitTenths / 2)
  return (purchaseTenths + realizedTenths) / 10
}

/**
 * Build purchase-price map by replaying the manager's transfer history.
 */
export async function getPurchasePrices(teamId: string): Promise<Map<number, number>> {
  const transfers = await fetchTransferHistory(teamId)
  const purchasePrices = new Map<number, number>()

  for (const transfer of transfers) {
    if (transfer.element_in) {
      purchasePrices.set(transfer.element_in, transfer.element_in_cost / 10)
    }
    if (transfer.element_out) {
      purchasePrices.delete(transfer.element_out)
    }
  }

  return purchasePrices
}

/**
 * Get a player's selling price. Falls back to current price when purchase price
 * is unknown (player was in the squad from the start).
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
    if (!purchasePrice) {
      return currentPrice
    }
    return calculateSellingPrice(purchasePrice, currentPrice)
  } catch (error) {
    console.error('Error calculating selling price:', error)
    return currentPrice
  }
}

/**
 * Total available budget (bank + selling value of listed players).
 */
export async function calculateAvailableBudget(
  teamId: string,
  playersToSell: number[] = []
): Promise<number> {
  const currentGW = await getCurrentGameweek()
  const picks = await fetchManagerPicks(teamId, currentGW)
  const bank = picks.entry_history.bank / 10

  if (playersToSell.length === 0) {
    return bank
  }

  let sellingValue = 0
  for (const playerId of playersToSell) {
    const sellingPrice = await getPlayerSellingPrice(playerId, teamId)
    sellingValue += sellingPrice
  }

  return bank + sellingValue
}

/**
 * Count fixtures for a team in a specific gameweek.
 * Returns 0 for a blank GW, 1 for normal, 2 for a double.
 */
export async function getFixtureCount(teamId: number, gameweek: number): Promise<number> {
  const fixtures = await fetchGameweekFixtures(gameweek)
  return fixtures.filter(f => f.team_h === teamId || f.team_a === teamId).length
}

/**
 * Classify a gameweek for a team.
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
