import { useEffect, useState } from 'react'
import { usePresupuestosStore } from '../../store/presupuestosStore'
import { useNegocio } from '../../hooks/useNegocio'
import { usePDF } from '../../hooks/usePDF'
import { Button } from '../../components/ui/Button'
import { EstadoBadge } from '../presupuestos/components/EstadoBadge'
import { PDFPresupuesto } from '../../lib/pdf/documentos/PDFPresupuesto'
import { Layout, ResumenRow, Placeholder } from './GenerarOT'
import type { Presupuesto } from '../../types/presupuestos'
import { Download, Check } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const GenerarPresupuesto = () => {
  const { presupuestos, items, cargarPresupuestos, cargarItems } = usePresupuestosStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Presupuesto | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => { cargarPresupuestos() }, [cargarPresupuestos])

  const seleccionar = (p: Presupuesto) => { setSel(p); cargarItems(p.id) }

  const filtrados = presupuestos.filter(p =>
    String(p.numero).padStart(3, '0').includes(q.trim()) ||
    p.clienteNombre.toLowerCase().includes(q.trim().toLowerCase()))

  const generar = async () => {
    if (!sel) return
    const r = await descargar(
      <PDFPresupuesto presupuesto={sel} items={items} negocio={negocio} />,
      `Presupuesto-${String(sel.numero).padStart(3, '0')}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <Layout
      titulo="Presupuesto" subtitulo="Generá el PDF de un presupuesto" q={q} setQ={setQ}
      lista={filtrados.map(p => ({
        id: p.id, activo: sel?.id === p.id, onClick: () => seleccionar(p),
        principal: `Presupuesto #${String(p.numero).padStart(3, '0')}`, secundario: p.clienteNombre,
        extra: <EstadoBadge estado={p.estado} />,
      }))}
      vacio={presupuestos.length === 0 ? 'No hay presupuestos' : 'Sin resultados'}
    >
      {sel ? (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white light:text-black">Presupuesto #{String(sel.numero).padStart(3, '0')}</h3>
              <EstadoBadge estado={sel.estado} />
            </div>
            <p className="text-[12px] text-[#606060]">{sel.clienteNombre} · creado {format(new Date(sel.creadoEn), 'dd/MM/yyyy')}</p>
          </div>
          <ResumenRow label="Items" value={String(items.length)} />
          <ResumenRow label="Subtotal" value={money(sel.subtotal)} />
          {sel.descuento > 0 && <ResumenRow label="Descuento" value={sel.tipoDescuento === 'porcentaje' ? `${sel.descuento}%` : money(sel.descuento)} />}
          <ResumenRow label="Total final" value={money(sel.totalFinal)} fuerte />
          <Button onClick={generar} disabled={generando} className="self-start mt-2">
            {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
          </Button>
        </div>
      ) : <Placeholder />}
    </Layout>
  )
}
