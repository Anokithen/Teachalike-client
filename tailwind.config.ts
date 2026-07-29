import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1FAFC',
          100: '#DFF3F7',
          200: '#B8E5EC',
          300: '#86D1DC',
          900: '#023859',
          800: '#0B4B6E',
          700: '#175B7D',
          600: '#26658C',
          500: '#367F9D',
          400: '#54ACBF',
        },
        purple: '#7655E8',
        'bright-purple': '#9159F5',
        gold: '#F6B83F',
        orange: '#F28B45',
        mint: '#49C4A7',
        pink: '#F47FA2',
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(2, 56, 89, 0.06), 0 1px 12px rgba(2, 56, 89, 0.04)',
        neumorphic: '10px 10px 24px rgba(2, 56, 89, 0.10), -8px -8px 20px rgba(255, 255, 255, 0.92)',
      },
    },
  },
  plugins: [],
};

export default config;
