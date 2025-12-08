/**
 * Premier League Team Colors
 * Maps team IDs to official brand colors for visual representation
 */

export interface TeamColor {
  primary: string    // Main team color
  secondary: string  // Accent color for gradients
  name: string       // Team name
}

export const TEAM_COLORS: Record<number, TeamColor> = {
  // Arsenal
  1: {
    primary: '#EF0107',
    secondary: '#063672',
    name: 'Arsenal',
  },
  // Aston Villa
  2: {
    primary: '#95BFE5',
    secondary: '#670E36',
    name: 'Aston Villa',
  },
  // Bournemouth
  3: {
    primary: '#DA291C',
    secondary: '#000000',
    name: 'Bournemouth',
  },
  // Brentford
  4: {
    primary: '#E30613',
    secondary: '#FBB800',
    name: 'Brentford',
  },
  // Brighton
  5: {
    primary: '#0057B8',
    secondary: '#FFCD00',
    name: 'Brighton',
  },
  // Chelsea
  6: {
    primary: '#034694',
    secondary: '#DBA111',
    name: 'Chelsea',
  },
  // Crystal Palace
  7: {
    primary: '#1B458F',
    secondary: '#C4122E',
    name: 'Crystal Palace',
  },
  // Everton
  8: {
    primary: '#003399',
    secondary: '#FFFFFF',
    name: 'Everton',
  },
  // Fulham
  9: {
    primary: '#FFFFFF',
    secondary: '#000000',
    name: 'Fulham',
  },
  // Ipswich Town
  10: {
    primary: '#0033A0',
    secondary: '#FF0000',
    name: 'Ipswich',
  },
  // Leicester City
  11: {
    primary: '#003090',
    secondary: '#FDBE11',
    name: 'Leicester',
  },
  // Liverpool
  12: {
    primary: '#C8102E',
    secondary: '#00B2A9',
    name: 'Liverpool',
  },
  // Manchester City
  13: {
    primary: '#6CABDD',
    secondary: '#1C2C5B',
    name: 'Man City',
  },
  // Manchester United
  14: {
    primary: '#DA291C',
    secondary: '#FBE122',
    name: 'Man Utd',
  },
  // Newcastle United
  15: {
    primary: '#241F20',
    secondary: '#41B6E6',
    name: 'Newcastle',
  },
  // Nottingham Forest
  16: {
    primary: '#DD0000',
    secondary: '#FFFFFF',
    name: 'Nott\'m Forest',
  },
  // Southampton
  17: {
    primary: '#D71920',
    secondary: '#130C0E',
    name: 'Southampton',
  },
  // Tottenham Hotspur
  18: {
    primary: '#132257',
    secondary: '#FFFFFF',
    name: 'Spurs',
  },
  // West Ham United
  19: {
    primary: '#7A263A',
    secondary: '#1BB1E7',
    name: 'West Ham',
  },
  // Wolverhampton Wanderers
  20: {
    primary: '#FDB913',
    secondary: '#231F20',
    name: 'Wolves',
  },
}

/**
 * Get team colors by team ID with fallback
 */
export function getTeamColors(teamId: number): TeamColor {
  return TEAM_COLORS[teamId] || {
    primary: '#6b6b74',  // Neutral gray fallback
    secondary: '#232329',
    name: 'Unknown',
  }
}
