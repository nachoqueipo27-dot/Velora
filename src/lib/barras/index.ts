// Codificadores de códigos de barras, sin librerías externas (son tablas fijas).
//   EAN-13 / EAN-8 : productos (13 y 8 dígitos).
//   ITF-14         : cajas y packs (14 dígitos), con barras de soporte arriba y abajo.
//   Code 128       : códigos internos no numéricos o de otro largo.
//
// Cada codificador devuelve los MÓDULOS: un texto de '1' (barra) y '0' (espacio), donde
// cada carácter es un módulo de ancho. El dibujo (SVG en pantalla, rectángulos en el PDF)
// convierte las rachas de '1' en barras. No hace falta nada más para que se escanee.

export type TipoBarras = 'ean13' | 'ean8' | 'itf14' | 'code128'

export interface CodigoCodificado {
  tipo: TipoBarras
  valor: string
  /** '1' = barra, '0' = espacio; un carácter por módulo. */
  modulos: string
  /** Módulos en blanco a cada lado (zona silenciosa) para que el lector lo tome. */
  zonaSilenciosa: number
  /** ITF-14: barras de soporte (marco) arriba y abajo. */
  soporte: boolean
}

export const NOMBRE_TIPO: Record<TipoBarras, string> = {
  ean13: 'EAN-13', ean8: 'EAN-8', itf14: 'ITF-14', code128: 'Code 128',
}

// ─── Dígito verificador GS1 (EAN-8, EAN-13, ITF-14, UPC) ─────────────────────
// Desde la derecha (sin el verificador), las posiciones impares pesan 3 y las pares 1.

export function digitoVerificadorGS1(cuerpo: string): number {
  let suma = 0
  for (let i = 0; i < cuerpo.length; i++) {
    const d = cuerpo.charCodeAt(cuerpo.length - 1 - i) - 48
    suma += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (suma % 10)) % 10
}

export const verificadorValido = (codigo: string) =>
  /^\d{2,}$/.test(codigo) && digitoVerificadorGS1(codigo.slice(0, -1)) === codigo.charCodeAt(codigo.length - 1) - 48

/** 13 dígitos → EAN-13; 8 → EAN-8; 14 → ITF-14; el resto → Code 128. */
export function detectarTipo(valor: string): TipoBarras {
  if (/^\d{13}$/.test(valor)) return 'ean13'
  if (/^\d{8}$/.test(valor)) return 'ean8'
  if (/^\d{14}$/.test(valor)) return 'itf14'
  return 'code128'
}

// ─── EAN-13 / EAN-8 ──────────────────────────────────────────────────────────

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
// Paridad de los 6 dígitos de la izquierda según el primer dígito (que no se dibuja).
const EAN_PARIDAD = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function ean13(valor: string): string {
  if (!/^\d{13}$/.test(valor)) throw new Error(`EAN-13 necesita 13 dígitos: ${valor}`)
  const d = [...valor].map(Number)
  const paridad = EAN_PARIDAD[d[0]]
  let m = '101'
  for (let i = 1; i <= 6; i++) m += (paridad[i - 1] === 'L' ? EAN_L : EAN_G)[d[i]]
  m += '01010'
  for (let i = 7; i <= 12; i++) m += EAN_R[d[i]]
  return m + '101'
}

export function ean8(valor: string): string {
  if (!/^\d{8}$/.test(valor)) throw new Error(`EAN-8 necesita 8 dígitos: ${valor}`)
  const d = [...valor].map(Number)
  let m = '101'
  for (let i = 0; i < 4; i++) m += EAN_L[d[i]]
  m += '01010'
  for (let i = 4; i < 8; i++) m += EAN_R[d[i]]
  return m + '101'
}

// ─── ITF-14 (Interleaved 2 of 5) ─────────────────────────────────────────────
// Los dígitos van de a pares: el primero en las barras, el segundo en los espacios.

const ITF = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn']
const ITF_ANCHO = 3 // ancho / angosto (la norma admite 2,25 a 3)

export function itf14(valor: string): string {
  if (!/^\d{14}$/.test(valor)) throw new Error(`ITF-14 necesita 14 dígitos: ${valor}`)
  const barra = (w: boolean) => '1'.repeat(w ? ITF_ANCHO : 1)
  const espacio = (w: boolean) => '0'.repeat(w ? ITF_ANCHO : 1)
  let m = '1010'
  for (let i = 0; i < valor.length; i += 2) {
    const a = ITF[+valor[i]], b = ITF[+valor[i + 1]]
    for (let k = 0; k < 5; k++) m += barra(a[k] === 'w') + espacio(b[k] === 'w')
  }
  return m + barra(true) + '0' + '1'
}

// ─── Code 128 ────────────────────────────────────────────────────────────────
// Cada símbolo: 3 barras y 3 espacios (anchos de 1 a 4 módulos), 11 módulos en total.
// El stop tiene una barra más (13 módulos).

const CODE128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]
const START_B = 104
const START_C = 105
const STOP = 106

const anchosAModulos = (anchos: string) =>
  [...anchos].map((w, i) => (i % 2 === 0 ? '1' : '0').repeat(Number(w))).join('')

/** Valores de símbolo (con start y checksum, sin stop). Exportado para las pruebas. */
export function valoresCode128(valor: string): number[] {
  const numericoPar = /^\d+$/.test(valor) && valor.length % 2 === 0 && valor.length >= 4
  const valores: number[] = []
  if (numericoPar) {
    // Subconjunto C: dos dígitos por símbolo (más corto).
    valores.push(START_C)
    for (let i = 0; i < valor.length; i += 2) valores.push(Number(valor.slice(i, i + 2)))
  } else {
    // Subconjunto B: ASCII imprimible (espacio a ~).
    valores.push(START_B)
    for (const ch of valor) {
      const c = ch.charCodeAt(0)
      if (c < 32 || c > 126) throw new Error(`Code 128 no admite el carácter «${ch}»`)
      valores.push(c - 32)
    }
  }
  let suma = valores[0]
  for (let i = 1; i < valores.length; i++) suma += valores[i] * i
  valores.push(suma % 103)
  return valores
}

export function code128(valor: string): string {
  if (!valor) throw new Error('Code 128 necesita al menos un carácter')
  return [...valoresCode128(valor), STOP].map(v => anchosAModulos(CODE128[v])).join('')
}

// ─── Entrada única ───────────────────────────────────────────────────────────

/** Codifica `valor` con el tipo indicado o el que corresponda por su forma. */
export function codificar(valor: string, tipo: TipoBarras = detectarTipo(valor)): CodigoCodificado {
  switch (tipo) {
    case 'ean13': return { tipo, valor, modulos: ean13(valor), zonaSilenciosa: 11, soporte: false }
    case 'ean8': return { tipo, valor, modulos: ean8(valor), zonaSilenciosa: 7, soporte: false }
    case 'itf14': return { tipo, valor, modulos: itf14(valor), zonaSilenciosa: 10, soporte: true }
    case 'code128': return { tipo, valor, modulos: code128(valor), zonaSilenciosa: 10, soporte: false }
  }
}

/** Barras como { x, ancho } en módulos (sin la zona silenciosa), para dibujar. */
export function barrasDe(modulos: string): { x: number; ancho: number }[] {
  const barras: { x: number; ancho: number }[] = []
  let i = 0
  while (i < modulos.length) {
    if (modulos[i] === '1') {
      let j = i
      while (j < modulos.length && modulos[j] === '1') j++
      barras.push({ x: i, ancho: j - i })
      i = j
    } else i++
  }
  return barras
}

/**
 * Casos fijos de los codificadores. Se corre en desarrollo al iniciar (ver main.tsx);
 * si algo falla lo muestra en la consola. Devuelve la cantidad de fallas.
 */
export function probarBarras(): number {
  const casos: [string, unknown, unknown][] = [
    // Dígito verificador de códigos reales conocidos.
    ['verificador 7790070012340', verificadorValido('7790070012340'), true],
    ['verificador 7790070012906', verificadorValido('7790070012906'), true],
    ['verificador 7798123456783', verificadorValido('7798123456783'), true],
    ['verificador ITF-14 17790070012347', verificadorValido('17790070012347'), true],
    ['dígito de 779007001234', digitoVerificadorGS1('779007001234'), 0],
    ['dígito de 779812345678', digitoVerificadorGS1('779812345678'), 3],
    ['dígito de 1779007001234', digitoVerificadorGS1('1779007001234'), 7],
    ['verificador inválido 7790070012341', verificadorValido('7790070012341'), false],
    // Código interno: 29 + correlativo de 10 dígitos + verificador (ver codigosInternos.ts).
    ['interno nº 1', '290000000001' + digitoVerificadorGS1('290000000001'), '2900000000018'],
    ['interno nº 2', '290000000002' + digitoVerificadorGS1('290000000002'), '2900000000025'],
    // Detección del tipo.
    ['tipo 13 dígitos', detectarTipo('7790070012340'), 'ean13'],
    ['tipo 8 dígitos', detectarTipo('96385074'), 'ean8'],
    ['tipo 14 dígitos', detectarTipo('17790070012347'), 'itf14'],
    ['tipo texto', detectarTipo('ABC-123'), 'code128'],
    // Estructura de cada símbolo.
    ['EAN-13 mide 95 módulos', ean13('7790070012340').length, 95],
    ['EAN-13 guardas', [ean13('7790070012340').slice(0, 3), ean13('7790070012340').slice(45, 50), ean13('7790070012340').slice(-3)].join(' '), '101 01010 101'],
    ['EAN-13 primer dígito 7 → paridad LGLGLG', ean13('7790070012340').slice(3, 10), EAN_L[7]],
    ['EAN-8 mide 67 módulos', ean8('96385074').length, 67],
    ['ITF-14 mide 4 + 7×18 + 5 módulos', itf14('17790070012347').length, 4 + 7 * 18 + 5],
    ['ITF-14 empieza 1010 y termina 11101', itf14('17790070012347').slice(0, 4) + ' ' + itf14('17790070012347').slice(-5), '1010 11101'],
    // Code 128: checksum de "ABC" en B = (104 + 33·1 + 34·2 + 35·3) mod 103 = 1.
    ['Code 128 B "ABC"', valoresCode128('ABC').join(','), '104,33,34,35,1'],
    ['Code 128 C "123456"', valoresCode128('123456').join(','), `105,12,34,56,${(105 + 12 + 34 * 2 + 56 * 3) % 103}`],
    ['Code 128 "ABC" mide 11×5 + 13', code128('ABC').length, 11 * 5 + 13],
  ]
  // Integridad de la tabla de Code 128: 11 módulos por símbolo y barras de ancho par.
  CODE128.forEach((p, i) => {
    const anchos = [...p].map(Number)
    const total = anchos.reduce((a, b) => a + b, 0)
    const barras = anchos.filter((_, k) => k % 2 === 0).reduce((a, b) => a + b, 0)
    if (total !== (i === STOP ? 13 : 11) || barras % 2 !== 0) casos.push([`Code 128 símbolo ${i}`, p, 'patrón válido'])
  })

  let fallas = 0
  for (const [nombre, obtenido, esperado] of casos) {
    if (obtenido !== esperado) {
      fallas++
      console.error(`probarBarras ✗ ${nombre}: dio ${String(obtenido)}, se esperaba ${String(esperado)}`)
    }
  }
  if (fallas === 0) console.info(`probarBarras ✓ ${casos.length} casos + tabla Code 128 (107 símbolos)`)
  return fallas
}
