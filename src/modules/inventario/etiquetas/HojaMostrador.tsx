import { useState } from 'react'
import { format } from 'date-fns'
import { usePermiso } from '../../../lib/permisos'
import { useNegocio } from '../../../hooks/useNegocio'
import { toast } from '../../../store/toastStore'
import { formatearPesos } from '../../../lib/dinero'
import { generarYAbrirPDF } from '../../../lib/pdf/generarPDF'
import { PDFHojaMostrador, type ItemMostrador } from '../../../lib/pdf/documentos/PDFHojaMostrador'
import type { PedidoItem } from '../../../store/etiquetasStore'
import { BuscadorParaLista, useListaProductos } from './listaProductos'

/**
 * Inventario → Hoja de mostrador: para lo que no se puede etiquetar (pan, fiambre suelto,
 * verdura). Un A4 con nombre, precio y código grande de cada producto, para escanear desde el papel.
 */
export const HojaMostrador = ({ inicial }: { inicial: PedidoItem[] }) => {
  const negocio = useNegocio()
  const puedeEditar = usePermiso('inventario') === 'editar'
  const { items, cargando, agregar, quitar, generarCodigo, productos } = useListaProductos(inicial)
  const [imprimiendo, setImprimiendo] = useState(false)
  const conCodigo = items.filter(i => i.codigo)

  const imprimir = async () => {
    if (conCodigo.length === 0) return
    setImprimiendo(true)
    try {
      const lista: ItemMostrador[] = conCodigo.map(i => ({
        productoId: i.productoId, nombre: i.nombre, codigo: i.codigo!, precio: i.precio, unidadMedida: i.unidadMedida,
      }))
      const ok = await generarYAbrirPDF(
        <PDFHojaMostrador items={lista} titulo={negocio.nombre} fecha={format(new Date(), 'dd/MM/yyyy')} />,
        `Hoja-de-mostrador-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`,
      )
      if (ok) toast.success('Hoja de mostrador abierta. Imprimí al 100 % (tamaño real).')
      else toast.error('No se pudo generar el PDF')
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-fondo p-1 text-cuerpo text-texto">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">Inventario</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Hoja de mostrador</h1>
          <p className="mt-1 max-w-2xl text-seccion text-texto-2">
            Para lo que no se puede etiquetar, como pan, fiambre suelto, frutas o tornillos sueltos. Se imprime una hoja con el
            nombre, el precio y el código de cada producto para tener junto a la caja: el cajero escanea desde la hoja.
          </p>
        </div>
        <button type="button" onClick={() => void imprimir()} disabled={imprimiendo || conCodigo.length === 0}
          className="h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90 disabled:opacity-40">
          {imprimiendo ? 'Generando…' : `Generar PDF e imprimir · ${conCodigo.length}`}
        </button>
      </header>

      <section className="flex max-w-3xl flex-col gap-3 rounded-panel border border-borde bg-superficie p-4">
        <BuscadorParaLista productos={productos} onElegir={p => void agregar([{ productoId: p.id }])} />
        {cargando ? <div className="py-6 text-center text-texto-3">Cargando…</div> : items.length === 0 ? (
          <div className="py-6 text-center text-texto-2">Buscá los productos que van en la hoja.</div>
        ) : items.map((it, i) => (
          <div key={`${it.productoId}-${i}`} className="flex flex-wrap items-center gap-3 border-t border-borde py-2.5 first:border-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{it.nombre}</span>
              <span className="font-mono text-[12px] text-texto-3">{it.codigo ?? 'Sin código'}</span>
            </span>
            <span className="tabular-nums text-texto-2">{formatearPesos(it.precio, { sinCentavosSiCero: true })}</span>
            {!it.codigo && (puedeEditar ? (
              <button type="button" onClick={() => void generarCodigo(i)}
                className="h-8 rounded-pastilla bg-texto px-3 text-[12px] font-medium text-superficie hover:opacity-90">Generar código</button>
            ) : <span className="text-[12px] text-alerta">Sin código: no sale en la hoja</span>)}
            <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${it.nombre}`} className="px-1 text-[16px] text-texto-3 hover:text-error">×</button>
          </div>
        ))}
        <p className="text-[13px] text-texto-2">Entran 10 productos por hoja. Imprimí al 100 % (tamaño real), sin "ajustar a la página".</p>
      </section>
    </div>
  )
}
