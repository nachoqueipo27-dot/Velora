import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useInventarioStore } from '../../store/inventarioStore'
import type { Producto } from '../../types/inventario'
import { ListadoProductos } from './ListadoProductos'
import { FichaProducto } from './FichaProducto'
import { ReporteRotacion } from './ReporteRotacion'
import { InformeRentabilidad } from './InformeRentabilidad'
import { AccesoRestringido } from '../../components/ui/AccesoRestringido'
import { usePermiso } from '../../lib/permisos'
import { useEscaneoEnModulo } from '../../lib/escaneo'
import { toast } from '../../store/toastStore'
import { useEscaneoStore } from '../../store/escaneoStore'
import { AltaRapida } from '../../components/escaneo/AltaRapida'
import { useIngresoStore, numeroIngreso, type ResumenIngresoAbierto } from '../../store/ingresoStore'
import { SesionIngreso } from './ingreso/SesionIngreso'
import { HistorialIngresos } from './ingreso/HistorialIngresos'
import { Package, Boxes, TrendingUp, BarChart3, PackagePlus } from 'lucide-react'

type Seccion = 'productos' | 'conjuntos' | 'ingresos' | 'rotacion' | 'rentabilidad'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'productos',    label: 'Productos',              icon: <Package size={15} /> },
  { id: 'conjuntos',    label: 'Conjuntos',              icon: <Boxes size={15} /> },
  { id: 'ingresos',     label: 'Ingresos',               icon: <PackagePlus size={15} /> },
  { id: 'rotacion',     label: 'Reporte de rotación',    icon: <TrendingUp size={15} /> },
  { id: 'rentabilidad', label: 'Informe de rentabilidad', icon: <BarChart3 size={15} /> },
]

const Inventario = () => {
  const { cargarProductos, cargarCategorias, productoSeleccionado, seleccionarProducto } = useInventarioStore()
  const [seccion, setSeccion] = useState<Seccion>('productos')
  // Costos, márgenes y rentabilidad: solo quien edita Inventario.
  const verCostos = usePermiso('inventario') === 'editar'

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [cargarProductos, cargarCategorias])

  const verFicha = (p: Producto) => seleccionarProducto(p)

  // Lector: código conocido → abre la ficha; desconocido → Alta rápida (si puede editar).
  const puedeDarAlta = usePermiso('inventario') === 'editar'
  const [altaCodigo, setAltaCodigo] = useState<string | null>(null)

  // ─── Agregar stock ────────────────────────────────────────────────────
  const { abrir: abrirIngreso, buscarAbierto, descartar: descartarIngreso } = useIngresoStore()
  const [enIngreso, setEnIngreso] = useState(false)
  const [ingresoPendiente, setIngresoPendiente] = useState<ResumenIngresoAbierto | null>(null)
  const revisarPendiente = () => {
    if (!puedeDarAlta) { setIngresoPendiente(null); return }
    buscarAbierto().then(setIngresoPendiente).catch(e => console.error('ingreso abierto', e))
  }
  useEffect(revisarPendiente, [puedeDarAlta]) // eslint-disable-line react-hooks/exhaustive-deps
  const iniciarIngreso = async () => {
    try { await abrirIngreso(); setIngresoPendiente(null); setEnIngreso(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo abrir el ingreso') }
  }
  const descartarPendiente = async () => {
    if (!ingresoPendiente) return
    try { await descartarIngreso(ingresoPendiente.id); setIngresoPendiente(null); toast.info('Ingreso descartado: el stock no cambió') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo descartar') }
  }

  useEscaneoEnModulo('inventario', ({ codigo, resultado }) => {
    if (enIngreso) return // con la sesión de Agregar stock abierta, el escaneo es de ella
    if (resultado) {
      setSeccion(resultado.producto.tipo === 'conjunto' ? 'conjuntos' : 'productos')
      seleccionarProducto(resultado.producto)
    } else if (puedeDarAlta) {
      setAltaCodigo(codigo)
    } else {
      toast.info(`El código ${codigo} no está registrado. Pedile al encargado que lo dé de alta.`)
    }
  })
  // "Darlo de alta" desde el aviso flotante de otra pantalla.
  useEffect(() => {
    const pendiente = useEscaneoStore.getState().tomarAltaPendiente()
    if (pendiente && puedeDarAlta) setAltaCodigo(pendiente)
  }, [puedeDarAlta])

  const irA = (id: Seccion) => {
    seleccionarProducto(null)
    setSeccion(id)
  }

  const renderContenido = () => {
    if ((seccion === 'productos' || seccion === 'conjuntos') && productoSeleccionado) {
      return <FichaProducto onVolver={() => seleccionarProducto(null)} />
    }
    switch (seccion) {
      case 'productos':    return <ListadoProductos tipo="simple" onVer={verFicha} onAgregarStock={puedeDarAlta ? () => void iniciarIngreso() : undefined} />
      case 'conjuntos':    return <ListadoProductos tipo="conjunto" onVer={verFicha} />
      case 'ingresos':     return <HistorialIngresos />
      case 'rotacion':     return <ReporteRotacion />
      case 'rentabilidad': return verCostos ? <InformeRentabilidad /> : <AccesoRestringido />
    }
  }

  // La sesión de ingreso ocupa todo el módulo (Stock.dc.html).
  if (enIngreso) return <SesionIngreso onSalir={() => { setEnIngreso(false); revisarPendiente() }} />

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Inventario</span>
        <nav className="flex flex-col">
          {SUBMENU.filter(item => verCostos || item.id !== 'rentabilidad').map(item => {
            const activo = seccion === item.id
            return (
              <button key={item.id} onClick={() => irA(item.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  activo
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]',
                )}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
      <section className="flex-1 overflow-hidden p-6 flex flex-col">
        {ingresoPendiente && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-tarjeta border border-acento/30 bg-superficie px-4 py-3 text-cuerpo text-texto">
            <span className="flex-[1_1_260px] text-seccion">
              <strong className="font-semibold">Tenés un ingreso sin confirmar</strong>{' '}
              ({numeroIngreso(ingresoPendiente.numero)} · {ingresoPendiente.productos} producto{ingresoPendiente.productos === 1 ? '' : 's'}). El stock todavía no cambió.
            </span>
            <button type="button" onClick={() => void iniciarIngreso()}
              className="h-[34px] rounded-pastilla bg-texto px-3.5 text-cuerpo font-medium text-superficie hover:opacity-90">Retomar</button>
            <button type="button" onClick={() => void descartarPendiente()}
              className="h-[34px] rounded-pastilla border border-borde-fuerte bg-superficie px-3.5 text-cuerpo hover:bg-superficie-suave">Descartar</button>
          </div>
        )}
        <div className="flex-1 min-h-0">{renderContenido()}</div>
      </section>

      {altaCodigo && (
        <AltaRapida codigo={altaCodigo} contexto="inventario" onCerrar={() => setAltaCodigo(null)}
          onCreado={(p, borrador) => {
            setAltaCodigo(null)
            toast.success(borrador ? 'Guardado como borrador: queda en Productos por completar.' : `«${p.nombre}» dado de alta`)
            if (!borrador) { setSeccion('productos'); seleccionarProducto(p) }
          }} />
      )}
    </div>
  )
}

export default Inventario
