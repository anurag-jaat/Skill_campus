/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        freelance: '#0f766e',
        exchange: '#6d28d9',
        team: '#6366f1',
        cw: {
          bg: 'var(--cw-bg)',
          'bg-alt': 'var(--cw-bg-alt)',
          surface: 'var(--cw-surface)',
          'surface-2': 'var(--cw-surface-2)',
          accent: 'var(--cw-accent)',
          'accent-mid': 'var(--cw-accent-mid)',
          'accent-light': 'var(--cw-accent-light)',
          'text-1': 'var(--cw-text-1)',
          'text-2': 'var(--cw-text-2)',
          'text-3': 'var(--cw-text-3)',
          border: 'var(--cw-border)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        serif: ['"Outfit"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
