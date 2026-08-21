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
          300: '#7ac52f',
          400: '#4fa80e',
          500: '#257c00',
          600: '#1e6600',
          700: '#174f00',
          800: '#123d00',
          900: '#0c2a00',
        },
        sena: {
          green:        '#1e6800',
          'green-dark': '#144600',
          orange:       '#ea580c',
          'orange-dark':'#c2410c',
          blue:         '#0f233a',
          'blue-light': '#1e3a5f',
          'orange-light': '#f97316',
          'orange-pale': '#fff7ed',
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
