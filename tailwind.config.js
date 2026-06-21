/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0E1A2B',
          900: '#162640',
          800: '#1B2A41',
          700: '#27405E',
          600: '#345377',
        },
        frost: {
          50: '#F7FAFB',
          100: '#F0F5F7',
          200: '#E3ECF0',
        },
        ice: {
          400: '#6FA8C7',
          500: '#4D8AAD',
          600: '#3A6E8C',
        },
        amber: {
          400: '#E8A33D',
          500: '#D88E22',
        },
        rust: {
          500: '#C0392B',
          600: '#A12F22',
        },
        slate: {
          450: '#5B6B79',
        },
      },
      fontFamily: {
        display: ['"Archivo Black"', '"Archivo"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest2: '0.18em',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(14,26,43,0.35)',
      },
    },
  },
  plugins: [],
}
