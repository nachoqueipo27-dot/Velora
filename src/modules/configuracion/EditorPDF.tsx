import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useConfigStore, type BloqueConfig } from '../../store/configStore'
import { useNegocio } from '../../hooks/useNegocio'
import { usePDF } from '../../hooks/usePDF'
import { ListaBloques, TIPO_LABEL } from './components/ListaBloques'
import { Button } from '../../components/ui/Button'
import { PDFPresupuesto } from '../../lib/pdf/documentos/PDFPresupuesto'
import { PDFRemito } from '../../lib/pdf/documentos/PDFRemito'
import { PDFRecibo } from '../../lib/pdf/documentos/PDFRecibo'
import type { Presupuesto, ItemPresupuesto } from '../../types/presupuestos'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import type { CobroCaja } from '../../types/caja'
import { Check, Download, Save } from 'lucide-react'
import { format } from 'date-fns'

const TIPOS_PDF = ['encabezado', 'datos_negocio', 'cliente', 'fecha', 'items', 'totales', 'separador', 'texto_libre', 'pie_pagina', 'espacio_en_blanco']
const TABS = [{ id: 'presupuesto', label: 'Presupuesto' }, { id: 'remito', label: 'Remito' }, { id: 'recibo', label: 'Recibo de pago' }] as const
type TabId = typeof TABS[number]['id']

const hoy = () => new Date().toISOString()

const DEMO_PRES: Presupuesto = {
  id: 0, numero: 1, clienteId: 0, clienteNombre: 'Juan Pérez', estado: 'enviado', descripcion: 'Presupuesto de muestra',
  descuento: 10, tipoDescuento: 'porcentaje', subtotal: 5000, totalFinal: 4500, motivoRechazo: null, vigenciaDias: 7,
  fechaVigencia: hoy(), otId: null, creadoPor: 'Admin', creadoEn: hoy(), actualizadoEn: hoy(), vencido: false,
}
const DEMO_ITEMS: ItemPresupuesto[] = [
  { id: 1, presupuestoId: 0, productoId: 1, tipoItem: 'conjunto', nombre: 'Combo Hamburguesa', cantidad: 2, precioUnitario: 2500, descuentoItem: 0, subtotal: 5000 },
]
const DEMO_OT: OrdenTrabajo = {
  id: 0, numero: 1, clienteId: 0, clienteNombre: 'Juan Pérez', empleadoId: null, empleadoNombre: 'María López',
  productoId: 1, tipoItem: 'simple', productoNombre: 'Cable USB-C', descripcion: 'Reparación', estado: 'entregado',
  descuento: 0, tipoDescuento: 'porcentaje', precio: 2500, totalFinal: 2500, motivoCancelacion: null, notas: null,
  presupuestoId: null, esRecurrente: false, frecuencia: null, proximaFecha: null, garantiaDias: 30, garantiaVence: hoy(),
  creadoPor: 'Admin', creadoEn: hoy(), actualizadoEn: hoy(), etiquetas: [], diasSinMovimiento: 0,
}
const DEMO_COBRO: CobroCaja = { id: 1, fecha: hoy(), monto: 2500, formaPago: 'efectivo', concepto: 'OT #001', otId: 1, ventaPosId: null, empleadoId: null }

export const EditorPDF = () => {
  const { pdfs, guardarPDF } = useConfigStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [tab, setTab] = useState<TabId>('presupuesto')
  const [bloques, setBloques] = useState<BloqueConfig[]>([])
  const [ok, setOk] = useState(false)

  useEffect(() => { setBloques(pdfs[tab] ?? []) }, [tab, pdfs])

  const guardar = async () => { await guardarPDF(tab, bloques); setOk(true); setTimeout(() => setOk(false), 2000) }

  const descargarPrueba = () => {
    if (tab === 'presupuesto') return descargar(<PDFPresupuesto presupuesto={DEMO_PRES} items={DEMO_ITEMS} negocio={negocio} />, 'Prueba-Presupuesto.pdf')
    if (tab === 'remito') return descargar(<PDFRemito ot={DEMO_OT} negocio={negocio} fecha={format(new Date(), 'dd/MM/yyyy HH:mm')} />, 'Prueba-Remito.pdf')
    return descargar(<PDFRecibo cobro={DEMO_COBRO} negocio={negocio} otNumero={1} clienteNombre="Juan Pérez" />, 'Prueba-Recibo.pdf')
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Editor de PDFs</h2>
          <p className="text-[12px] text-[#606060]">Configurá los bloques de cada documento.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={descargarPrueba} disabled={generando}><Download size={14} className="mr-1.5" />{generando ? '...' : 'PDF de prueba'}</Button>
          <Button size="sm" onClick={guardar}>{ok ? <><Check size={14} className="mr-1.5" />Guardado</> : <><Save size={14} className="mr-1.5" />Guardar</>}</Button>
        </div>
      </header>

      <div className="flex gap-1 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 text-[13px] -mb-px border-b-2 transition-all',
              tab === t.id ? 'border-white text-white light:border-black light:text-black' : 'border-transparent text-[#606060] hover:text-[#A0A0A0]')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <ListaBloques bloques={bloques} onChange={setBloques} tiposDisponibles={TIPOS_PDF} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2">Vista previa</span>
          <div className="bg-white text-black rounded-card shadow-lg p-6 flex flex-col gap-2 min-h-[300px]">
            {bloques.filter(b => b.activo).map(b => (
              <div key={b.id} className="text-[11px]">
                {b.tipo === 'encabezado' && <div className="flex justify-between items-center border-b border-[#E4E4E4] pb-2"><span className={cn('text-[15px]', b.negrita && 'font-bold')}>{negocio.nombre || 'Mi Negocio'}</span><span className="text-[#888] uppercase tracking-wider">{tab}</span></div>}
                {b.tipo === 'datos_negocio' && <div className="text-[#888]">{negocio.direccion || 'Dirección'} · {negocio.telefono || 'Tel'}</div>}
                {b.tipo === 'cliente' && <div><span className="text-[#888]">Cliente:</span> Juan Pérez</div>}
                {b.tipo === 'fecha' && <div className="text-[#888]">Fecha: {new Date().toLocaleDateString('es-AR')}</div>}
                {b.tipo === 'items' && <div className="border-y border-[#E4E4E4] py-1.5 flex justify-between"><span>2× Combo Hamburguesa</span><span>$5.000</span></div>}
                {b.tipo === 'totales' && <div className={cn('flex justify-between', b.negrita && 'font-bold')}><span>Total</span><span>$4.500</span></div>}
                {b.tipo === 'separador' && <div className="border-b border-dashed border-[#CCC]" />}
                {b.tipo === 'texto_libre' && <div>{b.texto || '(texto libre)'}</div>}
                {b.tipo === 'pie_pagina' && <div className={cn('text-center text-[#888] mt-2', b.negrita && 'font-bold')}>{b.texto || 'Gracias por confiar en nosotros.'}</div>}
                {b.tipo === 'espacio_en_blanco' && <div className="h-3" />}
                {!Object.keys(TIPO_LABEL).includes(b.tipo) && <div>{b.tipo}</div>}
              </div>
            ))}
            {bloques.filter(b => b.activo).length === 0 && <span className="text-[#888] text-[12px]">(sin bloques activos)</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
