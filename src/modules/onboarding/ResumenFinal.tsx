import { useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { getDb } from '../../db'
import { guardarUsuarioLocal, guardarPreguntaSeguridad, existeUsuarioMaster, esDueno } from '../../db/master'
import { hashPassword } from '../../lib/crypto'
import { labelPreguntaSeguridad } from '../../lib/preguntasSeguridad'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { FUNCIONES_DISPONIBLES } from './types'

// Guarda el Admin General nacido del onboarding: empleado en la DB del negocio
// (acceso operativo) + usuario en master.db por DNI, rol admin_master (login del
// sistema) + pregunta de seguridad para recuperación de contraseña. 100% local.
// Primero el usuario: si eso falla no se guarda nada y se puede reintentar (si quedara un
// empleado sin usuario, la instalación ya no estaría limpia y nadie podría ingresar).
async function guardarAdminEnDB(
  nombre: string,
  dni: string,
  password: string,
  preguntaId: string,
  respuestaSeguridad: string,
) {
  const passwordHash = await hashPassword(password)
  const respuestaHash = await hashPassword(respuestaSeguridad)

  // 1. Usuario en master.db por DNI, como Admin General de esta instalación.
  await guardarUsuarioLocal({ nombre, dni, rol: 'admin_master' }, password)

  // Desde acá el dueño ya puede ingresar: un fallo no impide terminar.
  try {
    // 2. Pregunta de seguridad (respuesta cifrada con bcrypt, mismo mecanismo que la password).
    await guardarPreguntaSeguridad(dni, preguntaId, respuestaHash)

    // 3. Empleado en la DB del negocio (rol Admin).
    const db = await getDb()
    const now = new Date().toISOString()
    const roles = await db.select<{ id: number }[]>(`SELECT id FROM roles WHERE nombre = 'Admin' LIMIT 1`)
    let rolId: number
    if (roles.length === 0) {
      await db.execute(`INSERT INTO roles (nombre, es_admin, creado_en) VALUES ('Admin', 1, ?)`, [now])
      const nuevoRol = await db.select<{ id: number }[]>(`SELECT id FROM roles WHERE nombre = 'Admin' LIMIT 1`)
      rolId = nuevoRol[0].id
    } else {
      rolId = roles[0].id
    }
    const admins = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM empleados WHERE nombre = ? OR dni = ? LIMIT 1`,
      [nombre, dni]
    )
    if (admins[0].count === 0) {
      await db.execute(
        `INSERT INTO empleados (nombre, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
         VALUES (?, ?, ?, 1, 'fijo', ?, ?)`,
        [nombre, rolId, passwordHash, now, now]
      )
    }

    console.log('[onboarding] Admin General guardado (local + master)')
  } catch (e) {
    console.error('[onboarding] Error guardando admin en DB:', e)
  }
}

interface ResumenFinalProps {
  onBack: () => void
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5 text-sm">
    <span className="text-[#606060]">{label}</span>
    <span className="text-white light:text-black font-medium text-right max-w-[60%] truncate">
      {value || '—'}
    </span>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className={cn(
    'rounded-card border p-4 flex flex-col',
    'border-[#2A2A2A] bg-[#141414]',
    'light:border-[#E4E4E4] light:bg-white',
  )}>
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-1">{title}</span>
    {children}
  </div>
)

export const ResumenFinal = ({ onBack }: ResumenFinalProps) => {
  const { data, relanzado, setPaso, completarOnboarding } = useOnboardingStore()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const { setUsuario } = useSessionStore()

  const habilitadas = data.funcionesHabilitadas ?? []
  const modulosActivos = FUNCIONES_DISPONIBLES.filter(f => habilitadas.includes(f.id)).length

  const handleConfirm = async () => {
    // La contraseña y la respuesta no se guardan en la PC: si se reabrió la app a mitad
    // del onboarding hay que volver a pedirlas (sin ellas no habría Admin General).
    if (!data.adminNombre || !data.adminDni || !data.adminPassword || !data.adminPreguntaId || !data.adminRespuestaSeguridad) {
      setPaso(2)
      return
    }
    setError(null)
    setGuardando(true)
    // Al volver a correrlo, la cuenta es siempre la del dueño que ingresó.
    const actual = useAuthGlobalStore.getState().usuario
    const dni = relanzado && actual ? actual.dni : data.adminDni
    try {
      if ((await existeUsuarioMaster()) && !(relanzado && actual && (await esDueno(actual.dni)))) {
        setError('Velora ya está configurado en esta PC. Cerralo y volvé a abrirlo para iniciar sesión.')
        setGuardando(false)
        return
      }
      // Guardar el Admin General del onboarding (local + master) antes de completar.
      await guardarAdminEnDB(
        data.adminNombre,
        dni,
        data.adminPassword,
        data.adminPreguntaId,
        data.adminRespuestaSeguridad,
      )
    } catch (e) {
      console.error('[onboarding] No se pudo crear el Admin General:', e)
      setError('No se pudo guardar el usuario administrador. Probá de nuevo.')
      setGuardando(false)
      return
    }
    setUsuario({
      id: 1,
      nombre: data.adminNombre ?? 'Administrador',
      rol: 'Admin',
      avatar: data.logo ?? null,
    })
    // Autentica de una: el usuario recién creó sus credenciales, no debe volver a loguearse.
    useAuthGlobalStore.setState({
      usuario: {
        nombre: data.adminNombre ?? 'Administrador',
        dni,
        rol: 'admin_master',
        esAdminGeneral: true,
        empleadoId: null,
      },
    })
    completarOnboarding()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">Todo listo</h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Revisá la configuración antes de comenzar. Todo se puede modificar después desde Configuración.
        </p>
      </div>

      <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
        <Section title="Negocio">
          <Row label="Nombre" value={data.nombreNegocio ?? ''} />
          <Row label="Rubro" value={data.rubro ?? ''} />
          <Row label="Dirección" value={data.direccion ?? ''} />
          <Row label="Teléfono" value={data.telefono ?? ''} />
          <Row label="Email" value={data.email ?? ''} />
          <Row label="Logo" value={data.logo ? 'Cargado' : 'Sin logo'} />
        </Section>

        <Section title="Administrador">
          <Row label="Nombre" value={data.adminNombre ?? ''} />
          <Row label="DNI" value={data.adminDni ?? ''} />
          <Row label="Contraseña" value={data.adminPassword ? '••••••••' : ''} />
          <Row label="Pregunta de seguridad" value={labelPreguntaSeguridad(data.adminPreguntaId ?? '')} />
        </Section>

        <Section title="Preferencias">
          <Row label="Moneda" value={data.moneda ?? ''} />
          <Row label="Tema" value={data.tema === 'light' ? 'Claro' : data.tema === 'dark' ? 'Oscuro' : ''} />
        </Section>

        <Section title="Funciones">
          <Row label="Módulos habilitados" value={`${modulosActivos} de ${FUNCIONES_DISPONIBLES.length}`} />
          <Row label="Funciones totales" value={`${habilitadas.length} activas`} />
        </Section>
      </div>

      {error && <p role="alert" className="text-cuerpo text-error dark:text-acento">{error}</p>}

      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={onBack} disabled={guardando}>Volver</Button>
        <Button onClick={handleConfirm} disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar y comenzar'}</Button>
      </div>
    </div>
  )
}
