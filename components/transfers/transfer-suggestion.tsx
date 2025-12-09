'use client'

import { ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import type { TransferSuggestion } from '@/types/optimization'

interface TransferSuggestionCardProps {
  transfer: TransferSuggestion
  index: number
}

const positionBadgeClasses: Record<string, string> = {
  GKP: 'badge-gk',
  DEF: 'badge-def',
  MID: 'badge-mid',
  FWD: 'badge-fwd',
}

export function TransferSuggestionCard({ transfer, index }: TransferSuggestionCardProps) {
  const { player_out, player_in, expected_gain, cost } = transfer

  const priceChange = player_in.price - player_out.price
  const isHit = cost < 0

  return (
    <div
      className="card p-4 hover-lift"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Player Out */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${positionBadgeClasses[player_out.position] || 'badge'} text-xs`}>
              {player_out.position}
            </span>
            <span className="text-caption text-text-tertiary">{player_out.team}</span>
          </div>
          <h4 className="font-semibold text-text-primary truncate">
            {player_out.name}
          </h4>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="stat text-text-secondary text-sm">
              £{player_out.price.toFixed(1)}m
            </span>
            <span className="stat text-text-tertiary text-sm">
              {player_out.expected_points.toFixed(1)} xP
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <ArrowRight className="w-5 h-5 text-text-tertiary" />
          {isHit && (
            <span className="text-xs font-medium text-status-red">-4</span>
          )}
        </div>

        {/* Player In */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${positionBadgeClasses[player_in.position] || 'badge'} text-xs`}>
              {player_in.position}
            </span>
            <span className="text-caption text-text-tertiary">{player_in.team}</span>
          </div>
          <h4 className="font-semibold text-text-primary truncate">
            {player_in.name}
          </h4>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="stat text-text-secondary text-sm">
              £{player_in.price.toFixed(1)}m
            </span>
            <span className="stat text-accent-purple text-sm">
              {player_in.expected_points.toFixed(1)} xP
            </span>
          </div>
        </div>

        {/* Expected Gain */}
        <div className="flex-shrink-0 text-right pl-4 border-l border-border-subtle">
          <p className="text-overline text-text-tertiary mb-1">GAIN</p>
          <div className="flex items-center justify-end gap-1">
            {expected_gain > 0 ? (
              <TrendingUp className="w-4 h-4 text-status-green" />
            ) : expected_gain < 0 ? (
              <TrendingDown className="w-4 h-4 text-status-red" />
            ) : (
              <Minus className="w-4 h-4 text-text-tertiary" />
            )}
            <span
              className={`stat ${
                expected_gain > 0
                  ? 'text-status-green'
                  : expected_gain < 0
                    ? 'text-status-red'
                    : 'text-text-secondary'
              }`}
            >
              {expected_gain > 0 && '+'}
              {expected_gain.toFixed(1)}
            </span>
          </div>
          {priceChange !== 0 && (
            <p className="text-xs text-text-tertiary mt-1">
              {priceChange > 0 ? '+' : ''}£{priceChange.toFixed(1)}m
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface TransferSuggestionsListProps {
  transfers: TransferSuggestion[]
  totalTransfers: number
  pointHit: number
  expectedPoints: number
  freeTransfers: number
  horizon: number
  isLoading?: boolean
  error?: string | null
}

export function TransferSuggestionsList({
  transfers,
  totalTransfers,
  pointHit,
  expectedPoints,
  freeTransfers,
  horizon,
  isLoading,
  error,
}: TransferSuggestionsListProps) {
  if (isLoading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-bg-elevated rounded w-48 mx-auto mb-4" />
          <div className="h-3 bg-bg-elevated rounded w-64 mx-auto" />
        </div>
        <p className="text-text-secondary mt-4">Optimizing transfers...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 border-status-red/30 bg-status-red/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-red flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Optimization Error</h3>
            <p className="text-text-secondary text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-secondary">
          No transfers suggested. Your current squad is already optimal!
        </p>
      </div>
    )
  }

  const hitTransfers = transfers.filter(t => t.cost < 0).length
  const netGain = transfers.reduce((sum, t) => sum + t.expected_gain, 0) + pointHit

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-heading font-semibold text-text-primary mb-1">
              Transfer Suggestions
            </h3>
            <p className="text-caption text-text-tertiary">
              Based on {horizon}-gameweek horizon • {freeTransfers} free transfer{freeTransfers !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-overline text-text-tertiary">TRANSFERS</p>
              <p className="stat text-text-primary text-xl">{totalTransfers}</p>
            </div>
            {pointHit !== 0 && (
              <div className="text-center">
                <p className="text-overline text-status-red">HIT</p>
                <p className="stat text-status-red text-xl">{pointHit}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-overline text-accent-purple">NET xP</p>
              <p
                className={`stat text-xl ${
                  netGain > 0 ? 'text-status-green' : netGain < 0 ? 'text-status-red' : 'text-text-secondary'
                }`}
              >
                {netGain > 0 && '+'}
                {netGain.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Point Hit Warning */}
      {hitTransfers > 0 && (
        <div className="card p-4 border-status-yellow/30 bg-status-yellow/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-yellow" />
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {hitTransfers} transfer{hitTransfers > 1 ? 's' : ''} will cost {Math.abs(pointHit)} points.
              </span>
              {' '}The expected gain ({netGain.toFixed(1)} xP net) suggests this is{' '}
              {netGain > 0 ? 'worthwhile' : 'not recommended'}.
            </p>
          </div>
        </div>
      )}

      {/* Transfer Cards */}
      <div className="space-y-3">
        {transfers.map((transfer, index) => (
          <TransferSuggestionCard
            key={`${transfer.player_out.id}-${transfer.player_in.id}`}
            transfer={transfer}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
