import { useOnboardingStore } from '../../store/onboardingStore'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { getDb } from '../../db'
import { guardarUsuarioLocal, guardarPreguntaSeguridad } from '../../db/master'
import { hashPassword } from '../../lib/crypto'
import { labelPreguntaSeguridad } from '../../lib/preguntasSeguridad'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { FUNCIONES_DISPONIBLES } from './types'

// Guarda el Admin General nacido del onboarding: empleado en la DB del negocio
// (acceso operativo) + usuario en master.db por DNI, rol admin_master (login del
// sistema) + pregunta de seguridad para recuperación de contraseña. 100% local.
async function guardarAdminEnDB(
  nombre: string,
  dni: string,
  password: string,
  preguntaId: string,
  respuestaSeguridad: string,
) {
  try {
    const db = await getDb()
    const now = new Date().toISOString()

    // 1. Empleado en la DB del negocio (rol Admin).
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
      `SELECT COUNT(*) as count FROM empleados WHERE nombre = ? LIMIT 1`,
      [nombre]
    )
    if (admins[0].count === 0) {
      await db.execute(
        `INSERT INTO empleados (nombre, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
         VALUES (?, ?, ?, 1, 'fijo', ?, ?)`,
        [nombre, rolId, btoa(password), now, now]
      )
    }

    // 2. Usuario en master.db por DNI, como Admin General de esta instalación.
    await guardarUsuarioLocal({ nombre, dni, rol: 'admin_master' }, password)

    // 3. Pregunta de seguridad (respuesta cifrada con bcrypt, mismo mecanismo que la password).
    const respuestaHash = await hashPassword(respuestaSeguridad)
    await guardarPreguntaSeguridad(dni, preguntaId, respuestaHash)

    console.log('[onboarding] Admin General guardado (local + master) DNI:', dni)
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
  const { data, completarOnboarding } = useOnboardingStore()
  const { setUsuario } = useSessionStore()

  const habilitadas = data.funcionesHabilitadas ?? []
  const modulosActivos = FUNCIONES_DISPONIBLES.filter(f => habilitadas.includes(f.id)).length

  const handleConfirm = async () => {
    // Guardar el Admin General del onboarding (local + master) antes de completar.
    if (data.adminNombre && data.adminDni && data.adminPassword && data.adminPreguntaId && data.adminRespuestaSeguridad) {
      await guardarAdminEnDB(
        data.adminNombre,
        data.adminDni,
        data.adminPassword,
        data.adminPreguntaId,
        data.adminRespuestaSeguridad,
      )
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
        dni: data.adminDni ?? '',
        rol: 'admin_master',
        esAdminGeneral: true,
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

      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={handleConfirm}>Confirmar y comenzar</Button>
      </div>
    </div>
  )
}
