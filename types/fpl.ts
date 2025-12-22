// FPL API Response Types

export interface FPLBootstrapStatic {
  events: Gameweek[]
  teams: Team[]
  elements: Player[]
  element_types: Position[]
  element_stats: ElementStat[]
  total_players: number
}

export interface Gameweek {
  id: number
  name: string
  deadline_time: string
  release_time: string | null
  average_entry_score: number
  finished: boolean
  data_checked: boolean
  highest_scoring_entry: number | null
  deadline_time_epoch: number
  deadline_time_game_offset: number
  highest_score: number | null
  is_previous: boolean
  is_current: boolean
  is_next: boolean
  cup_leagues_created: boolean
  h2h_ko_matches_created: boolean
  ranked_count: number
  chip_plays: ChipPlay[]
  most_selected: number | null
  most_transferred_in: number | null
  top_element: number | null
  top_element_info: TopElementInfo | null
  transfers_made: number
  most_captained: number | null
  most_vice_captained: number | null
}

export interface ChipPlay {
  chip_name: string
  num_played: number
}

export interface TopElementInfo {
  id: number
  points: number
}

export interface Team {
  code: number
  id: number
  name: string
  short_name: string
  strength: number
  strength_overall_home: number
  strength_overall_away: number
  strength_attack_home: number
  strength_attack_away: number
  strength_defence_home: number
  strength_defence_away: number
}

export interface Player {
  id: number
  code: number
  element_type: number  // Position ID: 1=GK, 2=DEF, 3=MID, 4=FWD
  first_name: string
  second_name: string
  web_name: string
  team: number  // Team ID
  team_code: number
  status: string  // 'a' = available, 'd' = doubtful, 'i' = injured, etc.
  now_cost: number  // Price in 0.1m units (e.g., 100 = £10.0m)
  cost_change_start: number
  cost_change_event: number
  cost_change_start_fall: number
  cost_change_event_fall: number
  in_dreamteam: boolean
  dreamteam_count: number
  selected_by_percent: string
  form: string
  transfers_out: number
  transfers_in: number
  transfers_out_event: number
  transfers_in_event: number
  loans_in: number
  loans_out: number
  loaned_in: number
  loaned_out: number
  total_points: number
  event_points: number
  points_per_game: string
  ep_this: string | null
  ep_next: string | null
  special: boolean
  minutes: number
  goals_scored: number
  assists: number
  clean_sheets: number
  goals_conceded: number
  own_goals: number
  penalties_saved: number
  penalties_missed: number
  yellow_cards: number
  red_cards: number
  saves: number
  bonus: number
  bps: number
  influence: string
  creativity: string
  threat: string
  ict_index: string
  starts: number
  expected_goals: string
  expected_assists: string
  expected_goal_involvements: string
  expected_goals_conceded: string
  influence_rank: number
  influence_rank_type: number
  creativity_rank: number
  creativity_rank_type: number
  threat_rank: number
  threat_rank_type: number
  ict_index_rank: number
  ict_index_rank_type: number
  corners_and_indirect_freekicks_order: number | null
  corners_and_indirect_freekicks_text: string
  direct_freekicks_order: number | null
  direct_freekicks_text: string
  penalties_order: number | null
  penalties_text: string
  expected_goals_per_90: number
  saves_per_90: number
  expected_assists_per_90: number
  expected_goal_involvements_per_90: number
  expected_goals_conceded_per_90: number
  goals_conceded_per_90: number
  now_cost_rank: number
  now_cost_rank_type: number
  form_rank: number
  form_rank_type: number
  points_per_game_rank: number
  points_per_game_rank_type: number
  selected_rank: number
  selected_rank_type: number
  starts_per_90: number
  clean_sheets_per_90: number
  chance_of_playing_next_round: number | null
  chance_of_playing_this_round: number | null
  news: string
  news_added: string | null
}

export interface Position {
  id: number
  plural_name: string
  plural_name_short: string
  singular_name: string
  singular_name_short: string
  squad_select: number
  squad_min_select: number | null
  squad_max_select: number | null
  squad_min_play: number
  squad_max_play: number
  ui_shirt_specific: boolean
  sub_positions_locked: number[]
  element_count: number
}

export interface ElementStat {
  label: string
  name: string
}

export interface Fixture {
  id: number
  code: number
  event: number | null  // Gameweek number
  finished: boolean
  finished_provisional: boolean
  kickoff_time: string | null
  minutes: number
  provisional_start_time: boolean
  started: boolean | null
  team_a: number
  team_h: number
  stats: FixtureStat[]
  team_h_difficulty: number
  team_a_difficulty: number
  pulse_id: number
}

export interface FixtureStat {
  identifier: string
  a: { value: number; element: number }[]
  h: { value: number; element: number }[]
}

// Manager/Team Entry Types

export interface ManagerEntry {
  id: number
  started_event: number
  player_first_name: string
  player_last_name: string
  player_region_id: number
  player_region_name: string
  player_region_iso_code_short: string
  player_region_iso_code_long: string
  summary_overall_points: number
  summary_overall_rank: number
  summary_event_points: number
  summary_event_rank: number
  current_event: number
  leagues: {
    classic: League[]
    h2h: League[]
  }
  name: string
  name_change_blocked: boolean
  entered_events: number[]
  kit: string | null
  last_deadline_bank: number
  last_deadline_value: number
  last_deadline_total_transfers: number
}

export interface League {
  id: number
  name: string
  short_name: string | null
  created: string
  closed: boolean
  rank: number | null
  max_entries: number | null
  league_type: string
  scoring: string
  admin_entry: number | null
  start_event: number
  entry_can_leave: boolean
  entry_can_admin: boolean
  entry_can_invite: boolean
  has_cup: boolean
  cup_league: number | null
  cup_qualified: boolean | null
  entry_percentile_rank: number
  active_phases: ActivePhase[]
  entry_last_rank: number
}

export interface ActivePhase {
  phase: number
  rank: number
  last_rank: number
  rank_sort: number
  total: number
  league_id: number
  rank_count: number | null
  entry_percentile_rank: number
}

export interface ManagerPicks {
  active_chip: string | null
  automatic_subs: AutomaticSub[]
  entry_history: EntryHistory
  picks: Pick[]
}

export interface Pick {
  element: number  // Player ID
  position: number  // 1-15 (1-11 starting, 12-15 bench)
  multiplier: number  // 2 for captain, 3 for triple captain, 1 for others
  is_captain: boolean
  is_vice_captain: boolean
}

export interface AutomaticSub {
  entry: number
  element_in: number
  element_out: number
  event: number
}

export interface EntryHistory {
  event: number
  points: number
  total_points: number
  rank: number
  rank_sort: number
  overall_rank: number
  percentile_rank: number
  bank: number  // In 0.1m units
  value: number  // In 0.1m units
  event_transfers: number
  event_transfers_cost: number
  points_on_bench: number
}

// Transfer History Types

export interface Transfer {
  element_in: number
  element_in_cost: number
  element_out: number
  element_out_cost: number
  entry: number
  event: number
  time: string
}

// Custom App Types (enriched data)

export interface EnrichedPlayer extends Player {
  team_name: string
  team_short_name: string
  position_name: string
  price: number  // Converted from now_cost
  expected_points?: number
  selling_price?: number
}

export interface SquadPlayer {
  player: EnrichedPlayer
  pick_position: number
  is_captain: boolean
  is_vice_captain: boolean
  multiplier: number
}

export interface TeamAnalysis {
  manager: ManagerEntry
  squad: SquadPlayer[]
  bank: number
  team_value: number
  free_transfers: number
  current_gameweek: number
  total_expected_points: number
}

// Formation and Pitch Layout Types

export interface Formation {
  gk: number
  def: number
  mid: number
  fwd: number
  displayName: string  // e.g., "4-4-2"
}

export interface PlayerPosition {
  player: SquadPlayer
  x: number  // 0-100 percentage (horizontal position on pitch)
  y: number  // 0-100 percentage (vertical position on pitch)
  row: 'gk' | 'def' | 'mid' | 'fwd'
  rowIndex: number  // Position within row (0-based)
}

// Saved Teams (localStorage)

export interface SavedTeam {
  teamId: string          // FPL team ID (numeric string)
  label: string           // Custom label or manager name
  managerName: string     // Original manager name from FPL API
  lastViewed: number      // Unix timestamp (Date.now()) for LRU eviction
  addedAt: number         // Unix timestamp (Date.now())
}

export interface SavedTeamsStorage {
  version: number         // Schema version (start with 1)
  teams: SavedTeam[]      // Array of saved teams (max 10)
}
