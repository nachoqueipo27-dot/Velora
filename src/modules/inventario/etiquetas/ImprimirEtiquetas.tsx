import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useEtiquetasStore, type PedidoItem } from '../../../store/etiquetasStore'
import { usePermiso } from '../../../lib/permisos'
import { toast } from '../../../store/toastStore'
import { formatearPesos } from '../../../lib/dinero'
import { codificar } from '../../../lib/barras'
import { generarYAbrirPDF } from '../../../lib/pdf/generarPDF'
import { PDFEtiquetasA4, PDFEtiquetasRollo, type EtiquetaPDF } from '../../../lib/pdf/documentos/PDFEtiquetas'
import { FORMATOS_A4, PLANTILLAS, distribuirEnHojas, porHoja, type FormatoEtiqueta } from '../../../lib/etiquetas/plantillas'
import { CodigoBarras } from '../../../components/barras/CodigoBarras'
import { UNIDAD_ABREVIADA, permiteDecimales } from '../../../types/inventario'
import { BuscadorParaLista, useListaProductos, type ItemLista } from './listaProductos'

// Colores de la vista previa de la hoja (un color por producto, se repiten).
const COLORES = [
  'bg-acento-suave text-acento-texto', 'bg-ok-suave text-ok', 'bg-alerta-suave text-alerta', 'bg-superficie-suave text-texto-2',
]
const AYUDA_PRECIO = 'Si el precio cambia, la etiqueta vieja queda desactualizada. Por eso viene apagado: el precio real siempre sale al escanear. Si lo activás, después de cada aumento Velora te ofrece reimprimir las etiquetas afectadas.'
const AYUDA_IMPRIMIR = 'Imprimí al 100 % (tamaño real), sin "ajustar a la página".'

const copiasPorStock = (it: ItemLista) => (permiteDecimales(it.unidadMedida) ? 1 : Math.max(0, Math.round(it.stock)))

/** Inventario → Imprimir etiquetas (Etiquetas.dc.html + EtiquetasHoja.dc.html). */
export const ImprimirEtiquetas = ({ inicial }: { inicial: PedidoItem[] }) => {
  const { prefs, guardarPrefs, quitarDeReimprimir } = useEtiquetasStore()
  const puedeEditar = usePermiso('inventario') === 'editar'
  const { items, cargando, agregar, cambiar, quitar, generarCodigo, productos } = useListaProductos(inicial)
  const [paso, setPaso] = useState<'lista' | 'hoja'>('lista')
  const [copiasFijas, setCopiasFijas] = useState('1')
  const [imprimiendo, setImprimiendo] = useState(false)

  const esA4 = prefs.formato !== 'rollo'
  const formatoA4: FormatoEtiqueta = esA4 ? prefs.formato : 'a4_24'
  const plantilla = PLANTILLAS[esA4 ? formatoA4 : 'rollo']
  const [inicio, setInicio] = useState(prefs.inicio[formatoA4] ?? 1)
  useEffect(() => { setInicio(prefs.inicio[formatoA4] ?? 1) }, [formatoA4]) // eslint-disable-line react-hooks/exhaustive-deps

  const imprimibles: EtiquetaPDF[] = useMemo(
    () => items.filter(i => i.codigo && i.copias > 0).map(i => ({
      productoId: i.productoId, nombre: i.nombre, codigo: i.codigo!, precio: i.precio, unidadMedida: i.unidadMedida, copias: i.copias,
    })), [items])
  const totalEtiquetas = imprimibles.reduce((s, e) => s + e.copias, 0)
  const sinCodigo = items.filter(i => !i.codigo).length
  const nuevos = items.filter(i => i.codigoNuevo).length
  const distribucion = useMemo(
    () => distribuirEnHojas(imprimibles, plantilla, inicio, prefs.filaNueva), [imprimibles, plantilla, inicio, prefs.filaNueva])

  const guardar = (c: Parameters<typeof guardarPrefs>[0]) => guardarPrefs(c).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))

  const imprimir = async () => {
    if (totalEtiquetas === 0) return
    setImprimiendo(true)
    try {
      const nombre = `Etiquetas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`
      const doc = esA4
        ? <PDFEtiquetasA4 etiquetas={imprimibles} plantilla={plantilla} conPrecio={prefs.incluirPrecio} inicio={inicio} filaNueva={prefs.filaNueva} />
        : <PDFEtiquetasRollo etiquetas={imprimibles} plantilla={plantilla} conPrecio={prefs.incluirPrecio} />
      const ok = await generarYAbrirPDF(doc, nombre)
      if (!ok) { toast.error('No se pudo generar el PDF'); return }
      toast.success(`PDF con ${totalEtiquetas} etiqueta${totalEtiquetas === 1 ? '' : 's'} abierto. ${AYUDA_IMPRIMIR}`)
      // Próxima impresión en esta hoja: arranca donde terminó esta.
      if (esA4) {
        const resto = distribucion.posicionFinal % porHoja(plantilla)
        await guardar({ inicio: { [formatoA4]: resto === 0 ? 1 : resto + 1 } })
      }
      if (prefs.incluirPrecio) await quitarDeReimprimir(imprimibles.map(e => e.productoId))
    } finally {
      setImprimiendo(false)
    }
  }

  // ─── Paso 2: hoja A4 (posición inicial y vista previa) ────────────────
  if (paso === 'hoja' && esA4) {
    const n = porHoja(plantilla)
    const coloresPorItem = new Map(imprimibles.map((e, i) => [e.productoId + '|' + e.codigo, COLORES[i % COLORES.length]]))
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto bg-fondo p-1 text-cuerpo text-texto">
        <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
          <div>
            <div className="font-mono text-etiqueta uppercase text-texto-3">Imprimir {totalEtiquetas} etiquetas · Hoja A4</div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Vista previa de las hojas</h1>
            <p className="mt-1 text-seccion text-texto-2">
              Se usan {distribucion.hojas.length} {distribucion.hojas.length === 1 ? 'hoja' : 'hojas'}
              {distribucion.libresUltima ? `: la última queda con ${distribucion.libresUltima} libres.` : ', sin etiquetas libres.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPaso('lista')} className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 hover:bg-superficie-suave">Volver</button>
            <button type="button" onClick={() => void imprimir()} disabled={imprimiendo}
              className="h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90 disabled:opacity-50">
              {imprimiendo ? 'Generando…' : 'Generar PDF e imprimir'}
            </button>
          </div>
        </header>
        <p className="px-1 text-[13px] text-texto-2">{AYUDA_IMPRIMIR}</p>

        <div className="flex flex-wrap items-start gap-4">
          <section className="flex flex-[1_1_320px] flex-col gap-5 rounded-panel border border-borde bg-superficie p-5">
            <div role="radiogroup" aria-label="Tipo de hoja" className="flex flex-col gap-2">
              <div className="text-seccion font-medium">Tipo de hoja</div>
              <div className="flex gap-1 rounded-[12px] bg-superficie-suave p-1">
                {FORMATOS_A4.map(f => (
                  <button key={f} type="button" role="radio" aria-checked={f === formatoA4} onClick={() => void guardar({ formato: f })}
                    className={cn('h-8 flex-1 rounded-[9px] text-cuerpo', f === formatoA4 ? 'border border-borde bg-superficie font-medium text-texto' : 'text-texto-2')}>
                    {PLANTILLAS[f].nombre}
                  </button>
                ))}
              </div>
              <div className="text-[13px] text-texto-2">{plantilla.ayuda}</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-seccion font-medium">Empezar en la posición {inicio}</div>
              <div className="text-[13px] text-texto-2">Tocá la primera etiqueta libre de tu hoja.</div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${plantilla.columnas}, minmax(0, 1fr))` }}>
                {Array.from({ length: n }, (_, i) => (
                  <button key={i} type="button" onClick={() => setInicio(i + 1)} aria-label={`Posición ${i + 1}`}
                    className={cn('rounded-[2px]', n === 65 ? 'h-2.5' : 'h-4',
                      i + 1 === inicio ? 'bg-texto' : i + 1 < inicio ? 'bg-borde-fuerte' : 'border border-borde-fuerte bg-superficie')} />
                ))}
              </div>
              <div className="text-[13px] text-texto-2">
                Velora recuerda dónde terminó la última impresión y te propone seguir desde ahí, para aprovechar las hojas que quedaron a medias.
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={prefs.filaNueva} onChange={e => void guardar({ filaNueva: e.target.checked })} className="mt-1 accent-acento" />
              <span>
                <span className="block text-seccion font-medium">Cada producto empieza en fila nueva</span>
                <span className="mt-0.5 block text-[13px] text-texto-2">Deja huecos al final de cada producto, pero es más fácil despegar y separar las etiquetas sin mezclarlas.</span>
              </span>
            </label>
          </section>

          <section aria-label="Hojas" className="flex flex-[2_1_420px] flex-wrap gap-4">
            {distribucion.hojas.map((celdas, h) => (
              <div key={h} className="flex flex-col gap-1.5">
                <div className="font-mono text-etiqueta uppercase text-texto-3">Hoja {h + 1}</div>
                <div className="grid aspect-[210/297] w-[220px] gap-[3px] rounded-control border border-borde bg-superficie p-2"
                  style={{ gridTemplateColumns: `repeat(${plantilla.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${plantilla.filas}, minmax(0, 1fr))` }}>
                  {celdas.map((c, i) => {
                    const usada = h === 0 && i < inicio - 1
                    return (
                      <div key={i} className={cn('flex min-h-0 items-center justify-center overflow-hidden rounded-[2px] text-[9px] font-medium',
                        c ? coloresPorItem.get(c.item.productoId + '|' + c.item.codigo) : usada ? 'bg-borde-fuerte' : 'border border-dashed border-borde-fuerte')}>
                        {c ? c.item.nombre.slice(0, 3) : ''}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex w-full flex-wrap gap-3 text-[12px] text-texto-2">
              {imprimibles.map((e, i) => (
                <span key={e.productoId + e.codigo} className="flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-[2px]', COLORES[i % COLORES.length].split(' ')[0])} />{e.nombre} ({e.copias})
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-borde-fuerte" />Ya usada</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // ─── Paso 1: lista y opciones ─────────────────────────────────────────
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-fondo p-1 text-cuerpo text-texto">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">Inventario</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Códigos y etiquetas</h1>
          <p className="mt-1 text-seccion text-texto-2">
            {items.length} producto{items.length === 1 ? '' : 's'}
            {nuevos > 0 && ` · ${nuevos} no tenía${nuevos === 1 ? '' : 'n'} código y se le${nuevos === 1 ? '' : 's'} generó uno`}
            {sinCodigo > 0 && ` · ${sinCodigo} sin código (no se imprime${sinCodigo === 1 ? '' : 'n'})`}
          </p>
        </div>
        <button type="button" disabled={totalEtiquetas === 0 || imprimiendo}
          onClick={() => (esA4 ? setPaso('hoja') : void imprimir())}
          className="h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90 disabled:opacity-40">
          {esA4 ? `Elegir hoja · ${totalEtiquetas} etiquetas` : imprimiendo ? 'Generando…' : `Generar PDF e imprimir · ${totalEtiquetas}`}
        </button>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-panel border border-borde bg-superficie p-4">
            <BuscadorParaLista productos={productos} onElegir={p => void agregar([{ productoId: p.id }])} />
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-texto-2">
              <button type="button" onClick={() => items.forEach((it, i) => cambiar(i, { copias: copiasPorStock(it) }))}
                className="h-8 rounded-pastilla border border-borde-fuerte px-3 hover:bg-superficie-suave">Copias = stock actual</button>
              <span>o copias fijas:</span>
              <input value={copiasFijas} onChange={e => setCopiasFijas(e.target.value)} inputMode="numeric" aria-label="Copias fijas para todos"
                className="h-8 w-14 rounded-control border border-borde px-2 text-center font-mono text-texto outline-none focus:border-texto" />
              <button type="button" onClick={() => { const n = Math.max(0, Math.round(Number(copiasFijas) || 0)); items.forEach((_, i) => cambiar(i, { copias: n })) }}
                className="h-8 rounded-pastilla border border-borde-fuerte px-3 hover:bg-superficie-suave">Aplicar a todos</button>
            </div>

            {cargando ? <div className="py-6 text-center text-texto-3">Cargando…</div> : items.length === 0 ? (
              <div className="py-6 text-center text-texto-2">Buscá productos para armar la lista de etiquetas.</div>
            ) : (
              <div className="flex flex-col">
                {items.map((it, i) => (
                  <div key={`${it.productoId}-${it.codigo}-${i}`} className="flex flex-wrap items-center gap-3 border-t border-borde py-2.5 first:border-0">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{it.nombre}</span>
                      <span className="font-mono text-[12px] text-texto-3">{it.codigo ?? 'Sin código'}</span>
                    </span>
                    {it.codigo ? (
                      <span className={cn('rounded-pastilla px-2.5 py-0.5 text-[12px] font-medium', it.codigoNuevo ? 'bg-ok-suave text-ok' : 'bg-superficie-suave text-texto-2')}>
                        {it.codigoNuevo ? 'Código nuevo' : 'Ya tenía código'}
                      </span>
                    ) : puedeEditar ? (
                      <button type="button" onClick={() => void generarCodigo(i)}
                        className="h-8 rounded-pastilla bg-texto px-3 text-[12px] font-medium text-superficie hover:opacity-90">Generar código</button>
                    ) : (
                      <span className="text-[12px] text-alerta">Sin código</span>
                    )}
                    <label className="flex items-center gap-2 text-[13px] text-texto-2">Copias
                      <input value={it.copias} inputMode="numeric" onChange={e => cambiar(i, { copias: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="h-8 w-14 rounded-control border border-borde px-2 text-center font-mono text-texto outline-none focus:border-texto" />
                    </label>
                    <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${it.nombre}`} className="px-1 text-[16px] text-texto-3 hover:text-error">×</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-panel border border-borde bg-superficie p-5">
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 p-0 text-seccion font-medium">Dónde se imprime</legend>
              {(['rollo', 'a4'] as const).map(op => {
                const activo = op === 'rollo' ? !esA4 : esA4
                return (
                  <label key={op} className="flex cursor-pointer items-start gap-3">
                    <input type="radio" name="formato" checked={activo} className="mt-1 accent-acento"
                      onChange={() => void guardar({ formato: op === 'rollo' ? 'rollo' : formatoA4 })} />
                    <span>
                      <span className="block text-seccion">{op === 'rollo' ? PLANTILLAS.rollo.nombre : 'Hoja A4 de etiquetas autoadhesivas'}</span>
                      <span className="block text-[13px] text-texto-2">
                        {op === 'rollo' ? PLANTILLAS.rollo.ayuda : '24, 65 o 21 por hoja. Elegís dónde empezar para aprovechar hojas usadas.'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            <label className="flex cursor-pointer items-start gap-3 border-t border-borde pt-4">
              <input type="checkbox" checked={prefs.incluirPrecio} onChange={e => void guardar({ incluirPrecio: e.target.checked })} className="mt-1 accent-acento" />
              <span>
                <span className="block text-seccion font-medium">Incluir el precio en la etiqueta</span>
                <span className="mt-0.5 block text-[13px] text-texto-2">{AYUDA_PRECIO}</span>
              </span>
            </label>
            <p className="text-[13px] text-texto-2">{AYUDA_IMPRIMIR}</p>
          </section>
        </div>

        <aside aria-label="Vista previa" className="flex flex-[1_1_240px] flex-col gap-3 rounded-panel border border-borde bg-superficie p-4">
          <div className="font-mono text-etiqueta uppercase text-texto-3">
            Vista previa · {plantilla.anchoMm.toLocaleString('es-AR')} × {plantilla.altoMm.toLocaleString('es-AR')} mm
          </div>
          <div className="flex flex-wrap gap-3">
            {imprimibles.slice(0, 4).map(e => <VistaEtiqueta key={e.productoId + e.codigo} e={e} anchoMm={plantilla.anchoMm} altoMm={plantilla.altoMm} conPrecio={prefs.incluirPrecio} />)}
            {imprimibles.length === 0 && <span className="text-texto-3">Sin etiquetas para mostrar.</span>}
          </div>
        </aside>
      </div>
    </div>
  )
}

/** Etiqueta en pantalla, a escala (4 px por mm). */
const VistaEtiqueta = ({ e, anchoMm, altoMm, conPrecio }: { e: EtiquetaPDF; anchoMm: number; altoMm: number; conPrecio: boolean }) => {
  const escala = 4
  const ancho = anchoMm * escala
  let modulos = 117
  try { const c = codificar(e.codigo); modulos = c.modulos.length + c.zonaSilenciosa * 2 } catch { /* se dibuja el aviso */ }
  const modulo = (ancho - 12) / modulos
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-[4px] border border-borde bg-superficie p-1.5"
      style={{ width: ancho, height: altoMm * escala }}>
      <div className="line-clamp-2 text-[11px] leading-tight">{e.nombre}</div>
      {conPrecio && (
        <div className="text-[13px] font-semibold">
          {formatearPesos(e.precio, { sinCentavosSiCero: true })}{permiteDecimales(e.unidadMedida) ? ` / ${UNIDAD_ABREVIADA[e.unidadMedida]}` : ''}
        </div>
      )}
      <CodigoBarras valor={e.codigo} alto={conPrecio ? 30 : 42} modulo={modulo} />
    </div>
  )
}
