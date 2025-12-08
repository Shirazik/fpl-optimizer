'use client'

import { useState, useEffect } from 'react'
import type { SquadPlayer } from '@/types/fpl'
import { PlayerCard } from './player-card'
import { PitchLayout } from './pitch/pitch-layout'
import { LayoutGrid, LayoutList } from 'lucide-react'

interface SquadDisplayProps {
  squad: SquadPlayer[]
  showExpectedPoints?: boolean
}

type ViewMode = 'pitch' | 'list'

interface PositionGroupProps {
  title: string
  players: SquadPlayer[]
  showExpectedPoints: boolean
  gridCols?: string
}

function PositionGroup({ title, players, showExpectedPoints, gridCols = 'md:grid-cols-3' }: PositionGroupProps) {
  if (players.length === 0) return null

  return (
    <div className="animate-fade-in animation-fill-both">
      <h4 className="text-subheading text-text-tertiary uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
        {players.map((sp, index) => (
          <div
            key={sp.player.id}
            className="animate-slide-in-up animation-fill-both"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <PlayerCard
              squadPlayer={sp}
              showExpectedPoints={showExpectedPoints}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SquadDisplay({ squad, showExpectedPoints = false }: SquadDisplayProps) {
  const [view, setView] = useState<ViewMode>('pitch')

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('fpl-squad-view')
    if (savedView === 'list' || savedView === 'pitch') {
      setView(savedView)
    }
  }, [])

  // Toggle view and persist to localStorage
  const toggleView = () => {
    const newView: ViewMode = view === 'pitch' ? 'list' : 'pitch'
    setView(newView)
    localStorage.setItem('fpl-squad-view', newView)
  }

  // Split squad into starting XI and bench
  const startingXI = squad.filter(sp => sp.pick_position <= 11)
  const bench = squad.filter(sp => sp.pick_position > 11)

  // Group starting XI by position for list view
  const groupedSquad = {
    GK: startingXI.filter(sp => sp.player.element_type === 1),
    DEF: startingXI.filter(sp => sp.player.element_type === 2),
    MID: startingXI.filter(sp => sp.player.element_type === 3),
    FWD: startingXI.filter(sp => sp.player.element_type === 4),
  }

  return (
    <div className="space-y-6">
      {/* View Toggle - Segmented Control */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-md border border-[var(--border-default)] p-0.5">
          <button
            onClick={() => view === 'list' && toggleView()}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-caption font-medium
              transition-all duration-200
              ${view === 'pitch'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }
            `}
            aria-pressed={view === 'pitch'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Pitch</span>
          </button>

          <button
            onClick={() => view === 'pitch' && toggleView()}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-caption font-medium
              transition-all duration-200
              ${view === 'list'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }
            `}
            aria-pressed={view === 'list'}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Conditional Rendering: Pitch vs List */}
      {view === 'pitch' ? (
        <PitchLayout squad={squad} showExpectedPoints={showExpectedPoints} />
      ) : (
        <div className="space-y-8">
          {/* Starting XI - List View */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-title text-text-primary">Starting XI</h3>
              <span className="pill">11 players</span>
            </div>

            <div className="space-y-6">
              <PositionGroup
                title="Forwards"
                players={groupedSquad.FWD}
                showExpectedPoints={showExpectedPoints}
                gridCols="md:grid-cols-3"
              />
              <PositionGroup
                title="Midfielders"
                players={groupedSquad.MID}
                showExpectedPoints={showExpectedPoints}
                gridCols="md:grid-cols-5"
              />
              <PositionGroup
                title="Defenders"
                players={groupedSquad.DEF}
                showExpectedPoints={showExpectedPoints}
                gridCols="md:grid-cols-5"
              />
              <PositionGroup
                title="Goalkeeper"
                players={groupedSquad.GK}
                showExpectedPoints={showExpectedPoints}
                gridCols="md:grid-cols-1 max-w-xs"
              />
            </div>
          </section>

          {/* Bench - List View */}
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
      )}
    </div>
  )
}
