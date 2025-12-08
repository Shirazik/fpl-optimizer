'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Trophy,
  RefreshCw,
  Zap,
  Calendar,
  Sparkles,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { TeamAnalysis } from '@/types/fpl'
import type { PlayerPrediction } from '@/types/predictions'
import { SquadDisplay } from '@/components/team/squad-display'
import { TeamStats } from '@/components/team/team-stats'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string

  const [teamData, setTeamData] = useState<TeamAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingPredictions, setLoadingPredictions] = useState(false)

  useEffect(() => {
    async function fetchTeamData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch team data
        const response = await fetch(`/api/fpl/team/${teamId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch team data')
        }

        const data: TeamAnalysis = await response.json()
        setTeamData(data)

        // Fetch predictions for the squad
        fetchPredictions(data)
      } catch (err) {
        console.error('Error fetching team:', err)
        setError(err instanceof Error ? err.message : 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    if (teamId) {
      fetchTeamData()
    }
  }, [teamId])

  async function fetchPredictions(data: TeamAnalysis) {
    try {
      setLoadingPredictions(true)

      const playerIds = data.squad.map(sp => sp.player.id).join(',')
      const response = await fetch(
        `/api/predictions?gameweek=${data.current_gameweek}&horizon=1&playerIds=${playerIds}`
      )

      if (!response.ok) {
        console.warn('Failed to fetch predictions')
        return
      }

      const predictionsData = await response.json()
      const predictions: PlayerPrediction[] = predictionsData.predictions

      // Add expected points to squad players
      const updatedSquad = data.squad.map(sp => {
        const prediction = predictions.find(
          p => p.player_id === sp.player.id && p.gameweek === data.current_gameweek
        )

        return {
          ...sp,
          player: {
            ...sp.player,
            expected_points: prediction?.expected_points || 0,
          },
        }
      })

      // Calculate total expected points
      const totalEP = updatedSquad
        .filter(sp => sp.pick_position <= 11) // Only starting XI
        .reduce((sum, sp) => {
          const ep = sp.player.expected_points || 0
          return sum + ep * sp.multiplier // Multiply by captain multiplier
        }, 0)

      setTeamData({
        ...data,
        squad: updatedSquad,
        total_expected_points: totalEP,
      })
    } catch (err) {
      console.error('Error fetching predictions:', err)
    } finally {
      setLoadingPredictions(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-10 h-10 text-accent-primary mx-auto mb-4 animate-spin" />
          <p className="text-body text-text-secondary">Loading team data...</p>
        </div>
      </div>
    )
  }

  if (error || !teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-fade-in">
          <div className="card p-6 border-status-red/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-status-red/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-red" />
              </div>
              <h2 className="text-heading text-text-primary">Error</h2>
            </div>
            <p className="text-body text-text-secondary mb-6">
              {error || 'Failed to load team data'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-body-sm">Back to Home</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-display text-text-primary mb-1">
                {teamData.manager.name}
              </h1>
              <div className="flex items-center gap-3 text-text-secondary">
                <span className="text-body">
                  {teamData.manager.player_first_name} {teamData.manager.player_last_name}
                </span>
                <span className="text-text-tertiary">•</span>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-status-yellow" />
                  <span className="stat text-text-secondary">
                    #{teamData.manager.summary_overall_rank?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {loadingPredictions && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-primary/10 border border-accent-primary/20">
                <RefreshCw className="w-4 h-4 text-accent-primary animate-spin" />
                <span className="text-caption text-accent-primary">
                  Loading predictions...
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Team Stats */}
        <section className="mb-8 animate-slide-in-up animation-fill-both animation-delay-100">
          <TeamStats
            teamValue={teamData.team_value}
            bank={teamData.bank}
            freeTransfers={teamData.free_transfers}
            currentGameweek={teamData.current_gameweek}
            totalExpectedPoints={teamData.total_expected_points}
          />
        </section>

        {/* Squad Display */}
        <section className="mb-10">
          <SquadDisplay
            squad={teamData.squad}
            showExpectedPoints={teamData.total_expected_points > 0}
          />
        </section>

        {/* Action Buttons */}
        <section className="animate-slide-in-up animation-fill-both animation-delay-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="btn btn-primary py-4 text-body font-semibold group">
              <Zap className="w-5 h-5" />
              Optimize Transfers
            </button>
            <button
              className="btn btn-secondary py-4 text-body font-semibold opacity-50 cursor-not-allowed"
              disabled
            >
              <Calendar className="w-5 h-5" />
              Multi-GW Planning
              <span className="pill text-overline ml-2">Soon</span>
            </button>
            <button
              className="btn btn-secondary py-4 text-body font-semibold opacity-50 cursor-not-allowed"
              disabled
            >
              <Sparkles className="w-5 h-5" />
              Wildcard Optimizer
              <span className="pill text-overline ml-2">Soon</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
