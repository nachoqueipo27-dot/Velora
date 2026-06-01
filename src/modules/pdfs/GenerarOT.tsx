import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useOTStore } from '../../store/otStore'
import { useNegocio } from '../../hooks/useNegocio'
import { usePDF } from '../../hooks/usePDF'
import { Button } from '../../components/ui/Button'
import { EstadoBadgeOT } from '../ordenes-trabajo/components/EstadoBadgeOT'
import { PDFOrdenTrabajo } from '../../lib/pdf/documentos/PDFOrdenTrabajo'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import { Search, Download, Check } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const GenerarOT = () => {
  const { ots, cargarOTs } = useOTStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<OrdenTrabajo | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => { cargarOTs() }, [cargarOTs])

  const filtradas = ots.filter(o =>
    String(o.numero).padStart(3, '0').includes(q.trim()) ||
    o.clienteNombre.toLowerCase().includes(q.trim().toLowerCase()) ||
    o.productoNombre.toLowerCase().includes(q.trim().toLowerCase()))

  const generar = async () => {
    if (!sel) return
    const r = await descargar(
      <PDFOrdenTrabajo ot={sel} negocio={negocio} fecha={format(new Date(), 'dd/MM/yyyy HH:mm')} />,
      `OT-${String(sel.numero).padStart(3, '0')}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <Layout
      titulo="Orden de trabajo"
      subtitulo="Generá el PDF de una OT existente"
      q={q} setQ={setQ}
      lista={filtradas.map(o => ({
        id: o.id, activo: sel?.id === o.id, onClick: () => setSel(o),
        principal: `OT #${String(o.numero).padStart(3, '0')}`, secundario: o.clienteNombre,
        extra: <EstadoBadgeOT estado={o.estado} />,
      }))}
      vacio={ots.length === 0 ? 'No hay órdenes de trabajo' : 'Sin resultados'}
    >
      {sel ? (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white light:text-black">OT #{String(sel.numero).padStart(3, '0')}</h3>
              <EstadoBadgeOT estado={sel.estado} />
            </div>
            <p className="text-[12px] text-[#606060]">{sel.clienteNombre} · {format(new Date(sel.creadoEn), 'dd/MM/yyyy')}</p>
          </div>
          <ResumenRow label="Producto" value={sel.productoNombre} />
          <ResumenRow label="Tipo" value={sel.tipoItem === 'conjunto' ? 'Conjunto' : 'Simple'} />
          {sel.empleadoNombre && <ResumenRow label="Responsable" value={sel.empleadoNombre} />}
          <ResumenRow label="Total" value={money(sel.totalFinal)} fuerte />
          <Button onClick={generar} disabled={generando} className="self-start mt-2">
            {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
          </Button>
        </div>
      ) : <Placeholder />}
    </Layout>
  )
}

// ─── UI compartida de los generadores ──────────────────────────

export interface ItemLista {
  id: number
  activo: boolean
  onClick: () => void
  principal: string
  secundario: string
  extra?: React.ReactNode
}

export const Layout = ({ titulo, subtitulo, q, setQ, lista, vacio, children }: {
  titulo: string; subtitulo: string; q: string; setQ: (v: string) => void
  lista: ItemLista[]; vacio: string; children: React.ReactNode
}) => (
  <div className="flex h-full gap-5 overflow-hidden">
    <div className="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
      <div>
        <h2 className="text-lg font-semibold text-white light:text-black">{titulo}</h2>
        <p className="text-[12px] text-[#606060]">{subtitulo}</p>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número o cliente"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#606060] px-1 py-4 text-center">{vacio}</p>
        ) : lista.map(it => (
          <button key={it.id} onClick={it.onClick}
            className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-input border text-left transition-all',
              it.activo
                ? 'border-white bg-white/[0.04] light:border-black light:bg-black/[0.03]'
                : 'border-transparent hover:bg-white/[0.03] light:hover:bg-black/[0.02]')}>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-white light:text-black truncate">{it.principal}</span>
              <span className="block text-[11px] text-[#606060] truncate">{it.secundario}</span>
            </span>
            {it.extra}
          </button>
        ))}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-5">
      {children}
    </div>
  </div>
)

export const ResumenRow = ({ label, value, fuerte }: { label: string; value: string; fuerte?: boolean }) => (
  <div className="flex items-center justify-between border-b border-[#1C1C1C] light:border-[#F0F0F0] pb-2">
    <span className="text-[12px] text-[#606060]">{label}</span>
    <span className={cn(fuerte ? 'text-base font-bold' : 'text-[13px]', 'text-white light:text-black')}>{value}</span>
  </div>
)

export const Placeholder = () => (
  <div className="h-full flex items-center justify-center">
    <p className="text-[13px] text-[#606060]">Seleccioná un documento de la lista para generar el PDF.</p>
  </div>
)
