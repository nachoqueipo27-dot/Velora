export const tokens = {
  colors: {
    dark: {
      base:      '#0A0A0A',
      surface:   '#141414',
      elevated:  '#1C1C1C',
      border:    '#2A2A2A',
    },
    light: {
      base:      '#FAFAFA',
      surface:   '#FFFFFF',
      elevated:  '#F4F4F4',
      border:    '#E4E4E4',
    },
    text: {
      dark: {
        primary:   '#FFFFFF',
        secondary: '#A0A0A0',
        tertiary:  '#606060',
      },
      light: {
        primary:   '#0A0A0A',
        secondary: '#404040',
        tertiary:  '#888888',
      },
    },
    state: {
      success: '#4CAF7D',
      warning: '#D4921A',
      error:   '#C0392B',
      info:    '#4A7FA5',
    },
  },
  typography: {
    display:    { size: '24px', weight: '700' },
    heading:    { size: '18px', weight: '600' },
    subheading: { size: '14px', weight: '600' },
    body:       { size: '14px', weight: '400' },
    small:      { size: '12px', weight: '400' },
    micro:      { size: '11px', weight: '500' },
  },
  radius: {
    card:  '10px',
    input: '8px',
    modal: '14px',
  },
  transition: {
    fast:   '120ms ease',
    normal: '150ms ease-out',
    medium: '200ms ease',
    slide:  '250ms ease-in-out',
    theme:  '300ms ease',
  },
}
