import { useEffect, useState, type FormEvent } from 'react'
import { useCapturaEscaneo } from '../../../lib/escaneo'
import { toast } from '../../../store/toastStore'
import type { FilaRecepcion } from '../../../store/recepcionStore'
import { UNIDAD_ABREVIADA, permiteDecimales } from '../../../types/inventario'

const campo = 'h-[42px] w-full rounded-control border border-borde-fuerte bg-superficie px-3 text-seccion text-texto outline-none focus:border-texto'
const num = (v: string) => Number(v.replace(',', '.')) || 0

/** Marcar unidades dañadas o vencidas: no entran al stock y quedan "para devolver". */
export const DialogoProblema = ({ fila, onCerrar, onGuardar }: {
  fila: FilaRecepcion
  onCerrar: () => void
  onGuardar: (datos: { danado: number; vencido: number; nota: string }) => void
}) => {
  const [danado, setDanado] = useState(String(fila.danado || ''))
  const [vencido, setVencido] = useState(String(fila.vencido || ''))
  const [nota, setNota] = useState(fila.notaProblema)
  const [error, setError] = useState<string | null>(null)
  const unidad = permiteDecimales(fila.unidadMedida) ? ` ${UNIDAD_ABREVIADA[fila.unidadMedida]}` : ''

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  useCapturaEscaneo(true, () => toast.info('Terminá este paso antes de escanear otro producto'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const d = num(danado), v = num(vencido)
    if (d < 0 || v < 0) { setError('Las cantidades no pueden ser negativas'); return }
    if (d + v > fila.recibidoAhora) { setError(`No pueden ser más que lo que llegó ahora (${fila.recibidoAhora}${unidad})`); return }
    onGuardar({ danado: d, vencido: v, nota })
  }

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <form role="dialog" aria-modal="true" onSubmit={submit}
        className="flex w-[420px] max-w-full flex-col gap-4 rounded-panel border border-borde bg-superficie p-6 text-cuerpo text-texto">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">Ítems con problema</div>
          <h2 className="mt-1 text-titulo font-semibold">{fila.nombre}</h2>
          <p className="mt-1 text-[13px] text-texto-2">
            Llegaron {fila.recibidoAhora}{unidad}. Lo dañado o vencido no entra al stock y queda en la recepción como «para devolver».
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Dañados
            <input value={danado} onChange={e => { setDanado(e.target.value); setError(null) }} inputMode="decimal" placeholder="0" autoFocus className={campo} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Vencidos
            <input value={vencido} onChange={e => { setVencido(e.target.value); setError(null) }} inputMode="decimal" placeholder="0" className={campo} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Nota (opcional)
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej.: envase roto, vence 10/12" className={campo} />
        </label>
        {error && <span className="text-[12px] text-error">{error}</span>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="h-10 rounded-pastilla border border-borde-fuerte px-4 hover:bg-superficie-suave">Cancelar</button>
          <button type="submit" className="h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90">Guardar</button>
        </div>
      </form>
    </div>
  )
}
