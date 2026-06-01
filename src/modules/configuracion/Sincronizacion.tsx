import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { getDb } from '../../db'
import { useSyncStore } from '../../store/syncStore'
import { toast } from '../../store/toastStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react'
import { format } from 'date-fns'

const FRECUENCIAS = [
  { value: '1', label: 'Cada 1 hora' },
  { value: '2', label: 'Cada 2 horas' },
  { value: '4', label: 'Cada 4 horas' },
  { value: '8', label: 'Cada 8 horas' },
  { value: 'cierre', label: 'Al cerrar el día' },
]

const UUID_DEMO = 'b0000000-0000-0000-0000-000000000001'

async function getConfig(clave: string): Promise<string> {
  const db = await getDb()
  const rows = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [clave])
  return rows[0]?.valor ?? ''
}
async function setConfig(clave: string, valor: string) {
  const db = await getDb()
  await db.execute(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, valor]
  )
}

export const Sincronizacion = () => {
  const { estado, pendientes, ultimosResultados, sincronizar, actualizarPendientes } = useSyncStore()
  const [remoteId, setRemoteId] = useState('')
  const [frecuencia, setFrecuencia] = useState('4')
  const [okRemote, setOkRemote] = useState(false)
  const [okFrec, setOkFrec] = useState(false)

  useEffect(() => {
    actualizarPendientes()
    getConfig('sync_local_remote_id').then(setRemoteId)
    getConfig('sync_frecuencia').then(v => { if (v) setFrecuencia(v) })
  }, [actualizarPendientes])

  const guardarRemote = async () => { await setConfig('sync_local_remote_id', remoteId.trim()); setOkRemote(true); setTimeout(() => setOkRemote(false), 2000) }
  const guardarFrec = async (v: string) => { setFrecuencia(v); await setConfig('sync_frecuencia', v); setOkFrec(true); setTimeout(() => setOkFrec(false), 1500) }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Sincronización</h2>
        <p className="text-[12px] text-[#808080]">Envía los datos de este local a la nube (Supabase). Sincronización unidireccional: .exe → nube.</p>
      </header>

      {/* Estado actual */}
      <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn(estado.enCurso ? 'text-[#D4921A]' : pendientes > 0 ? 'text-[#D4921A]' : 'text-[#4CAF7D]')}>
            {estado.enCurso ? <RefreshCw size={20} className="animate-spin" /> : pendientes > 0 ? <CloudOff size={20} /> : <Cloud size={20} />}
          </span>
          <div>
            <div className="text-[14px] font-medium text-white light:text-black">
              {estado.enCurso ? 'Sincronizando…' : pendientes > 0 ? `${pendientes} cambios pendientes` : 'Todo sincronizado'}
            </div>
            <div className="text-[11px] text-[#808080]">
              {estado.ultimaSync ? `Última sync: ${format(new Date(estado.ultimaSync), 'dd/MM/yyyy HH:mm')}` : 'Sin sincronizaciones aún'}
            </div>
          </div>
        </div>
        <Button onClick={sincronizar} disabled={estado.enCurso}>
          <RefreshCw size={14} className={cn('mr-1.5', estado.enCurso && 'animate-spin')} />
          {estado.enCurso ? 'Sincronizando…' : 'Sincronizar ahora'}
        </Button>
      </div>

      {estado.progreso && (
        <div className="text-[12px] text-[#A0A0A0] light:text-[#404040]">
          {estado.progreso.tabla}: {estado.progreso.procesados}/{estado.progreso.total}
        </div>
      )}
      {estado.error && <div className="text-[12px] text-[#C0392B]">{estado.error}</div>}

      {/* Remote ID */}
      <div className="flex flex-col gap-2">
        <Input label="Remote ID del local (UUID en Supabase)" value={remoteId} onChange={e => setRemoteId(e.target.value)}
          placeholder={UUID_DEMO} hint="Sin este UUID no hay sync. Lo obtenés de la tabla 'locales' en Supabase." />
        <div className="flex gap-2">
          <Button size="sm" onClick={guardarRemote} disabled={!remoteId.trim()}>{okRemote ? <><Check size={14} className="mr-1.5" />Guardado</> : 'Guardar Remote ID'}</Button>
          {remoteId.trim() === '' && (
            <Button size="sm" variant="secondary" onClick={async () => {
              setRemoteId(UUID_DEMO)
              // Persistir de inmediato: no requiere click adicional en "Guardar Remote ID".
              try {
                await setConfig('sync_local_remote_id', UUID_DEMO)
                toast.success('Remote ID demo guardado')
              } catch (e) {
                console.warn('Error guardando UUID demo:', e)
              }
            }}>Usar UUID demo</Button>
          )}
        </div>
      </div>

      {/* Frecuencia */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[#808080]">Frecuencia automática</span>
        <div className="flex flex-wrap gap-2">
          {FRECUENCIAS.map(f => (
            <button key={f.value} onClick={() => guardarFrec(f.value)}
              className={cn('px-3 py-1.5 text-[12px] rounded-input border transition-all',
                frecuencia === f.value
                  ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                  : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-white light:border-[#E4E4E4] light:text-[#404040]')}>
              {f.label}
            </button>
          ))}
        </div>
        {okFrec && <span className="text-[11px] text-[#4CAF7D]">Frecuencia guardada</span>}
      </div>

      {/* Historial (resultado del último sync por tabla) */}
      {ultimosResultados.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wider text-[#808080]">Último sync — detalle por tabla</span>
          <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#808080] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
                <th className="font-medium px-4 py-2">Tabla</th>
                <th className="font-medium px-4 py-2 text-right">Procesados</th>
                <th className="font-medium px-4 py-2 text-right">Errores</th>
              </tr></thead>
              <tbody>
                {ultimosResultados.filter(r => r.procesados > 0 || r.errores > 0).map(r => (
                  <tr key={r.tabla} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                    <td className="px-4 py-2 text-white light:text-black">{r.tabla}</td>
                    <td className="px-4 py-2 text-right text-[#4CAF7D] tabular-nums">{r.procesados}</td>
                    <td className="px-4 py-2 text-right text-[#C0392B] tabular-nums">{r.errores}</td>
                  </tr>
                ))}
                {ultimosResultados.every(r => r.procesados === 0 && r.errores === 0) && (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-[#808080]">No había cambios para sincronizar</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
