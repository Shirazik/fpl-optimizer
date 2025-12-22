'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import type { TransferRecommendationResponse } from '@/types/optimization'
import { TransferSuggestionsList, DualRecommendationDisplay } from '@/components/transfers'

export default function OptimizePage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string

  const [optimizing, setOptimizing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recommendationData, setRecommendationData] = useState<TransferRecommendationResponse | null>(null)

  useEffect(() => {
    async function optimizeTransfers() {
      if (!teamId) return

      try {
        setOptimizing(true)
        setError(null)

        const response = await fetch('/api/optimize/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            maxTransfers: 2,
            horizon: 3,
            dualMode: true,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Optimization failed')
        }

        const data = await response.json() as TransferRecommendationResponse
        setRecommendationData(data)
      } catch (err) {
        console.error('Optimization error:', err)
        setError(err instanceof Error ? err.message : 'Optimization failed')
      } finally {
        setOptimizing(false)
      }
    }

    optimizeTransfers()
  }, [teamId])

  if (optimizing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent-primary mx-auto mb-4 animate-spin" />
          <p className="text-text-secondary">Optimizing your transfers...</p>
          <p className="text-sm text-text-tertiary mt-2">
            Running MILP solver to find optimal transfers
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-6 border-status-red/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-status-red/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-red" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Error</h2>
            </div>
            <p className="text-text-secondary mb-6">{error}</p>
            <Link href="/" className="btn btn-secondary w-full inline-flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Transfer Suggestions
          </h1>
          <p className="text-text-secondary">
            Mathematically optimal transfers for your FPL team
          </p>
        </header>

        {/* Transfer Optimization Results */}
        <section>
          {recommendationData?.mode === 'dual' ? (
            <DualRecommendationDisplay
              conservative={recommendationData.conservative}
              optimal={recommendationData.optimal}
              comparison={recommendationData.comparison}
              isLoading={false}
              error={null}
            />
          ) : recommendationData?.mode === 'single' ? (
            <TransferSuggestionsList
              transfers={recommendationData.transfers}
              totalTransfers={recommendationData.total_transfers}
              pointHit={recommendationData.point_hit}
              expectedPoints={recommendationData.expected_points}
              freeTransfers={recommendationData.free_transfers}
              horizon={recommendationData.horizon}
              isLoading={false}
              error={null}
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}
