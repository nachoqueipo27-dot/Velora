# Tokens del rediseño — consulta rápida

Fuente de verdad: `src/lib/tokens.ts`. Tailwind replica los mismos valores en `tailwind.config.js`
(si cambiás uno, cambiá los tres: tokens.ts, tailwind.config.js y este archivo).
Referencia visual: `docs/diseno/*.dc.html`.

## Colores (modo claro, principal)

| Token | Valor | Clase Tailwind | Uso |
|---|---|---|---|
| fondo | `#F7F5F1` | `bg-fondo` | fondo general de la app |
| superficie | `#FFFFFF` | `bg-superficie` | tarjetas, paneles |
| superficie-suave | `#F2EFEA` | `bg-superficie-suave` | filas alternas, inputs deshabilitados |
| borde | `#E3E0D9` | `border-borde` | bordes de tarjetas e inputs |
| borde-fuerte | `#D8D4CC` | `border-borde-fuerte` | separadores marcados |
| texto | `#1A1915` | `text-texto` | texto principal |
| texto-2 | `#55524B` | `text-texto-2` | texto secundario |
| texto-3 | `#6E6A62` | `text-texto-3` | ayudas, etiquetas |
| acento | `#D9572B` | `bg-acento` | botón principal, activo en el menú |
| acento-hover | `#C24A22` | `hover:bg-acento-hover` | hover del acento |
| acento-texto | `#8A3214` | `text-acento-texto` | texto sobre fondo acento suave |
| acento-suave | `#FBEAE3` | `bg-acento-suave` | fondos de avisos y seleccionados |
| ok / ok-suave | `#2F7D4F` / `#E5F2EA` | `text-ok` / `bg-ok-suave` | cobrado, conectado |
| alerta / alerta-suave | `#9A5B0B` / `#F8EDD8` | `text-alerta` / `bg-alerta-suave` | stock bajo, pendientes |
| error | `#9E1F3C` | `text-error` | rechazado, faltante |
| info | `#24457A` | `text-info` | datos informativos |

## Modo oscuro (secundario)

Son los valores del diseño anterior: `bg-oscuro-fondo` `#0A0A0A`, `bg-oscuro-superficie` `#141414`,
`bg-oscuro-elevado` `#1C1C1C`, `border-oscuro-borde` `#2A2A2A`, `text-oscuro-texto` `#FFFFFF`,
`text-oscuro-texto-2` `#A0A0A0`, `text-oscuro-texto-3` `#606060`.

## Radios

| Token | Valor | Clase | Uso |
|---|---|---|---|
| control | 10px | `rounded-control` | inputs, botones |
| tarjeta | 14px | `rounded-tarjeta` | tarjetas chicas |
| panel | 16px | `rounded-panel` | paneles |
| pastilla | 999px | `rounded-pastilla` | pastillas |

## Tipografía

- `font-sans` = **Geist** (texto). Es la fuente por defecto de toda la app.
- `font-mono` = **Geist Mono**: montos, códigos de barras, números de venta y cantidades.
- Las dos vienen empaquetadas (`@fontsource/geist`, `@fontsource/geist-mono`): no dependen de internet.

| Tamaño | Valor | Clase | Uso |
|---|---|---|---|
| cuerpo | 13px | `text-cuerpo` | texto general (también es el tamaño base del `body`) |
| etiqueta | 11px, tracking 0.08em | `text-etiqueta uppercase` | etiquetas en mayúscula |
| seccion | 14px | `text-seccion` | títulos de sección |
| titulo | 16px | `text-titulo` | títulos de sección destacados |

## Alias viejos (temporales)

Siguen funcionando para no tocar pantallas. Al migrar cada pantalla, reemplazalos por el token nuevo.

| Clase vieja | Apunta a | Valor |
|---|---|---|
| `rounded-input` | control | 10px (antes 8px) |
| `rounded-card` | tarjeta | 14px (antes 10px) |
| `rounded-modal` | panel | 16px (antes 14px) |
| `bg-aviso-fondo` | acento-suave | `#FBEAE3` |
| `text-aviso-texto` | acento-texto | `#8A3214` |
