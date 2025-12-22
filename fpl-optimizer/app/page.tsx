'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Zap } from 'lucide-react'

export default function Home() {
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate team ID
    if (!teamId.trim()) {
      setError('Please enter a team ID')
      return
    }

    if (!/^\d+$/.test(teamId.trim())) {
      setError('Team ID must be a number')
      return
    }

    setIsLoading(true)
    // Navigate to optimization page
    router.push(`/optimize/${teamId.trim()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-accent-primary" />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            FPL Transfer Optimizer
          </h1>
          <p className="text-text-secondary">
            Get mathematically optimal transfer suggestions for your Fantasy Premier League team.
          </p>
        </div>

        {/* Team ID Input Card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Enter Your Team ID
          </h2>
          <p className="text-sm text-text-tertiary mb-6">
            Find it in your FPL URL:{' '}
            <span className="text-text-secondary">
              fantasy.premierleague.com/entry/<strong className="text-accent-primary">YOUR-ID</strong>/event/XX
            </span>
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-status-red/10 border border-status-red/20">
              <p className="text-sm text-status-red font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="teamId" className="text-sm font-medium block mb-2 text-text-primary">
                Team ID
              </label>
              <input
                type="text"
                id="teamId"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="e.g., 123456"
                className="input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 font-semibold group"
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Loading...
                </>
              ) : (
                <>
                  Get Transfer Suggestions
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-tertiary mt-8">
          Powered by MILP optimization
        </p>
      </div>
    </div>
  )
}
