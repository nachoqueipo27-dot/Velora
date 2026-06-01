import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore } from '../../store/cajaStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { PDFCierreMes } from '../../lib/pdf/documentos/PDFCierreMes'
import { MESES, type CierreMes as TCierreMes, type ResumenMes } from '../../types/caja'
import { Calculator, Lock, FileDown, TrendingUp, TrendingDown, CheckCircle2, XCircle, Package, Award } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

const ahora = new Date()
const ANIOS = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i)

export const CierreMes = () => {
  const { cierresMes, cargarCierresMes, calcularResumenMes, cerrarMes, mesYaCerrado } = useCajaStore()
  const negocio = useNegocio()
  const { descargar } = usePDF()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth() + 1)
  const [resumen, setResumen] = useState<ResumenMes | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => { cargarCierresMes() }, [cargarCierresMes])
  useEffect(() => { setResumen(null) }, [anio, mes])

  const yaCerrado = mesYaCerrado(anio, mes)
  const cierreExistente = cierresMes.find(c => c.anio === anio && c.mes === mes)

  const calcular = async () => {
    setCalculando(true)
    setResumen(await calcularResumenMes(anio, mes))
    setCalculando(false)
  }

  const confirmarCierre = async () => {
    setCerrando(true)
    const cierre = await cerrarMes(anio, mes)
    setCerrando(false)
    setConfirmar(false)
    if (cierre) {
      await descargarCierre(cierre)
    }
  }

  const descargarCierre = (c: TCierreMes) =>
    descargar(<PDFCierreMes cierre={c} negocio={negocio} />, `CierreMes-${c.anio}-${String(c.mes).padStart(2, '0')}.pdf`)

  const datos = cierreExistente
    ? { totalIngresos: cierreExistente.totalIngresos, totalGastos: cierreExistente.totalGastos, margenOperativo: cierreExistente.margenOperativo,
        otsCompletadas: cierreExistente.otsCompletadas, otsCanceladas: cierreExistente.otsCanceladas,
        productoMasVendido: cierreExistente.productoMasVendido, empleadoDestacado: cierreExistente.empleadoDestacado }
    : resumen

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-1 max-w-3xl">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Cierre de mes</h2>
        <p className="text-[12px] text-[#606060]">Consolidado mensual de ingresos, gastos y operaciones</p>
      </header>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Año</label>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
            {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {!yaCerrado && (
          <Button variant="secondary" size="sm" onClick={calcular} disabled={calculando}>
            <Calculator size={14} className="mr-1.5" />{calculando ? 'Calculando...' : 'Calcular resumen'}
          </Button>
        )}
        {yaCerrado && <Badge label={`Cerrado — ${cierreExistente ? new Date(cierreExistente.creadoEn).toLocaleDateString('es-AR') : ''}`} variant="success" className="mb-1.5" />}
      </div>

      {datos && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Ingresos" value={money(datos.totalIngresos)} tono="verde" icon={<TrendingUp size={15} />} />
            <Metric label="Gastos" value={money(datos.totalGastos)} tono="rojo" icon={<TrendingDown size={15} />} />
            <Metric label="Margen operativo" value={money(datos.margenOperativo)} tono={datos.margenOperativo >= 0 ? 'verde' : 'rojo'} icon={<Calculator size={15} />} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="OTs completadas" value={String(datos.otsCompletadas)} tono="neutro" icon={<CheckCircle2 size={15} className="text-[#4CAF7D]" />} />
            <Metric label="OTs canceladas" value={String(datos.otsCanceladas)} tono="neutro" icon={<XCircle size={15} className="text-[#C0392B]" />} />
            <Metric label="Producto más vendido" value={datos.productoMasVendido ?? '—'} tono="neutro" icon={<Package size={15} />} />
            <Metric label="Empleado destacado" value={datos.empleadoDestacado ?? '—'} tono="neutro" icon={<Award size={15} />} />
          </div>

          <div className="flex justify-end gap-2">
            {yaCerrado ? (
              <Button variant="secondary" onClick={() => cierreExistente && descargarCierre(cierreExistente)}>
                <FileDown size={14} className="mr-1.5" />Descargar PDF
              </Button>
            ) : (
              <Button onClick={() => setConfirmar(true)}><Lock size={14} className="mr-1.5" />Cerrar mes</Button>
            )}
          </div>
        </>
      )}

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Cerrar mes" maxWidth="max-w-md"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmar(false)} disabled={cerrando}>Cancelar</Button>
          <Button onClick={confirmarCierre} disabled={cerrando}>{cerrando ? 'Cerrando...' : 'Cerrar mes'}</Button>
        </>}>
        <div className="flex flex-col gap-2 pb-1">
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">
            ¿Cerrar el mes <span className="text-white light:text-black">{MESES[mes - 1]} {anio}</span>?
          </p>
          <p className="text-[12px] text-[#D4921A]">Los registros del período quedarán bloqueados.</p>
        </div>
      </Modal>
    </div>
  )
}

interface MetricProps { label: string; value: string; tono: 'verde' | 'rojo' | 'neutro'; icon: React.ReactNode }
const Metric = ({ label, value, tono, icon }: MetricProps) => (
  <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4 flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wider text-[#606060]">{label}</span>
      <span className="text-[#606060]">{icon}</span>
    </div>
    <span className={cn('text-lg font-bold truncate',
      tono === 'verde' ? 'text-[#4CAF7D]' : tono === 'rojo' ? 'text-[#C0392B]' : 'text-white light:text-black')}>{value}</span>
  </div>
)
