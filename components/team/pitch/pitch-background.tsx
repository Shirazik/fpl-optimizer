/**
 * Football Pitch Background
 * Minimalist pitch using design system colors
 */

export function PitchBackground() {
  return (
    <svg
      viewBox="0 0 100 140"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pitch background - uses CSS variable for theme support */}
      <rect
        width="100"
        height="140"
        className="pitch-surface"
      />

      {/* Pitch markings (white lines) */}
      <g className="pitch-line">
        {/* Outer boundary */}
        <rect x="5" y="5" width="90" height="130" />

        {/* Halfway line */}
        <line x1="5" y1="70" x2="95" y2="70" />

        {/* Center circle */}
        <circle cx="50" cy="70" r="10" />
        <circle cx="50" cy="70" r="0.8" fill="white" />

        {/* Penalty areas - Top (attacking) */}
        <rect x="20" y="5" width="60" height="18" />
        <rect x="35" y="5" width="30" height="8" />

        {/* Penalty spot - Top */}
        <circle cx="50" cy="15" r="0.6" fill="white" />

        {/* Penalty arc - Top */}
        <path
          d="M 35 23 A 10 10 0 0 0 65 23"
          fill="none"
        />

        {/* Penalty areas - Bottom (defensive) */}
        <rect x="20" y="117" width="60" height="18" />
        <rect x="35" y="127" width="30" height="8" />

        {/* Penalty spot - Bottom */}
        <circle cx="50" cy="125" r="0.6" fill="white" />

        {/* Penalty arc - Bottom */}
        <path
          d="M 35 117 A 10 10 0 0 1 65 117"
          fill="none"
        />

        {/* Corner arcs */}
        <path d="M 5 8 A 3 3 0 0 1 8 5" fill="none" />        {/* Top left */}
        <path d="M 92 5 A 3 3 0 0 1 95 8" fill="none" />       {/* Top right */}
        <path d="M 5 132 A 3 3 0 0 0 8 135" fill="none" />     {/* Bottom left */}
        <path d="M 92 135 A 3 3 0 0 0 95 132" fill="none" />   {/* Bottom right */}

        {/* Goal areas (darker rectangles) */}
        <rect
          x="0"
          y="0"
          width="100"
          height="3"
          fill="rgba(0,0,0,0.2)"
          stroke="none"
        />
        <rect
          x="0"
          y="137"
          width="100"
          height="3"
          fill="rgba(0,0,0,0.2)"
          stroke="none"
        />
      </g>

      {/* Goal posts (simple representation) */}
      <g fill="white" opacity="0.3">
        {/* Top goal */}
        <rect x="40" y="0" width="1" height="2" />
        <rect x="59" y="0" width="1" height="2" />

        {/* Bottom goal */}
        <rect x="40" y="138" width="1" height="2" />
        <rect x="59" y="138" width="1" height="2" />
      </g>
    </svg>
  )
}
