// Sistema visual de Velora (rediseño: modo claro + acento terracota + Geist).
// Fuente única de valores. `tailwind.config.js` replica estos mismos valores:
// si cambiás uno acá, cambialo también allá (y en docs/tokens.md).

export const tokens = {
  // Modo claro — principal.
  colores: {
    fondo:           '#F7F5F1', // fondo general de la app
    superficie:      '#FFFFFF', // tarjetas, paneles
    superficieSuave: '#F2EFEA', // filas alternas, inputs deshabilitados
    borde:           '#E3E0D9', // bordes de tarjetas e inputs
    bordeFuerte:     '#D8D4CC', // separadores marcados

    texto:  '#1A1915', // texto principal
    texto2: '#55524B', // texto secundario
    texto3: '#6E6A62', // ayudas, etiquetas

    acento:      '#D9572B', // botón principal, activo en el menú
    acentoHover: '#C24A22', // hover del acento
    acentoTexto: '#8A3214', // texto sobre fondo acento suave
    acentoSuave: '#FBEAE3', // fondos de avisos y seleccionados

    ok:          '#2F7D4F', // cobrado, conectado
    okSuave:     '#E5F2EA',
    alerta:      '#9A5B0B', // stock bajo, pendientes
    alertaSuave: '#F8EDD8',
    error:       '#9E1F3C', // rechazado, faltante
    info:        '#24457A', // datos informativos
  },

  // Modo oscuro — secundario. Son los valores del diseño anterior, sin cambios.
  oscuro: {
    fondo:      '#0A0A0A',
    superficie: '#141414',
    elevado:    '#1C1C1C',
    borde:      '#2A2A2A',
    texto:      '#FFFFFF',
    texto2:     '#A0A0A0',
    texto3:     '#606060',
  },

  radios: {
    control:  '10px',  // inputs, botones
    tarjeta:  '14px',  // tarjetas chicas
    panel:    '16px',  // paneles
    pastilla: '999px', // pastillas / badges
  },

  tipografia: {
    // Geist para texto; Geist Mono para montos, códigos de barras, números de venta y cantidades.
    sans: ['Geist', 'system-ui', 'sans-serif'],
    mono: ['Geist Mono', 'ui-monospace', 'monospace'],
    tamanos: {
      cuerpo:   '13px', // texto general
      etiqueta: '11px', // etiquetas en mayúscula (tracking 0.08em)
      seccion:  '14px', // títulos de sección
      titulo:   '16px', // títulos de sección destacados
    },
    pesos: {
      normal:   400,
      medio:    500,
      semibold: 600,
    },
  },

  transicion: {
    rapida: '120ms ease',
    normal: '150ms ease-out',
    media:  '200ms ease',
    slide:  '250ms ease-in-out',
    tema:   '300ms ease',
  },
}
