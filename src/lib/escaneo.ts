import { useEffect, useRef } from 'react'
import type { ModuleId } from '../store/navigationStore'
import type { ResultadoCodigo } from './codigos'

// Bus del lector de códigos.
// useLectorCodigos (montado una vez en Layout) detecta el escaneo, busca el código y emite
// el evento `codigo-escaneado` en window con { codigo, modulo, resultado }.
//
// Quién lo atiende:
//  1. Una "captura" activa (un formulario abierto que quiere el código, ej. Códigos del
//     producto): recibe solo el código y nadie más actúa.
//  2. Si no, la pantalla activa, si registró su manejador (Punto de venta, Inventario).
//  3. Si no, el aviso flotante global (AvisoEscaneo).

export const EVENTO_ESCANEO = 'codigo-escaneado'

export interface EventoEscaneo {
  codigo: string
  /** Pantalla activa al escanear (navigationStore). */
  modulo: ModuleId
  /** Producto encontrado, o null si el código no está registrado. */
  resultado: ResultadoCodigo | null
}

export function emitirEscaneo(evento: EventoEscaneo): void {
  window.dispatchEvent(new CustomEvent<EventoEscaneo>(EVENTO_ESCANEO, { detail: evento }))
}

function escuchar(fn: (e: EventoEscaneo) => void): () => void {
  const h = (ev: Event) => fn((ev as CustomEvent<EventoEscaneo>).detail)
  window.addEventListener(EVENTO_ESCANEO, h)
  return () => window.removeEventListener(EVENTO_ESCANEO, h)
}

// ─── Capturas ────────────────────────────────────────────────────────────────

const capturas: ((codigo: string) => void)[] = []

/** La última captura registrada (la del formulario abierto más arriba), si hay. */
export function capturaActiva(): ((codigo: string) => void) | undefined {
  return capturas[capturas.length - 1]
}

/** Mientras `activo`, los escaneos van a `fn` y no a la pantalla. */
export function useCapturaEscaneo(activo: boolean, fn: (codigo: string) => void): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!activo) return
    const captura = (codigo: string) => ref.current(codigo)
    capturas.push(captura)
    return () => { const i = capturas.lastIndexOf(captura); if (i >= 0) capturas.splice(i, 1) }
  }, [activo])
}

// ─── Manejadores por pantalla ────────────────────────────────────────────────

const conManejador = new Map<ModuleId, number>()

/** true si la pantalla atiende sus propios escaneos (entonces el aviso global no actúa). */
export function moduloTieneManejador(modulo: ModuleId): boolean {
  return (conManejador.get(modulo) ?? 0) > 0
}

/** La pantalla `modulo` atiende los escaneos que ocurren mientras está activa. */
export function useEscaneoEnModulo(modulo: ModuleId, fn: (e: EventoEscaneo) => void): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    conManejador.set(modulo, (conManejador.get(modulo) ?? 0) + 1)
    const quitar = escuchar(e => { if (e.modulo === modulo) ref.current(e) })
    return () => {
      quitar()
      conManejador.set(modulo, Math.max(0, (conManejador.get(modulo) ?? 1) - 1))
    }
  }, [modulo])
}

/** Escaneos de las pantallas sin manejador propio (para el aviso flotante). */
export function useEscaneoSinManejador(fn: (e: EventoEscaneo) => void): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => escuchar(e => { if (!moduloTieneManejador(e.modulo)) ref.current(e) }), [])
}
