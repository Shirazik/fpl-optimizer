// Optimization Request and Response Types

export interface OptimizationParams {
  current_squad: number[]  // Array of player IDs
  all_players: OptimizationPlayer[]
  budget: number  // Available budget
  free_transfers: number
  horizon?: number  // Planning horizon (gameweeks)
}

export interface OptimizationPlayer {
  id: number
  position: number  // 1=GK, 2=DEF, 3=MID, 4=FWD
  team: number  // Team ID
  price: number
  ep_gw1?: number
  ep_gw2?: number
  ep_gw3?: number
  ep_gw4?: number
  ep_gw5?: number
  ep_gw6?: number
  ep_gw7?: number
  ep_gw8?: number
  [key: string]: any  // Allow dynamic ep_gwX properties
}

export interface OptimizationResult {
  squad: number[]  // Optimal squad player IDs
  transfers_in: OptimizationPlayer[]
  transfers_out: OptimizationPlayer[]
  total_transfers: number
  point_hit: number  // Negative points from extra transfers
  expected_points: number  // Total expected points (including penalty)
}

export interface TransferSuggestion {
  player_out: {
    id: number
    name: string
    position: string
    team: string
    price: number
    expected_points: number
  }
  player_in: {
    id: number
    name: string
    position: string
    team: string
    price: number
    expected_points: number
  }
  expected_gain: number
  cost: number  // -4 if taking a hit, 0 if free transfer
}

export interface PointHitAnalysis {
  scenarios: {
    no_hit: TransferScenario
    one_hit: TransferScenario
    two_hits: TransferScenario
  }
  recommendation: string
}

export interface TransferScenario {
  transfers: TransferSuggestion[]
  expected_points: number
  cost: number
  gain_vs_no_hit: number
}

export interface MultiGWPlan {
  gameweeks: GameweekPlan[]
  total_expected_points: number
  total_transfers: number
  total_hits: number
}

export interface GameweekPlan {
  gameweek: number
  transfers: TransferSuggestion[]
  expected_points: number
  point_hit: number
  free_transfers_available: number
}

export interface WildcardResult {
  optimal_squad: OptimizationPlayer[]
  current_squad: OptimizationPlayer[]
  changes: {
    out: OptimizationPlayer[]
    in: OptimizationPlayer[]
  }
  expected_points: number
  total_cost: number
  recommendation: {
    should_wildcard: boolean
    expected_gain: number
    reasoning: string
  }
}
