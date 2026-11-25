// Formatos de etiquetas. TODAS las medidas están acá, en milímetros: si una marca de hojas
// autoadhesivas viene un poco corrida, se ajusta este archivo y nada más.
//
// Las hojas A4 se llenan de izquierda a derecha y de arriba abajo.

export type FormatoEtiqueta = 'rollo' | 'a4_24' | 'a4_65' | 'a4_21'

export interface PlantillaEtiqueta {
  id: FormatoEtiqueta
  nombre: string
  /** Línea de ayuda debajo de la opción. */
  ayuda: string
  /** Tamaño de cada etiqueta. */
  anchoMm: number
  altoMm: number
  /** Solo hojas A4: grilla, márgenes desde el borde de la hoja y separación entre etiquetas. */
  columnas: number
  filas: number
  margenSupMm: number
  margenIzqMm: number
  separacionXMm: number
  separacionYMm: number
}

export const A4 = { anchoMm: 210, altoMm: 297 }

export const PLANTILLAS: Record<FormatoEtiqueta, PlantillaEtiqueta> = {
  rollo: {
    id: 'rollo', nombre: 'Rollo de etiquetas 40 × 30 mm',
    ayuda: 'Una etiqueta por página, para impresoras de etiquetas o la térmica del ticket.',
    anchoMm: 40, altoMm: 30, columnas: 1, filas: 1, margenSupMm: 0, margenIzqMm: 0, separacionXMm: 0, separacionYMm: 0,
  },
  // 3 × 8 (tipo L7159): 63,5 × 33,9 mm.
  a4_24: {
    id: 'a4_24', nombre: '24 por hoja', ayuda: '3 × 8 · etiquetas de 64 × 34 mm, las más comunes.',
    anchoMm: 63.5, altoMm: 33.9, columnas: 3, filas: 8, margenSupMm: 12.9, margenIzqMm: 7.2, separacionXMm: 2.5, separacionYMm: 0,
  },
  // 5 × 13 (tipo L7651): 38,1 × 21,2 mm.
  a4_65: {
    id: 'a4_65', nombre: '65 por hoja', ayuda: '5 × 13 · etiquetas chicas de 38 × 21 mm.',
    anchoMm: 38.1, altoMm: 21.2, columnas: 5, filas: 13, margenSupMm: 10.7, margenIzqMm: 4.7, separacionXMm: 2.5, separacionYMm: 0,
  },
  // 3 × 7 sin márgenes: 70 × 42,3 mm.
  a4_21: {
    id: 'a4_21', nombre: '21 por hoja', ayuda: '3 × 7 · etiquetas grandes de 70 × 42 mm.',
    anchoMm: 70, altoMm: 42.3, columnas: 3, filas: 7, margenSupMm: 0.45, margenIzqMm: 0, separacionXMm: 0, separacionYMm: 0,
  },
}

export const FORMATOS_A4: FormatoEtiqueta[] = ['a4_24', 'a4_65', 'a4_21']

export const porHoja = (p: PlantillaEtiqueta) => p.columnas * p.filas

/** Milímetros a puntos PDF (1 pt = 1/72 de pulgada). */
export const mm = (valor: number) => (valor * 72) / 25.4

/** Posición (esquina superior izquierda, en mm) de la celda `indice` (0-based) en la hoja. */
export function posicionCelda(p: PlantillaEtiqueta, indice: number): { xMm: number; yMm: number } {
  const col = indice % p.columnas
  const fila = Math.floor(indice / p.columnas)
  return {
    xMm: p.margenIzqMm + col * (p.anchoMm + p.separacionXMm),
    yMm: p.margenSupMm + fila * (p.altoMm + p.separacionYMm),
  }
}

export interface Ubicada<T> { item: T; indiceItem: number }

/**
 * Reparte las copias en hojas. `inicio` es la primera posición libre (1 = arriba a la
 * izquierda) y solo vale para la primera hoja. Con `filaNueva`, cada producto empieza en
 * una fila nueva (deja huecos al final del anterior).
 * Devuelve las hojas, cada una con sus celdas (null = vacía) y cuántas quedan libres al final.
 */
export function distribuirEnHojas<T extends { copias: number }>(
  items: T[], p: PlantillaEtiqueta, inicio: number, filaNueva: boolean,
): { hojas: (Ubicada<T> | null)[][]; ocupadas: number; libresUltima: number; posicionFinal: number } {
  const n = porHoja(p)
  const celdas: (Ubicada<T> | null)[] = []
  let pos = Math.min(Math.max(1, inicio), n) - 1
  for (let i = 0; i < pos; i++) celdas.push(null)
  items.forEach((item, indiceItem) => {
    if (item.copias <= 0) return
    if (filaNueva && pos % p.columnas !== 0 && celdas.some(c => c !== null)) {
      const salto = p.columnas - (pos % p.columnas)
      for (let i = 0; i < salto; i++) { celdas.push(null); pos++ }
    }
    for (let c = 0; c < item.copias; c++) { celdas.push({ item, indiceItem }); pos++ }
  })
  const totalHojas = Math.max(1, Math.ceil(pos / n))
  while (celdas.length < totalHojas * n) celdas.push(null)
  const hojas: (Ubicada<T> | null)[][] = []
  for (let h = 0; h < totalHojas; h++) hojas.push(celdas.slice(h * n, (h + 1) * n))
  return { hojas, ocupadas: pos, libresUltima: totalHojas * n - pos, posicionFinal: pos }
}
