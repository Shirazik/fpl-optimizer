// Base Prediction Provider Interface

import type { PlayerPrediction, PredictionProvider } from '@/types/predictions'

/**
 * Abstract base class for prediction providers
 * All prediction sources should implement this interface
 */
export abstract class BasePredictionProvider implements PredictionProvider {
  abstract name: string

  abstract fetchPredictions(
    gameweek: number,
    horizon?: number
  ): Promise<PlayerPrediction[]>

  /**
   * Validate prediction data
   */
  protected validatePrediction(prediction: PlayerPrediction): boolean {
    return (
      typeof prediction.player_id === 'number' &&
      prediction.player_id > 0 &&
      typeof prediction.gameweek === 'number' &&
      prediction.gameweek > 0 &&
      typeof prediction.expected_points === 'number' &&
      prediction.expected_points >= 0
    )
  }

  /**
   * Filter out invalid predictions
   */
  protected filterValidPredictions(
    predictions: PlayerPrediction[]
  ): PlayerPrediction[] {
    return predictions.filter(p => this.validatePrediction(p))
  }
}
