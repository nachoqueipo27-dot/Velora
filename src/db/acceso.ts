import { getDb } from './index'
import { esDueno, contarDuenos, cambiarPassword } from './master'
import { hashPassword } from '../lib/crypto'

// Quién puede entrar y con qué rol. La contraseña se verifica en master.db (loginLocal);
// acá se cruza el DNI con los empleados de velora.db.

export const MENSAJE_BAJA = 'Este usuario está dado de baja. Pedile al administrador que lo active.'

// Rol de menor permiso (ver seedRolesBase). Es el que se usa si el rol no se puede leer:
// ante un error nunca se entra como Admin.
const ROL_MINIMO = 'Operario'

export interface UsuarioGlobal {
  nombre: string
  dni: string
  /** 'admin_master' para el dueño; para el resto, el nombre de su rol en velora.db. */
  rol: string
  esAdminGeneral: boolean
  /** id en `empleados`; null para el dueño. */
  empleadoId: number | null
}

type Acceso =
  | { tipo: 'baja' }
  | { tipo: 'ok'; usuario: UsuarioGlobal; debeCambiarClave: boolean }

export async function resolverAcceso({ nombre, dni }: { nombre: string; dni: string }): Promise<Acceso> {
  // El dueño es Admin fijo: no depende de velora.db.
  if (await esDueno(dni)) {
    return {
      tipo: 'ok',
      usuario: { nombre, dni, rol: 'admin_master', esAdminGeneral: true, empleadoId: null },
      debeCambiarClave: false,
    }
  }

  const base = { nombre, dni, esAdminGeneral: false }
  let db: Awaited<ReturnType<typeof getDb>>
  try {
    db = await getDb()
  } catch (e) {
    // La base no abrió (p. ej. falló una migración): se pasa con el rol mínimo y Layout
    // muestra la pantalla de error en lugar de la app.
    console.error('resolverAcceso: no se pudo abrir velora.db', e)
    return { tipo: 'ok', usuario: { ...base, rol: ROL_MINIMO, empleadoId: null }, debeCambiarClave: false }
  }

  // Si esta consulta falla se propaga el error: sin saber si está activo, no entra.
  const filas = await db.select<{ id: number; rol_id: number; activo: number | null; debe_cambiar_clave: number | null }[]>(
    `SELECT id, rol_id, activo, debe_cambiar_clave FROM empleados
     WHERE dni = ? ORDER BY activo DESC, id ASC LIMIT 1`,
    [dni]
  )
  const empleado = filas[0]
  if (!empleado || empleado.activo !== 1) return { tipo: 'baja' }

  let rol = ROL_MINIMO
  try {
    const roles = await db.select<{ nombre: string }[]>('SELECT nombre FROM roles WHERE id = ?', [empleado.rol_id])
    rol = roles[0]?.nombre ?? ROL_MINIMO
  } catch (e) {
    console.error('resolverAcceso: no se pudo leer el rol', e)
  }

  return {
    tipo: 'ok',
    usuario: { ...base, rol, empleadoId: empleado.id },
    debeCambiarClave: empleado.debe_cambiar_clave === 1,
  }
}

// Al dar de baja se borra la fila de master.db, así que loginLocal solo puede responder
// "no encontrado". Esto permite mostrarle a la persona el motivo real.
export async function estaDadoDeBaja(dni: string): Promise<boolean> {
  try {
    if (await esDueno(dni)) return false
    const db = await getDb()
    const filas = await db.select<{ activo: number | null }[]>(
      'SELECT activo FROM empleados WHERE dni = ? ORDER BY activo DESC LIMIT 1',
      [dni]
    )
    return filas.length > 0 && filas[0].activo !== 1
  } catch {
    return false
  }
}

// ── Reglas sobre quién puede tocar a quién ───────────────────────────────────

// Error con un mensaje pensado para mostrarlo tal cual en pantalla.
export class ErrorValidacion extends Error {}

interface FichaEmpleado { dni: string | null; rolId: number }

async function esRolAdmin(rolId: number): Promise<boolean> {
  const db = await getDb()
  const filas = await db.select<{ es_admin: number | null }[]>('SELECT es_admin FROM roles WHERE id = ?', [rolId])
  return filas[0]?.es_admin === 1
}

export async function exigirDueno(actorDni: string | null, mensaje: string): Promise<void> {
  if (actorDni === null || !(await esDueno(actorDni))) throw new ErrorValidacion(mensaje)
}

/**
 * Lanza ErrorValidacion si `actorDni` no puede crear (`previo` null), editar, dar de baja o
 * eliminar (`nuevo` null) a ese empleado.
 */
export async function exigirPuedeTocarEmpleado(
  actorDni: string | null,
  previo: FichaEmpleado | null,
  nuevo: (FichaEmpleado & { cambiaClave: boolean; activo: boolean }) | null,
): Promise<void> {
  const roles = [previo?.rolId, nuevo?.rolId].filter((r): r is number => r !== undefined)
  for (const rolId of roles) {
    if (await esRolAdmin(rolId)) {
      await exigirDueno(actorDni, 'Solo el dueño puede crear o editar usuarios con rol de administrador.')
    }
  }

  // Desde acá, reglas de la cuenta de un dueño.
  if (!previo?.dni || !(await esDueno(previo.dni))) return
  await exigirDueno(actorDni, 'Solo el dueño puede editar su cuenta.')

  if (previo.dni !== actorDni) {
    if (nuevo && (nuevo.dni !== previo.dni || nuevo.rolId !== previo.rolId || nuevo.cambiaClave)) {
      throw new ErrorValidacion('Solo el propio dueño puede cambiar su DNI, su contraseña o su rol.')
    }
  } else if ((!nuevo || !nuevo.activo) && (await contarDuenos()) <= 1) {
    throw new ErrorValidacion('Sos el único dueño: no podés desactivarte ni eliminarte.')
  }
}

/**
 * ¿El DNI está libre para esta ficha? Lo ocupa otro empleado (activo o no) o un dueño.
 * Excepción: el dueño puede poner su propio DNI en su ficha, que nace sin DNI en el
 * onboarding. Una fila de master.db sin empleado detrás no ocupa el DNI: no puede entrar.
 */
export async function exigirDniLibre(
  actorDni: string | null, dni: string, rolId: number, empleado: { id: number; dni: string | null } | null,
): Promise<void> {
  const db = await getDb()
  const otros = await db.select<{ n: number }[]>(
    'SELECT COUNT(*) AS n FROM empleados WHERE dni = ? AND id <> ?', [dni, empleado?.id ?? 0]
  )
  const suPropiaFicha = empleado !== null && !empleado.dni && dni === actorDni && (await esRolAdmin(rolId))
  if ((otros[0]?.n ?? 0) > 0 || ((await esDueno(dni)) && !suPropiaFicha)) {
    throw new ErrorValidacion('Ese DNI ya está en uso')
  }
}

/** ¿Es la ficha del propio dueño? (Cambiarle el DNI es cambiar el DNI de su cuenta.) */
export async function esFichaPropiaDelDueno(actorDni: string | null, ficha: FichaEmpleado): Promise<boolean> {
  if (!ficha.dni || ficha.dni !== actorDni || !(await esDueno(ficha.dni)) || !(await esRolAdmin(ficha.rolId))) return false
  const db = await getDb()
  const filas = await db.select<{ n: number }[]>('SELECT COUNT(*) AS n FROM empleados WHERE dni = ?', [ficha.dni])
  return filas[0]?.n === 1 // con el DNI repetido no se sabe cuál es la suya: se corrige sin mover la cuenta
}

// Guarda la contraseña que eligió el propio usuario y quita la marca de cambio obligatorio.
// La marca se limpia al final: si algo falla antes, en el próximo ingreso se vuelve a pedir.
export async function guardarClaveElegida(usuario: UsuarioGlobal, clave: string): Promise<void> {
  await cambiarPassword(usuario.dni, clave)
  if (usuario.empleadoId === null) return
  const hash = await hashPassword(clave)
  const db = await getDb()
  await db.execute(
    'UPDATE empleados SET password = ?, debe_cambiar_clave = 0, actualizado_en = ? WHERE id = ?',
    [hash, new Date().toISOString(), usuario.empleadoId]
  )
}
