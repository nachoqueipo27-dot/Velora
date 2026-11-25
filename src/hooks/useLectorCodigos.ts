import { useEffect } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { useEscaneoStore } from '../store/escaneoStore'
import { buscarPorCodigo, normalizarCodigo } from '../lib/codigos'
import { capturaActiva, emitirEscaneo } from '../lib/escaneo'
import { sonarDesconocido, sonarEncontrado } from '../lib/sonidos'

// Lector de códigos global (se monta una vez en Layout).
//
// Un lector USB "teclea" el código muy rápido y termina con Enter. Se reconoce así:
// 4 o más caracteres con menos de 30 ms entre uno y otro, y Enter enseguida.
// Funciona sin hacer clic en ningún campo. Si el foco está en un input de texto, el
// escaneo NO queda escrito ahí: desde el 2º carácter rápido se intercepta, y al confirmar
// el escaneo el input vuelve al valor que tenía antes del 1º. Si no era un escaneo (alguien
// tecleó dos letras muy rápido), lo interceptado se vuelve a escribir.

const ENTRE_TECLAS_MS = 30
const ENTER_MS = 50       // margen para el Enter final (algunos lectores tardan un poco más)
const FIN_RAFAGA_MS = 100 // sin teclas por este tiempo y sin Enter: no era un escaneo
const MIN_CARACTERES = 4

type Editable = HTMLInputElement | HTMLTextAreaElement

function campoEditable(el: Element | null): Editable | null {
  if (el instanceof HTMLTextAreaElement && !el.readOnly && !el.disabled) return el
  if (el instanceof HTMLInputElement && !el.readOnly && !el.disabled &&
      ['text', 'search', 'tel', 'url', 'email', 'password', 'number', ''].includes(el.type)) return el
  return null
}

/** Cambia el valor de un input controlado por React y avisa el cambio (onChange). */
function fijarValor(el: Editable, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertarTexto(el: Editable, texto: string) {
  try {
    el.setRangeText(texto, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  } catch {
    fijarValor(el, el.value + texto) // inputs sin selección (number, email)
  }
}

async function procesarEscaneo(codigoCrudo: string) {
  const codigo = normalizarCodigo(codigoCrudo)
  if (!codigo) return

  // Un formulario abierto que quiere el código (ej. Códigos del producto).
  const captura = capturaActiva()
  if (captura) { captura(codigo); return }

  const modulo = useNavigationStore.getState().activeModule
  let resultado = null
  try {
    resultado = await buscarPorCodigo(codigo)
  } catch (e) {
    console.error('buscarPorCodigo', e)
  }
  if (useEscaneoStore.getState().config.sonido) {
    if (resultado) sonarEncontrado()
    else sonarDesconocido()
  }
  emitirEscaneo({ codigo, modulo, resultado })
}

export function useLectorCodigos(): void {
  useEffect(() => {
    let rafaga = ''
    let ultimo = 0
    let campo: Editable | null = null
    let valorAntes: string | null = null
    let interceptado = ''
    let temporizador: ReturnType<typeof setTimeout> | undefined

    const limpiar = () => {
      rafaga = ''; campo = null; valorAntes = null; interceptado = ''
      clearTimeout(temporizador)
    }
    // No era un escaneo: lo interceptado vuelve al input donde iba.
    const descartar = () => {
      if (campo && interceptado) insertarTexto(campo, interceptado)
      limpiar()
    }
    const programarFin = () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(descartar, FIN_RAFAGA_MS)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Los lectores mandan Shift para las mayúsculas: las teclas modificadoras solas no cortan la ráfaga.
      if (e.key === 'Shift' || e.key === 'CapsLock') return
      if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) { descartar(); return }
      const ahora = performance.now()
      const pausa = ahora - ultimo

      if (e.key === 'Enter') {
        if (rafaga.length >= MIN_CARACTERES && pausa <= ENTER_MS) {
          // Es un escaneo: que el Enter no llegue a la pantalla y el input quede como estaba.
          e.preventDefault()
          e.stopImmediatePropagation()
          if (campo && valorAntes !== null) fijarValor(campo, valorAntes)
          const codigo = rafaga
          limpiar()
          void procesarEscaneo(codigo)
        } else {
          descartar()
        }
        return
      }

      if (e.key.length !== 1) { descartar(); return }

      if (rafaga.length > 0 && pausa < ENTRE_TECLAS_MS) {
        // Sigue la ráfaga: desde el 2º carácter rápido no se escribe en el input.
        rafaga += e.key
        if (campo) { e.preventDefault(); interceptado += e.key }
      } else {
        // Empieza una ráfaga nueva (el 1º carácter sí se escribe: todavía no sabemos si es escaneo).
        descartar()
        rafaga = e.key
        campo = campoEditable(document.activeElement)
        valorAntes = campo ? campo.value : null
      }
      ultimo = ahora
      programarFin()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      clearTimeout(temporizador)
    }
  }, [])
}
