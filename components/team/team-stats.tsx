import { Wallet, PiggyBank, ArrowLeftRight, Calendar, Star } from 'lucide-react'

interface TeamStatsProps {
  teamValue: number
  bank: number
  freeTransfers: number
  currentGameweek: number
  totalExpectedPoints?: number
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

function StatCard({ icon, label, value, highlight = false }: StatCardProps) {
  return (
    <div
      className={`
        card p-4 hover-lift
        ${highlight ? 'border-accent-purple/30 bg-accent-purple/5' : ''}
      `}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`${highlight ? 'text-accent-purple' : 'text-text-tertiary'}`}>
          {icon}
        </div>
        <span className="text-label">{label}</span>
      </div>
      <p className={`stat-lg ${highlight ? 'text-accent-purple' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  )
}

export function TeamStats({
  teamValue,
  bank,
  freeTransfers,
  currentGameweek,
  totalExpectedPoints,
}: TeamStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard
        icon={<Wallet className="w-4 h-4" />}
        label="Team Value"
        value={`£${teamValue.toFixed(1)}m`}
      />
      <StatCard
        icon={<PiggyBank className="w-4 h-4" />}
        label="In Bank"
        value={`£${bank.toFixed(1)}m`}
      />
      <StatCard
        icon={<ArrowLeftRight className="w-4 h-4" />}
        label="Free Transfers"
        value={freeTransfers.toString()}
      />
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        label="Gameweek"
        value={`GW${currentGameweek}`}
      />
      {totalExpectedPoints !== undefined && totalExpectedPoints > 0 && (
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="Expected Pts"
          value={totalExpectedPoints.toFixed(1)}
          highlight
        />
      )}
    </div>
  )
}
