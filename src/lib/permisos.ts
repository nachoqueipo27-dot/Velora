import { create } from 'zustand'
import { getDb } from '../db'
import { useAuthGlobalStore } from '../store/authGlobalStore'
import { toast } from '../store/toastStore'
import type { ModuleId } from '../store/navigationStore'
import type { NivelPermiso } from '../types/empleados'

// Permisos por rol. La tabla `permisos` usa los ids de MODULES (los que ya guardaba la
// pantalla de roles) más 'devoluciones', que no es un módulo del menú: se registra desde
// Órdenes de Trabajo y se ve en la ficha del cliente.
export type ModuloPermiso = ModuleId | 'devoluciones'
export type Niveles = Record<ModuloPermiso, NivelPermiso>

export const AYUDA_SOLO_VER = 'Tu rol solo puede ver esta sección'

// Valores para los roles que el comercio todavía no configuró (sin filas en `permisos`).
const SUPERVISOR: Niveles = {
  'punto-venta': 'editar', 'caja-diaria': 'editar',
  clientes: 'editar', presupuestos: 'editar', 'ordenes-trabajo': 'editar', agenda: 'editar', devoluciones: 'editar',
  inventario: 'editar', proveedores: 'editar', 'lista-precios': 'editar',
  dashboard: 'solo_ver', reportes: 'solo_ver',
  empleados: 'sin_acceso', configuracion: 'sin_acceso',
  pdfs: 'editar', uso: 'solo_ver', // generar PDF no guarda datos; Uso es la ayuda
}
const OPERARIO: Niveles = {
  ...SUPERVISOR,
  'caja-diaria': 'solo_ver',
  inventario: 'solo_ver', proveedores: 'solo_ver', 'lista-precios': 'solo_ver',
  dashboard: 'sin_acceso', reportes: 'sin_acceso',
}
const MODULOS = Object.keys(SUPERVISOR) as ModuloPermiso[]
const todos = (nivel: NivelPermiso) => Object.fromEntries(MODULOS.map(m => [m, nivel])) as Niveles

const esNivel = (v: unknown): v is NivelPermiso => v === 'sin_acceso' || v === 'solo_ver' || v === 'editar'

/** Niveles efectivos de un rol: lo que configuró el comercio o, si no configuró nada, los de fábrica. */
export async function nivelesDeRol(rol: { id: number; nombre: string }): Promise<Niveles> {
  const db = await getDb()
  const filas = await db.select<{ modulo: string; nivel: string }[]>(
    'SELECT modulo, nivel FROM permisos WHERE rol_id = ?', [rol.id]
  )
  if (filas.length === 0) return rol.nombre === 'Supervisor' ? SUPERVISOR : OPERARIO

  const guardados = new Map(filas.map(f => [f.modulo, f.nivel]))
  const niveles = todos('sin_acceso')
  for (const modulo of MODULOS) {
    // Los roles configurados antes de que existiera 'devoluciones' usan el de OT.
    const valor = guardados.get(modulo) ?? (modulo === 'devoluciones' ? guardados.get('ordenes-trabajo') : undefined)
    if (esNivel(valor)) niveles[modulo] = valor
  }
  return niveles
}

interface PermisosStore {
  niveles: Niveles
  /** false mientras se calculan los permisos de quien acaba de ingresar (todo cerrado). */
  listo: boolean
}

export const usePermisosStore = create<PermisosStore>(() => ({ niveles: todos('sin_acceso'), listo: false }))

let calculo = 0
let dniActual: string | null = null

async function recalcular(): Promise<void> {
  const mio = ++calculo
  const usuario = useAuthGlobalStore.getState().usuario
  const aplicar = (niveles: Niveles, listo: boolean) => {
    if (mio === calculo) usePermisosStore.setState({ niveles, listo })
  }

  // Otra persona: se cierra todo hasta saber qué puede hacer.
  if ((usuario?.dni ?? null) !== dniActual) {
    dniActual = usuario?.dni ?? null
    aplicar(todos('sin_acceso'), false)
  }
  if (!usuario) return
  if (usuario.esAdminGeneral) { aplicar(todos('editar'), true); return }

  try {
    const db = await getDb()
    const roles = await db.select<{ id: number; nombre: string; es_admin: number | null }[]>(
      usuario.empleadoId !== null
        ? 'SELECT r.id, r.nombre, r.es_admin FROM empleados e JOIN roles r ON r.id = e.rol_id WHERE e.id = ?'
        : 'SELECT id, nombre, es_admin FROM roles WHERE nombre = ? AND es_admin = 0',
      [usuario.empleadoId ?? usuario.rol]
    )
    const rol = roles[0]
    if (!rol) aplicar(OPERARIO, true)
    else if (rol.es_admin === 1) aplicar(todos('editar'), true)
    else aplicar(await nivelesDeRol(rol), true)
  } catch (e) {
    console.error('permisos: no se pudieron leer', e)
    aplicar(OPERARIO, true) // ante un error, el rol de menor permiso (ver acceso.ts)
  }
}

// Cambio de usuario o sesión revalidada: se recalculan siempre.
useAuthGlobalStore.subscribe((s, previo) => {
  if (s.usuario !== previo.usuario) void recalcular()
})

export function puede(modulo: ModuloPermiso, accion: 'ver' | 'editar'): boolean {
  const nivel = usePermisosStore.getState().niveles[modulo]
  return accion === 'ver' ? nivel !== 'sin_acceso' : nivel === 'editar'
}

export function usePermiso(modulo: ModuloPermiso): NivelPermiso {
  return usePermisosStore(s => s.niveles[modulo])
}

/**
 * Props para los botones que crean, editan, borran o guardan: `<Button {...ed}>` (al final,
 * para que pisen `disabled` y `title`). Vacío si puede editar todos los módulos pedidos.
 */
export function useEdicion(...modulos: ModuloPermiso[]): { disabled?: true; title?: string } {
  const puedeEditar = usePermisosStore(s => modulos.every(m => s.niveles[m] === 'editar'))
  return puedeEditar ? {} : { disabled: true, title: AYUDA_SOLO_VER }
}

export class ErrorPermiso extends Error {}

/** Para las funciones de guardar de los stores: si el rol no puede editar, avisa y no guarda. */
export function exigirEditar(...modulos: ModuloPermiso[]): void {
  if (modulos.every(m => puede(m, 'editar'))) return
  toast.error(AYUDA_SOLO_VER)
  throw new ErrorPermiso(AYUDA_SOLO_VER)
}
