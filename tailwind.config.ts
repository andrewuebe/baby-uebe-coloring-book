import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { cream: '#fdfaf3', ink: '#2a2a2a', inksoft: '#666666' },
      fontFamily: { serif: ['Georgia', 'serif'] },
    },
  },
} satisfies Config;
