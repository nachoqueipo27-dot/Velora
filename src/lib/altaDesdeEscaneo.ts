import { useInventarioStore, PREFIJO_BORRADOR, type NuevoProducto } from '../store/inventarioStore'
import type { Producto } from '../types/inventario'

// Altas de productos a partir de un código escaneado (Alta rápida y Borrador).

/** Producto simple con el código escaneado como único código (tipo unidad). */
export function productoDesdeCodigo(codigo: string, datos: Partial<NuevoProducto> = {}): NuevoProducto {
  return {
    nombre: `${PREFIJO_BORRADOR} · ${codigo}`,
    tipo: 'simple',
    descripcion: '',
    categoriaId: null,
    precio: 0,
    precioCosto: 0,
    monedaCosto: 'ARS',
    codigoSku: '',
    stock: 0,
    stockMinimo: 0,
    imagen: null,
    trazabilidad: 'ninguna',
    unidadMedida: 'unidad',
    activo: true,
    codigos: [{ codigo, tipo: 'unidad', unidadesPorPack: 1 }],
    ...datos,
  }
}

/** Crea el producto y lo devuelve ya cargado del inventario. */
export async function crearDesdeCodigo(datos: NuevoProducto): Promise<Producto> {
  const { crearProducto } = useInventarioStore.getState()
  const id = await crearProducto(datos, [])
  const creado = useInventarioStore.getState().productos.find(p => p.id === id)
  if (!creado) throw new Error('El producto se creó pero no se pudo leer. Revisalo en Inventario.')
  return creado
}

/** Borrador: "Producto sin nombre · <código>", precio 0, para completar en Inventario. */
export function crearBorrador(codigo: string, datos: Partial<NuevoProducto> = {}): Promise<Producto> {
  return crearDesdeCodigo(productoDesdeCodigo(codigo, { ...datos, borrador: true }))
}
