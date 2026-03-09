/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0eeff',
          100: '#e0dcff',
          200: '#c4baff',
          300: '#a695ff',
          400: '#8870ff',
          500: '#6B52F5',
          600: '#5a3ee0',
          700: '#4a2fbf',
          800: '#3a229e',
          900: '#2a177d',
        },
        surface: {
          900: '#0d0d1a',
          800: '#111128',
          700: '#16162f',
          600: '#1c1c38',
          500: '#222248',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(107, 82, 245, 0.2)' },
          to:   { boxShadow: '0 0 40px rgba(107, 82, 245, 0.5)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(107 82 245 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
      },
    },
  },
  plugins: [],
}
