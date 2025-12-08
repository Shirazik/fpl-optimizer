import type { SquadPlayer } from '@/types/fpl'
import { getTeamColors } from '@/lib/team-colors'
import { Shield, ShieldAlert, AlertCircle } from 'lucide-react'

interface PitchPlayerProps {
  squadPlayer: SquadPlayer
  x: number  // Percentage position (0-100)
  y: number  // Percentage position (0-100)
  style?: React.CSSProperties
}

export function PitchPlayer({ squadPlayer, x, y, style }: PitchPlayerProps) {
  const { player, is_captain, is_vice_captain } = squadPlayer
  const teamColors = getTeamColors(player.team)

  // Check player availability status
  const isUnavailable = player.status !== 'a' // Not available (injured/doubtful/suspended)

  return (
    <div
      className="pitch-player animate-fade-in animation-fill-both"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        ...style,
      }}
    >
      {/* Player Circle Badge */}
      <div
        className="pitch-player-circle relative"
        style={{
          backgroundColor: teamColors.primary,
        }}
      >

        {/* Captain Badge */}
        {is_captain && (
          <div className="pitch-badge-captain" title="Captain">
            <Shield className="w-3 h-3 fill-current" />
          </div>
        )}

        {/* Vice Captain Badge */}
        {is_vice_captain && (
          <div
            className="pitch-badge-captain bg-gray-400"
            title="Vice Captain"
            style={{ top: '-0.25rem', right: '1.25rem' }}
          >
            <ShieldAlert className="w-3 h-3 fill-current" />
          </div>
        )}

        {/* Injury/Unavailable Warning */}
        {isUnavailable && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-status-red flex items-center justify-center"
            title={`Status: ${player.status}`}
          >
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Player Name Label */}
      <div className="mt-1 text-center">
        <div className="text-caption text-text-primary font-medium truncate max-w-[80px] md:max-w-[100px] mx-auto">
          {player.web_name}
        </div>
        <div className="text-overline text-text-tertiary">
          {player.team_short_name}
        </div>
      </div>
    </div>
  )
}
