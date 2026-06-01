import { useEffect, useState } from 'react'
import { getDb } from '../../db'
import { useNegocio } from '../../hooks/useNegocio'
import { usePDF } from '../../hooks/usePDF'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PDFRecibo } from '../../lib/pdf/documentos/PDFRecibo'
import { Layout, ResumenRow, Placeholder } from './GenerarOT'
import type { CobroCaja, FormaPago } from '../../types/caja'
import { Download, Check } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const FORMA_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }

export const GenerarRecibo = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [cobros, setCobros] = useState<CobroCaja[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<CobroCaja | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    (async () => {
      const db = await getDb()
      const rows = await db.select<any[]>('SELECT * FROM cobros_caja ORDER BY id DESC LIMIT 200')
      setCobros(rows.map(r => ({
        id: r.id, fecha: r.fecha, monto: r.monto, formaPago: r.forma_pago as FormaPago,
        concepto: r.concepto ?? null, otId: r.ot_id ?? null, ventaPosId: r.venta_pos_id ?? null,
        empleadoId: r.empleado_id ?? null,
      })))
    })()
  }, [])

  const filtrados = cobros.filter(c =>
    (c.concepto ?? '').toLowerCase().includes(q.trim().toLowerCase()) ||
    format(new Date(c.fecha), 'dd/MM/yyyy').includes(q.trim()))

  const generar = async () => {
    if (!sel) return
    const r = await descargar(
      <PDFRecibo cobro={sel} negocio={negocio} clienteNombre={undefined} />,
      `Recibo-${String(sel.id).padStart(3, '0')}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <Layout
      titulo="Recibo de pago" subtitulo="Generá el recibo de un cobro" q={q} setQ={setQ}
      lista={filtrados.map(c => ({
        id: c.id, activo: sel?.id === c.id, onClick: () => setSel(c),
        principal: c.concepto || `Cobro #${String(c.id).padStart(3, '0')}`,
        secundario: format(new Date(c.fecha), 'dd/MM/yyyy HH:mm'),
        extra: <span className="text-[13px] font-semibold text-[#4CAF7D] tabular-nums">{money(c.monto)}</span>,
      }))}
      vacio={cobros.length === 0 ? 'No hay cobros registrados' : 'Sin resultados'}
    >
      {sel ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white light:text-black mb-1">Recibo #{String(sel.id).padStart(3, '0')}</h3>
            <p className="text-[12px] text-[#606060]">{format(new Date(sel.fecha), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <ResumenRow label="Concepto" value={sel.concepto || 'Pago'} />
          <div className="flex items-center justify-between border-b border-[#1C1C1C] light:border-[#F0F0F0] pb-2">
            <span className="text-[12px] text-[#606060]">Forma de pago</span>
            <Badge label={FORMA_LABEL[sel.formaPago] ?? sel.formaPago} variant="info" />
          </div>
          <ResumenRow label="Total recibido" value={money(sel.monto)} fuerte />
          <Button onClick={generar} disabled={generando} className="self-start mt-2">
            {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
          </Button>
        </div>
      ) : <Placeholder />}
    </Layout>
  )
}
