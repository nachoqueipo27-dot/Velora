import { useState } from 'react'
import { cn } from '../../../lib/utils'
import { useCapturaEscaneo } from '../../../lib/escaneo'
import { codigoEnUso, normalizarCodigo, avisarSiVerificadorInvalido, type CodigoProducto } from '../../../lib/codigos'
import { Plus, X } from 'lucide-react'
import { CodigoBarras } from '../../../components/barras/CodigoBarras'
import { esCodigoDeBalanza, generarCodigoInterno, PREFIJO_BALANZA } from '../../../lib/codigosInternos'
import { detectarTipo } from '../../../lib/barras'

interface SeccionCodigosProps {
  /** Producto que se edita (null si es nuevo): sus propios códigos no cuentan como "en uso". */
  productoId: number | null
  value: CodigoProducto[]
  onChange: (codigos: CodigoProducto[]) => void
  disabled?: boolean
}

/** Códigos de barras del producto: agregar, quitar y marcar como pack. */
export const SeccionCodigos = ({ productoId, value, onChange, disabled }: SeccionCodigosProps) => {
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const agregar = async (texto = nuevo) => {
    const codigo = normalizarCodigo(texto)
    if (!codigo || disabled) return
    if (value.some(c => c.codigo === codigo)) { setError('Ese código ya está en la lista.'); return }
    if (esCodigoDeBalanza(codigo)) { setError(`Los códigos que empiezan con ${PREFIJO_BALANZA} quedan reservados para la balanza.`); return }
    setVerificando(true)
    try {
      const otro = await codigoEnUso(codigo, productoId)
      if (otro) { setError(`Ya lo usa «${otro.nombre}».`); return }
      avisarSiVerificadorInvalido(codigo)
      onChange([...value, { codigo, tipo: 'unidad', unidadesPorPack: 1 }])
      setNuevo(''); setError(null)
    } finally {
      setVerificando(false)
    }
  }

  // Con el formulario abierto, lo que se escanea se suma acá (no abre otra pantalla).
  useCapturaEscaneo(!disabled, codigo => { void agregar(codigo) })

  const cambiar = (codigo: string, patch: Partial<CodigoProducto>) =>
    onChange(value.map(c => (c.codigo === codigo ? { ...c, ...patch } : c)))
  const quitar = (codigo: string) => onChange(value.filter(c => c.codigo !== codigo))

  return (
    <div className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-superficie p-3 text-cuerpo text-texto">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">Códigos</span>
        <span className="text-etiqueta uppercase text-texto-3">{value.length} cargado{value.length === 1 ? '' : 's'}</span>
      </div>
      <p className="text-[12px] text-texto-3 -mt-1">
        Un producto puede tener varios códigos. Marcá «Pack» si el código es de una caja: al escanearlo suma esas unidades.
      </p>

      {value.map(c => (
        <div key={c.codigo} className="flex flex-col gap-1.5 rounded-control border border-borde px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 truncate font-mono text-[13px]">{c.codigo}</span>
          <div className="flex rounded-control bg-superficie-suave p-0.5">
            {(['unidad', 'pack'] as const).map(t => (
              <button key={t} type="button" disabled={disabled}
                onClick={() => cambiar(c.codigo, { tipo: t, unidadesPorPack: t === 'pack' ? Math.max(2, c.unidadesPorPack) : 1 })}
                className={cn('px-2 py-0.5 rounded-[7px] text-[12px] transition-colors',
                  c.tipo === t ? 'bg-superficie text-texto shadow-sm' : 'text-texto-2 hover:text-texto')}>
                {t === 'unidad' ? 'Unidad' : 'Pack'}
              </button>
            ))}
          </div>
          {c.tipo === 'pack' && (
            <label className="flex items-center gap-1 text-[12px] text-texto-2">
              ×
              <input type="number" min={1} step="any" value={c.unidadesPorPack} disabled={disabled}
                onChange={e => cambiar(c.codigo, { unidadesPorPack: Number(e.target.value) || 0 })}
                aria-label={`Unidades del pack ${c.codigo}`}
                className="w-16 rounded-control border border-borde bg-superficie px-2 py-0.5 font-mono text-[13px] text-texto outline-none focus:border-texto" />
              u.
            </label>
          )}
          <button type="button" onClick={() => quitar(c.codigo)} disabled={disabled} aria-label={`Quitar ${c.codigo}`}
            className="p-1 rounded-control text-texto-3 hover:text-error hover:bg-error/10">
            <X size={14} />
          </button>
        </div>
        <CodigoBarras valor={c.codigo} alto={36} modulo={detectarTipo(c.codigo) === 'itf14' ? 1.2 : 1.5} />
        </div>
      ))}

      <div className="flex gap-2">
        <input value={nuevo} disabled={disabled}
          onChange={e => { setNuevo(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void agregar() } }}
          placeholder="Escaneá o escribí un código"
          className="flex-1 min-w-0 rounded-control border border-borde bg-superficie px-3 py-1.5 font-mono text-[13px] text-texto outline-none placeholder:font-sans placeholder:text-texto-3 focus:border-texto" />
        <button type="button" onClick={() => void agregar()} disabled={disabled || verificando || !nuevo.trim()}
          className="inline-flex items-center gap-1 rounded-pastilla bg-texto px-3 text-[12px] font-medium text-superficie disabled:opacity-40">
          <Plus size={13} /> Agregar
        </button>
      </div>
      {error && <span className="text-[12px] text-error" role="alert">{error}</span>}
      {value.length === 0 && !disabled && (
        <button type="button" disabled={verificando}
          onClick={async () => {
            setVerificando(true)
            try {
              const codigo = await generarCodigoInterno()
              onChange([...value, { codigo, tipo: 'unidad', unidadesPorPack: 1 }])
              setError(null)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo generar el código')
            } finally { setVerificando(false) }
          }}
          className="self-start text-[12px] font-medium text-acento-texto underline-offset-2 hover:underline">
          ¿No tiene código? Generar código interno (29…)
        </button>
      )}
    </div>
  )
}
