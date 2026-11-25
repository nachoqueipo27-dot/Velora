import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInventarioStore } from '../../../store/inventarioStore'
import { cargarCodigos } from '../../../lib/codigos'
import { asignarCodigoInterno } from '../../../lib/codigosInternos'
import { toast } from '../../../store/toastStore'
import type { PedidoItem } from '../../../store/etiquetasStore'
import type { Producto, UnidadMedida } from '../../../types/inventario'

// Lista de productos para imprimir (etiquetas y hoja de mostrador) y su buscador.

export interface ItemLista {
  productoId: number
  nombre: string
  /** Centavos. */
  precio: number
  stock: number
  unidadMedida: UnidadMedida
  /** Código que se imprime (null = el producto no tiene código). */
  codigo: string | null
  /** true si el código se generó recién desde esta pantalla. */
  codigoNuevo: boolean
  copias: number
}

async function armarItem(p: Producto, codigoPedido?: string): Promise<ItemLista> {
  const codigos = await cargarCodigos(p.id)
  const codigo = codigoPedido && codigos.some(c => c.codigo === codigoPedido)
    ? codigoPedido
    : (codigos.find(c => c.tipo === 'unidad') ?? codigos[0])?.codigo ?? null
  return {
    productoId: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock, unidadMedida: p.unidadMedida,
    codigo, codigoNuevo: false, copias: 1,
  }
}

/** Estado de la lista: se arma con el pedido inicial y se le pueden sumar productos. */
export function useListaProductos(inicial: PedidoItem[]) {
  const { productos, cargarProductos } = useInventarioStore()
  const [items, setItems] = useState<ItemLista[]>([])
  const [cargando, setCargando] = useState(inicial.length > 0)

  const agregar = useCallback(async (pedidos: PedidoItem[]) => {
    let lista = useInventarioStore.getState().productos
    if (lista.length === 0) { await cargarProductos(); lista = useInventarioStore.getState().productos }
    const nuevos: ItemLista[] = []
    for (const ped of pedidos) {
      const p = lista.find(x => x.id === ped.productoId)
      if (p) nuevos.push(await armarItem(p, ped.codigo))
    }
    setItems(prev => {
      // Si el producto ya estaba con el mismo código, no se duplica.
      const ya = new Set(prev.map(i => `${i.productoId}|${i.codigo}`))
      return [...prev, ...nuevos.filter(n => !ya.has(`${n.productoId}|${n.codigo}`))]
    })
  }, [cargarProductos])

  useEffect(() => {
    if (inicial.length === 0) return
    agregar(inicial).catch(e => console.error('lista etiquetas', e)).finally(() => setCargando(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (indice: number, patch: Partial<ItemLista>) =>
    setItems(prev => prev.map((it, i) => (i === indice ? { ...it, ...patch } : it)))
  const quitar = (indice: number) => setItems(prev => prev.filter((_, i) => i !== indice))

  const generarCodigo = async (indice: number) => {
    const it = items[indice]
    if (!it) return
    try {
      const codigo = await asignarCodigoInterno(it.productoId)
      cambiar(indice, { codigo, codigoNuevo: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el código')
    }
  }

  return { items, setItems, cargando, agregar, cambiar, quitar, generarCodigo, productos }
}

/** Buscador para sumar productos a la lista (por nombre o SKU). */
export const BuscadorParaLista = ({ productos, onElegir }: { productos: Producto[]; onElegir: (p: Producto) => void }) => {
  const [q, setQ] = useState('')
  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    return productos.filter(p => p.activo && (p.nombre.toLowerCase().includes(t) || p.codigoSku.toLowerCase().includes(t))).slice(0, 6)
  }, [productos, q])
  return (
    <div className="relative">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar un producto para sumarlo…"
        className="h-10 w-full rounded-control border border-borde bg-superficie px-3 text-cuerpo text-texto outline-none placeholder:text-texto-3 focus:border-texto" />
      {resultados.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-10 overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-lg">
          {resultados.map(p => (
            <button key={p.id} type="button" onClick={() => { onElegir(p); setQ('') }}
              className="block w-full border-b border-borde px-3 py-2 text-left text-cuerpo last:border-0 hover:bg-superficie-suave">
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
