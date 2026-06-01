import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // DARK MODE
        'dark-base':      '#0A0A0A',
        'dark-surface':   '#141414',
        'dark-elevated':  '#1C1C1C',
        'dark-border':    '#2A2A2A',

        // LIGHT MODE
        'light-base':     '#FAFAFA',
        'light-surface':  '#FFFFFF',
        'light-elevated': '#F4F4F4',
        'light-border':   '#E4E4E4',

        // TEXTO
        'text-primary-dark':    '#FFFFFF',
        'text-secondary-dark':  '#A0A0A0',
        'text-tertiary-dark':   '#606060',
        'text-primary-light':   '#0A0A0A',
        'text-secondary-light': '#404040',
        'text-tertiary-light':  '#888888',

        // ESTADOS
        'state-success':  '#4CAF7D',
        'state-warning':  '#D4921A',
        'state-error':    '#C0392B',
        'state-info':     '#4A7FA5',
      },
      borderRadius: {
        'card': '10px',
        'input': '8px',
        'modal': '14px',
      },
      transitionDuration: {
        '120': '120ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
    },
  },
  plugins: [
    // Variant `light:` — se activa cuando el <html> tiene la clase `light`.
    // Necesario porque Tailwind solo provee `dark:` de fábrica con darkMode:'class'.
    plugin(function ({ addVariant }) {
      addVariant('light', '.light &')
    }),
  ],
}
