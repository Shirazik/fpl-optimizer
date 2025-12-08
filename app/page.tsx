'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, TrendingUp, Calculator, Calendar, Sparkles } from 'lucide-react'

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
    // Navigate to team analysis page
    router.push(`/team/${teamId.trim()}`)
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Transfer Optimization',
      description: 'Get mathematically optimal transfer suggestions based on expected points',
    },
    {
      icon: Calculator,
      title: 'Point Hit Analysis',
      description: 'Calculate whether taking a -4 or -8 point hit is worth it',
    },
    {
      icon: Calendar,
      title: 'Multi-GW Planning',
      description: 'Plan transfers across multiple gameweeks for long-term success',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full animate-fade-in">
          {/* Logo/Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-accent-primary" />
              <span className="text-overline text-accent-primary">POWERED BY AI</span>
            </div>
            <h1 className="text-display text-text-primary mb-4">
              FPL Team Optimizer
            </h1>
            <p className="text-body text-text-secondary max-w-md mx-auto">
              Optimize your Fantasy Premier League transfers with data-driven
              suggestions and mathematical precision.
            </p>
          </div>

          {/* Team ID Input Card */}
          <div className="card p-6 mb-8">
            <h2 className="text-heading text-text-primary mb-2">
              Enter Your Team ID
            </h2>
            <p className="text-caption text-text-tertiary mb-6">
              Find your team ID in the FPL website URL:{' '}
              <span className="text-text-secondary">
                fantasy.premierleague.com/entry/<strong className="text-accent-primary">YOUR-ID</strong>/event/XX
              </span>
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-status-red/10 border border-status-red/20">
                <p className="text-caption text-status-red font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="teamId" className="text-label block mb-2">
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
                className="btn btn-primary w-full py-3 text-body font-semibold group"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Loading...
                  </>
                ) : (
                  <>
                    Analyze Team
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card p-4 hover-lift animate-slide-in-up animation-fill-both"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-4 h-4 text-accent-primary" />
                </div>
                <h3 className="font-semibold text-text-primary text-body mb-1">
                  {feature.title}
                </h3>
                <p className="text-caption text-text-tertiary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border-subtle">
        <p className="text-caption text-text-tertiary">
          Built for FPL managers who want to win
        </p>
      </footer>
    </div>
  )
}
