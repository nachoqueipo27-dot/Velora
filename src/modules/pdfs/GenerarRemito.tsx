import { useEffect, useState } from 'react'
import { useOTStore } from '../../store/otStore'
import { useNegocio } from '../../hooks/useNegocio'
import { usePDF } from '../../hooks/usePDF'
import { Button } from '../../components/ui/Button'
import { EstadoBadgeOT } from '../ordenes-trabajo/components/EstadoBadgeOT'
import { PDFRemito } from '../../lib/pdf/documentos/PDFRemito'
import { Layout, ResumenRow, Placeholder } from './GenerarOT'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import { Download, Check } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const GenerarRemito = () => {
  const { ots, cargarOTs } = useOTStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<OrdenTrabajo | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => { cargarOTs() }, [cargarOTs])

  const entregables = ots.filter(o => o.estado === 'entregado' || o.estado === 'finalizado')
  const filtradas = entregables.filter(o =>
    String(o.numero).padStart(3, '0').includes(q.trim()) ||
    o.clienteNombre.toLowerCase().includes(q.trim().toLowerCase()))

  const generar = async () => {
    if (!sel) return
    const r = await descargar(
      <PDFRemito ot={sel} negocio={negocio} fecha={format(new Date(), 'dd/MM/yyyy HH:mm')} />,
      `Remito-${String(sel.numero).padStart(3, '0')}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <Layout
      titulo="Remito de entrega" subtitulo="OTs entregadas o finalizadas" q={q} setQ={setQ}
      lista={filtradas.map(o => ({
        id: o.id, activo: sel?.id === o.id, onClick: () => setSel(o),
        principal: `OT #${String(o.numero).padStart(3, '0')}`, secundario: o.clienteNombre,
        extra: <EstadoBadgeOT estado={o.estado} />,
      }))}
      vacio={entregables.length === 0 ? 'No hay OTs entregadas o finalizadas' : 'Sin resultados'}
    >
      {sel ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white light:text-black mb-1">Remito · OT #{String(sel.numero).padStart(3, '0')}</h3>
            <p className="text-[12px] text-[#606060]">{sel.clienteNombre}</p>
          </div>
          <ResumenRow label="Producto entregado" value={sel.productoNombre} />
          <ResumenRow label="Valor" value={money(sel.totalFinal)} fuerte />
          <Button onClick={generar} disabled={generando} className="self-start mt-2">
            {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
          </Button>
        </div>
      ) : <Placeholder />}
    </Layout>
  )
}
