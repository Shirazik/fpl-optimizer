import type { SquadPlayer } from '@/types/fpl'
import { Shield, AlertCircle } from 'lucide-react'

interface PlayerCardProps {
  squadPlayer: SquadPlayer
  showExpectedPoints?: boolean
}

const positionBadgeClasses: Record<number, string> = {
  1: 'badge-gk',   // GK
  2: 'badge-def',  // DEF
  3: 'badge-mid',  // MID
  4: 'badge-fwd',  // FWD
}

const positionNames: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
}

export function PlayerCard({ squadPlayer, showExpectedPoints = false }: PlayerCardProps) {
  const { player, is_captain, is_vice_captain } = squadPlayer

  const badgeClass = positionBadgeClasses[player.element_type] || 'badge'
  const positionName = positionNames[player.element_type] || player.position_name

  return (
    <div className="card p-4 hover-lift group relative">
      {/* Captain/Vice-Captain Badge */}
      {(is_captain || is_vice_captain) && (
        <div
          className={`
            absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
            ${is_captain ? 'bg-accent-primary' : 'bg-accent-purple'}
            shadow-elevated
          `}
        >
          <Shield className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Player Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text-primary truncate text-heading leading-tight">
            {player.web_name}
          </h3>
          <p className="text-caption text-text-tertiary mt-0.5">
            {player.team_short_name}
          </p>
        </div>
        <span className={`badge ${badgeClass} ml-2 flex-shrink-0`}>
          {positionName}
        </span>
      </div>

      {/* Price */}
      <div className="mb-3">
        <span className="stat text-text-secondary">
          £{player.price.toFixed(1)}m
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-overline text-text-tertiary mb-1">FORM</p>
          <p className="stat text-text-primary">
            {parseFloat(player.form).toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-overline text-text-tertiary mb-1">PTS</p>
          <p className="stat text-text-primary">
            {player.total_points}
          </p>
        </div>
        {showExpectedPoints && player.expected_points !== undefined ? (
          <div>
            <p className="text-overline text-accent-purple mb-1">xPTS</p>
            <p className="stat text-accent-purple">
              {player.expected_points.toFixed(1)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-overline text-text-tertiary mb-1">PPG</p>
            <p className="stat text-text-primary">
              {parseFloat(player.points_per_game).toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Availability Status */}
      {player.status !== 'a' && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-status-red" />
            <span className="text-caption text-status-red font-medium">
              {player.status === 'i' && 'Injured'}
              {player.status === 'd' && 'Doubtful'}
              {player.status === 's' && 'Suspended'}
              {player.status === 'u' && 'Unavailable'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
