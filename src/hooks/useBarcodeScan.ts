import { useEffect, useRef } from 'react'

interface UseBarcodeOptions {
  onScan: (code: string) => void
  minLength?: number
  timeout?: number
}

export function useBarcodeScan({ onScan, minLength = 4, timeout = 100 }: UseBarcodeOptions) {
  const buffer = useRef('')
  const timer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input/textarea/select editable
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current)
        }
        buffer.current = ''
        return
      }
      if (e.key.length === 1) {
        buffer.current += e.key
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          buffer.current = ''
        }, timeout)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onScan, minLength, timeout])
}
