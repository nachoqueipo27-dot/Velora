// Plata en Velora: SIEMPRE enteros en centavos (desde la versión 1.3.0).
// $ 1.234,56 se guarda como 123456. Nunca float para plata.
// Cantidades, stock, horas, porcentajes y tipos de cambio NO son plata: siguen decimales.
//
// Reglas:
// - Lo que viene de la base ya está en centavos.
// - Lo que tipea el usuario está en pesos → convertir al guardar con `aCentavos`.
// - Mostrar siempre con `formatearPesos`.
// - Precio × cantidad fraccionable (kg, metros) → `porCantidad`.
// - Descuentos / recargos porcentuales → `aplicarPorcentaje`.

/** Monto en centavos (entero). Es un alias de `number` para documentar la unidad. */
export type Centavos = number

/**
 * Convierte un monto en pesos a centavos enteros.
 * Acepta números (1234.56) y textos en formato argentino ("1.234,56", "$ 1.234,56")
 * o con punto decimal ("1234.56"). Siempre redondea al centavo más cercano.
 * Texto vacío o inválido → 0.
 *
 * En textos: si aparecen coma y punto, el último es el decimal. Un punto solo seguido de
 * exactamente 3 dígitos ("1.234") o varios puntos ("1.234.567") se toman como miles.
 */
export function aCentavos(valor: string | number | null | undefined): Centavos {
  if (valor === null || valor === undefined) return 0
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return 0
    const texto = String(valor)
    // Notación exponencial (1e-7, 1e21): no aparece con montos reales; se redondea directo.
    if (/e/i.test(texto)) return Math.round(valor * 100)
    return decimalACentavos(texto)
  }

  let s = valor.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!s) return 0
  let negativo = false
  if (s.startsWith('-')) { negativo = true; s = s.slice(1) }

  const ultimaComa = s.lastIndexOf(',')
  const ultimoPunto = s.lastIndexOf('.')
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    s = ultimaComa > ultimoPunto
      ? s.replace(/\./g, '').replace(',', '.')   // 1.234,56
      : s.replace(/,/g, '')                       // 1,234.56
  } else if (ultimaComa >= 0) {
    const partes = s.split(',')
    s = partes.length > 2 ? partes.join('') : partes.join('.')
  } else if (ultimoPunto >= 0) {
    const partes = s.split('.')
    const esMiles = partes.length > 2 || (partes.length === 2 && partes[1].length === 3)
    if (esMiles) s = partes.join('')
  }

  if (!/^\d*\.?\d*$/.test(s) || s === '.' ) return 0
  const centavos = decimalACentavos(s)
  return negativo ? -centavos : centavos
}

/** "1234.567" (punto decimal, sin signo o con "-") → 123457. Aritmética entera, sin float. */
function decimalACentavos(texto: string): Centavos {
  let s = texto
  let negativo = false
  if (s.startsWith('-')) { negativo = true; s = s.slice(1) }
  const [entera = '', decimales = ''] = s.split('.')
  const pesos = entera ? parseInt(entera, 10) : 0
  const dos = (decimales + '00').slice(0, 2)
  let centavos = pesos * 100 + parseInt(dos, 10)
  // Redondeo al centavo con el tercer decimal (mitad hacia arriba).
  if (decimales.length > 2 && decimales.charCodeAt(2) - 48 >= 5) centavos += 1
  if (!Number.isFinite(centavos)) return 0
  return negativo ? -centavos : centavos
}

export interface OpcionesFormato {
  /** Si los centavos son ,00 no los muestra: "$ 1.234" en vez de "$ 1.234,00". */
  sinCentavosSiCero?: boolean
}

/** 123456 → "$ 1.234,56". Negativos: "-$ 1.234,56". */
export function formatearPesos(centavos: Centavos | null | undefined, opciones: OpcionesFormato = {}): string {
  const valor = Math.round(centavos ?? 0)
  const negativo = valor < 0
  const abs = Math.abs(valor)
  const pesos = Math.floor(abs / 100)
  const resto = abs % 100
  const miles = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimales = opciones.sinCentavosSiCero && resto === 0 ? '' : ',' + String(resto).padStart(2, '0')
  return `${negativo ? '-' : ''}$ ${miles}${decimales}`
}

/**
 * Centavos → pesos como número, SOLO para precargar un input de edición.
 * No usar para calcular: toda la aritmética se hace en centavos.
 */
export function aPesos(centavos: Centavos | null | undefined): number {
  return Math.round(centavos ?? 0) / 100
}

/** Precio unitario × cantidad (admite kg, metros, litros) → centavos redondeados. */
export function porCantidad(precioCentavos: Centavos, cantidad: number): Centavos {
  return Math.round(precioCentavos * cantidad)
}

/** `pct` por ciento de un monto → centavos redondeados. aplicarPorcentaje(10000, 21) = 2100. */
export function aplicarPorcentaje(centavos: Centavos, pct: number): Centavos {
  return Math.round((centavos * pct) / 100)
}

/**
 * Reparte un monto en `partes` iguales sin perder centavos: la suma da exacta.
 * repartir(1000, 3) → [334, 333, 333].
 */
export function repartir(centavos: Centavos, partes: number): Centavos[] {
  const n = Math.max(1, Math.floor(partes))
  const total = Math.round(centavos)
  const signo = total < 0 ? -1 : 1
  const abs = Math.abs(total)
  const base = Math.floor(abs / n)
  const sobrante = abs - base * n
  return Array.from({ length: n }, (_, i) => signo * (base + (i < sobrante ? 1 : 0)))
}

/**
 * Casos fijos de los helpers. Se corre en desarrollo al iniciar (ver main.tsx);
 * si algo falla lo muestra en la consola. Devuelve la cantidad de fallas.
 */
export function probarDinero(): number {
  const casos: [string, unknown, unknown][] = [
    ['aCentavos("1.234,56")', aCentavos('1.234,56'), 123456],
    ['aCentavos("$ 1.234,56")', aCentavos('$ 1.234,56'), 123456],
    ['aCentavos("1234.56")', aCentavos('1234.56'), 123456],
    ['aCentavos("1234,56")', aCentavos('1234,56'), 123456],
    ['aCentavos("1,234.56")', aCentavos('1,234.56'), 123456],
    ['aCentavos("1.234")', aCentavos('1.234'), 123400],
    ['aCentavos("1.234.567")', aCentavos('1.234.567'), 123456700],
    ['aCentavos("0,5")', aCentavos('0,5'), 50],
    ['aCentavos("")', aCentavos(''), 0],
    ['aCentavos("abc")', aCentavos('abc'), 0],
    ['aCentavos("-10,25")', aCentavos('-10,25'), -1025],
    ['aCentavos(1234.56)', aCentavos(1234.56), 123456],
    ['aCentavos(1.005)', aCentavos(1.005), 101],
    ['aCentavos(0.1 + 0.2)', aCentavos(0.1 + 0.2), 30],
    ['aCentavos(19.999)', aCentavos(19.999), 2000],
    ['aCentavos(-5.5)', aCentavos(-5.5), -550],
    ['formatearPesos(123456)', formatearPesos(123456), '$ 1.234,56'],
    ['formatearPesos(5)', formatearPesos(5), '$ 0,05'],
    ['formatearPesos(-123456)', formatearPesos(-123456), '-$ 1.234,56'],
    ['formatearPesos(123400, sin ,00)', formatearPesos(123400, { sinCentavosSiCero: true }), '$ 1.234'],
    ['formatearPesos(123456, sin ,00)', formatearPesos(123456, { sinCentavosSiCero: true }), '$ 1.234,56'],
    ['formatearPesos(100000000)', formatearPesos(100000000), '$ 1.000.000,00'],
    ['porCantidad(329216, 0.375)', porCantidad(329216, 0.375), 123456],
    ['porCantidad(999, 1.5)', porCantidad(999, 1.5), 1499],
    ['aplicarPorcentaje(10000, 21)', aplicarPorcentaje(10000, 21), 2100],
    ['aplicarPorcentaje(999, 10)', aplicarPorcentaje(999, 10), 100],
    ['repartir(1000, 3)', repartir(1000, 3).join(','), '334,333,333'],
    ['repartir(1000, 3) suma', repartir(1000, 3).reduce((a, b) => a + b, 0), 1000],
    ['repartir(-100, 3)', repartir(-100, 3).join(','), '-34,-33,-33'],
    ['aPesos(123456)', aPesos(123456), 1234.56],
  ]
  let fallas = 0
  for (const [nombre, obtenido, esperado] of casos) {
    if (obtenido !== esperado) {
      fallas++
      console.error(`probarDinero ✗ ${nombre}: dio ${String(obtenido)}, se esperaba ${String(esperado)}`)
    }
  }
  if (fallas === 0) console.info(`probarDinero ✓ ${casos.length} casos`)
  return fallas
}
