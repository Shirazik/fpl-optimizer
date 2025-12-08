import type { SquadPlayer, Formation, PlayerPosition } from '@/types/fpl'

/**
 * Detect formation from starting XI composition
 */
export function detectFormation(startingXI: SquadPlayer[]): Formation {
  const counts = {
    gk: startingXI.filter(sp => sp.player.element_type === 1).length,
    def: startingXI.filter(sp => sp.player.element_type === 2).length,
    mid: startingXI.filter(sp => sp.player.element_type === 3).length,
    fwd: startingXI.filter(sp => sp.player.element_type === 4).length,
  }

  // Validate formation (must have exactly 11 players with 1 GK)
  const total = counts.gk + counts.def + counts.mid + counts.fwd
  if (total !== 11 || counts.gk !== 1) {
    // Return default 4-4-2 if invalid
    return {
      gk: 1,
      def: 4,
      mid: 4,
      fwd: 2,
      displayName: '4-4-2',
    }
  }

  return {
    ...counts,
    displayName: `${counts.def}-${counts.mid}-${counts.fwd}`,
  }
}

/**
 * Calculate horizontal positions for N players in a row
 * Returns percentage positions (0-100) evenly distributed with 10% margins
 */
function distributeHorizontally(count: number): number[] {
  if (count === 1) {
    return [50] // Center single player
  }

  const spacing = 80 / (count + 1) // Leave 10% margin on each side
  return Array.from({ length: count }, (_, i) => 10 + spacing * (i + 1))
}

/**
 * Calculate positions for all players based on formation
 * Returns array of PlayerPosition with x, y coordinates (0-100 percentages)
 */
export function calculatePositions(
  startingXI: SquadPlayer[],
  formation: Formation
): PlayerPosition[] {
  // Vertical tiers (from bottom of pitch)
  const yPositions = {
    gk: 92,   // Near bottom (goalkeeper area)
    def: 72,  // Defensive third
    mid: 48,  // Midfield
    fwd: 24,  // Attacking third
  }

  // Group players by position
  const grouped = {
    gk: startingXI.filter(sp => sp.player.element_type === 1),
    def: startingXI.filter(sp => sp.player.element_type === 2),
    mid: startingXI.filter(sp => sp.player.element_type === 3),
    fwd: startingXI.filter(sp => sp.player.element_type === 4),
  }

  // Calculate horizontal distributions for each row
  const xDistributions = {
    gk: distributeHorizontally(grouped.gk.length),
    def: distributeHorizontally(grouped.def.length),
    mid: distributeHorizontally(grouped.mid.length),
    fwd: distributeHorizontally(grouped.fwd.length),
  }

  // Create PlayerPosition objects
  const positions: PlayerPosition[] = []

  // Process each position type
  ;(['fwd', 'mid', 'def', 'gk'] as const).forEach(row => {
    grouped[row].forEach((player, index) => {
      positions.push({
        player,
        x: xDistributions[row][index],
        y: yPositions[row],
        row,
        rowIndex: index,
      })
    })
  })

  return positions
}

/**
 * Get formation display name with emoji
 */
export function getFormationDisplay(formation: Formation): string {
  return `⚽ ${formation.displayName}`
}

/**
 * Check if formation is valid for FPL rules
 */
export function isValidFormation(formation: Formation): boolean {
  return (
    formation.gk === 1 &&
    formation.def >= 3 &&
    formation.def <= 5 &&
    formation.mid >= 2 &&
    formation.mid <= 5 &&
    formation.fwd >= 1 &&
    formation.fwd <= 3 &&
    formation.gk + formation.def + formation.mid + formation.fwd === 11
  )
}
