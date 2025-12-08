// Form-Based Prediction Provider
// Simple fallback predictions based on recent form and points per game

import { BasePredictionProvider } from './base'
import { fetchBootstrap, getFixtureCount } from '@/lib/fpl-api'
import type { PlayerPrediction } from '@/types/predictions'

export class FormBasedProvider extends BasePredictionProvider {
  name = 'form_based'

  async fetchPredictions(
    gameweek: number,
    horizon: number = 3
  ): Promise<PlayerPrediction[]> {
    const bootstrap = await fetchBootstrap()
    const predictions: PlayerPrediction[] = []

    for (let gw = gameweek; gw < gameweek + horizon; gw++) {
      for (const player of bootstrap.elements) {
        // Calculate base expected points using form and points per game
        const form = parseFloat(player.form) || 0
        const ppg = parseFloat(player.points_per_game) || 0

        // Simple average of form and PPG as base prediction
        let baseEP = (form + ppg) / 2

        // Adjust for availability (injured, suspended, etc.)
        if (player.status !== 'a') {  // 'a' = available
          baseEP *= 0.3  // Reduce EP for unavailable players
        }

        // Adjust for fixture count (blank/double gameweeks)
        try {
          const fixtureCount = await getFixtureCount(player.team, gw)
          baseEP *= fixtureCount  // 0 for blank, 1 for normal, 2 for double
        } catch (error) {
          // If fixture data unavailable, assume normal gameweek
          console.warn(`Could not get fixture count for team ${player.team}, GW ${gw}`)
        }

        predictions.push({
          player_id: player.id,
          gameweek: gw,
          expected_points: Math.round(baseEP * 10) / 10,  // Round to 1 decimal
          confidence: 0.5,  // Low confidence for form-based predictions
          expected_minutes: player.minutes > 0 ? 90 : 60,  // Rough estimate
          source: this.name,
        })
      }
    }

    return this.filterValidPredictions(predictions)
  }

  /**
   * Get prediction for a single player
   */
  async getPlayerPrediction(
    playerId: number,
    gameweek: number
  ): Promise<PlayerPrediction | null> {
    const predictions = await this.fetchPredictions(gameweek, 1)
    return predictions.find(p => p.player_id === playerId) || null
  }

  /**
   * Get predictions for multiple players
   */
  async getPlayersPredictions(
    playerIds: number[],
    gameweek: number,
    horizon: number = 3
  ): Promise<PlayerPrediction[]> {
    const allPredictions = await this.fetchPredictions(gameweek, horizon)
    return allPredictions.filter(p => playerIds.includes(p.player_id))
  }
}

// Singleton instance
export const formBasedProvider = new FormBasedProvider()
