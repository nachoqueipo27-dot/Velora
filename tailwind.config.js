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
      // Sistema visual del rediseño — mismos valores que src/lib/tokens.ts (mantener sincronizado).
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'cuerpo':   '13px',                                // texto general
        'etiqueta': ['11px', { letterSpacing: '0.08em' }], // etiquetas en mayúscula
        'seccion':  '14px',                                // títulos de sección
        'titulo':   '16px',                                // títulos de sección destacados
      },
      colors: {
        // MODO CLARO (principal)
        'fondo':            '#F7F5F1',
        'superficie':       '#FFFFFF',
        'superficie-suave': '#F2EFEA',
        'borde':            '#E3E0D9',
        'borde-fuerte':     '#D8D4CC',
        // text-texto, text-texto-2, text-texto-3
        'texto': {
          DEFAULT: '#1A1915',
          2:       '#55524B',
          3:       '#6E6A62',
        },
        // bg-acento, hover:bg-acento-hover, text-acento-texto, bg-acento-suave
        'acento': {
          DEFAULT: '#D9572B',
          hover:   '#C24A22',
          texto:   '#8A3214',
          suave:   '#FBEAE3',
        },
        'ok':     { DEFAULT: '#2F7D4F', suave: '#E5F2EA' },
        'alerta': { DEFAULT: '#9A5B0B', suave: '#F8EDD8' },
        'error':  '#9E1F3C',
        'info':   '#24457A',

        // MODO OSCURO (secundario) — valores del diseño anterior
        'oscuro': {
          fondo:      '#0A0A0A',
          superficie: '#141414',
          elevado:    '#1C1C1C',
          borde:      '#2A2A2A',
          texto:      '#FFFFFF',
          'texto-2':  '#A0A0A0',
          'texto-3':  '#606060',
        },

        // ALIAS VIEJOS → tokens nuevos (en uso en pantallas; no borrar hasta migrarlas)
        'aviso-fondo': '#FBEAE3', // = acento-suave
        'aviso-texto': '#8A3214', // = acento-texto
      },
      borderRadius: {
        // Tokens nuevos
        'control':  '10px',  // inputs, botones
        'tarjeta':  '14px',  // tarjetas chicas
        'panel':    '16px',  // paneles
        'pastilla': '999px', // pastillas
        // ALIAS VIEJOS → tokens nuevos (muy usados en pantallas)
        'input': '10px', // = control
        'card':  '14px', // = tarjeta
        'modal': '16px', // = panel
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
