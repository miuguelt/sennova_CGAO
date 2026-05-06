/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fae8',
          100: '#d9f3c0',
          200: '#b0e47a',
          300: '#84d13a',
          400: '#5fbe16',
          500: '#39A900',
          600: '#2d8000',
          700: '#236600',
          800: '#1a4d00',
          900: '#0f3300',
        },
        sena: {
          orange:       '#F15A22',
          blue:         '#1A2E4A',
          'blue-light':  '#2A4A6A',
          'orange-light': '#F47B50',
          'orange-pale': '#FEF0EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':  '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
        brand:      '0 4px 14px -2px rgb(57 169 0 / 0.30)',
      },
      animation: {
        'fade-in':  'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                             to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.97)' },  to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
