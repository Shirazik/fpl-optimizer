import type { SquadPlayer } from '@/types/fpl'
import { detectFormation, calculatePositions } from '@/lib/formation-detector'
import { PitchBackground } from './pitch-background'
import { PitchPlayer } from './pitch-player'
import { PlayerCard } from '../player-card'

interface PitchLayoutProps {
  squad: SquadPlayer[]
  showExpectedPoints?: boolean
}

export function PitchLayout({ squad, showExpectedPoints = false }: PitchLayoutProps) {
  // Split squad into starting XI and bench
  const startingXI = squad.filter(sp => sp.pick_position <= 11)
  const bench = squad.filter(sp => sp.pick_position > 11)

  // Detect formation and calculate player positions
  const formation = detectFormation(startingXI)
  const playerPositions = calculatePositions(startingXI, formation)

  return (
    <div className="space-y-8">
      {/* Formation Display */}
      <div className="flex items-center justify-center gap-3">
        <div className="pill">
          Formation: {formation.displayName}
        </div>
      </div>

      {/* Pitch Container */}
      <div className="relative w-full max-w-2xl mx-auto aspect-[2/3]">
        {/* SVG Pitch Background */}
        <PitchBackground />

        {/* Positioned Players (Absolute Positioning) */}
        <div className="absolute inset-0">
          {playerPositions.map((pos, idx) => (
            <PitchPlayer
              key={pos.player.player.id}
              squadPlayer={pos.player}
              x={pos.x}
              y={pos.y}
              style={{
                animationDelay: `${idx * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bench Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-title text-text-primary">Bench</h3>
          <span className="pill">4 players</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {bench.map((sp, index) => (
            <div
              key={sp.player.id}
              className="animate-slide-in-up animation-fill-both"
              style={{ animationDelay: `${(index + 11) * 50}ms` }}
            >
              <PlayerCard
                squadPlayer={sp}
                showExpectedPoints={showExpectedPoints}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
