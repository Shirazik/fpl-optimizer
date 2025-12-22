import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        'bg-app': 'var(--bg-app)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',

        // Text hierarchy
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-disabled': 'var(--text-disabled)',

        // Accent colors
        'accent-primary': 'var(--accent-primary)',
        'accent-purple': 'var(--accent-purple)',
        'accent-pink': 'var(--accent-pink)',

        // Status colors
        'status-green': 'var(--status-green)',
        'status-yellow': 'var(--status-yellow)',
        'status-red': 'var(--status-red)',
        'status-blue': 'var(--status-blue)',
        'status-purple': 'var(--status-purple)',

        // Position colors
        'pos-goalkeeper': 'var(--pos-goalkeeper)',
        'pos-defender': 'var(--pos-defender)',
        'pos-midfielder': 'var(--pos-midfielder)',
        'pos-forward': 'var(--pos-forward)',

        // Player status
        'player-fit': 'var(--player-fit)',
        'player-doubt': 'var(--player-doubt)',
        'player-injured': 'var(--player-injured)',
        'player-suspended': 'var(--player-suspended)',

        // Borders
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '600' }],
        'title': ['24px', { lineHeight: '1.3', letterSpacing: '-0.3px', fontWeight: '600' }],
        'heading': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'subheading': ['14px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.5px' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'overline': ['11px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.8px' }],
        'stat': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        'score': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
        'slow': '250ms',
        'slower': '400ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'modal-in': 'modal-in 0.25s ease-out',
        'spin': 'spin 1s linear infinite',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'modal': '0 24px 48px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
export default config
