// Prediction Provider Types

export interface PredictionProvider {
  name: string
  fetchPredictions(gameweek: number, horizon?: number): Promise<PlayerPrediction[]>
}

export interface PlayerPrediction {
  player_id: number
  gameweek: number
  expected_points: number
  confidence?: number  // 0-1 scale
  expected_minutes?: number
  source?: string
}

export interface MultiGWPrediction {
  player_id: number
  predictions: {
    [gameweek: number]: {
      expected_points: number
      expected_minutes?: number
      fixture_count: number  // 0 for blank, 1 for normal, 2 for double
      is_blank: boolean
      is_double: boolean
    }
  }
}

export interface PredictionSource {
  name: string
  type: 'free' | 'paid'
  accuracy_score?: number  // Historical accuracy (RMSE or similar)
  last_updated?: Date
}

// Database schema for predictions
export interface DBPlayerPrediction {
  player_id: number
  gameweek: number
  expected_points: number
  source: string
  confidence?: number
  created_at: Date
}
