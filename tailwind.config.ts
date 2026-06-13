import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fdfaf3',
        ink: '#2a2a2a',
        inksoft: '#666666',
        paper: '#FBF4E4',
        'paper-deep': '#F3E6CC',
        'paper-edge': '#E5D2A8',
        'paper-shadow': '#C9B486',
        nib: '#241A12',
        nibsoft: '#6B5847',
        nibfaint: '#A39684',
        coral: '#E66B4A',
        marine: '#3A7D7B',
        sun: '#E8A93C',
        rose: '#E89AA8',
        sage: '#8FA479',
        plum: '#7B4B6B',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        hand: ['var(--font-hand)', 'cursive'],
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) rotate(var(--tilt-from, 0deg))' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(var(--tilt, 0deg))' },
        },
        'scribble': {
          '0%': { 'stroke-dashoffset': '320' },
          '100%': { 'stroke-dashoffset': '0' },
        },
        'sway': {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
        },
        'pulse-stamp': {
          '0%, 100%': { opacity: '0.85', transform: 'rotate(-6deg) scale(1)' },
          '50%': { opacity: '1', transform: 'rotate(-6deg) scale(1.04)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'page-in': 'page-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scribble': 'scribble 1.4s ease-out both',
        'sway': 'sway 6s ease-in-out infinite',
        'pulse-stamp': 'pulse-stamp 2.4s ease-in-out infinite',
      },
    },
  },
} satisfies Config;
