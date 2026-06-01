import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useConfigStore, type BackupConfig } from '../../store/configStore'
import { realizarBackup, restaurarBackup } from '../../lib/backup'
import { copyFile } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { toast } from '../../store/toastStore'
import { DatabaseBackup, Upload, Download, Check, Package } from 'lucide-react'
import { format } from 'date-fns'

const FRECUENCIAS: { value: BackupConfig['frecuencia']; label: string }[] = [
  { value: 'horas', label: 'Cada X horas' },
  { value: 'diario', label: 'Diario a hora fija' },
  { value: 'cierre', label: 'Al cerrar la app' },
]

export const Backup = () => {
  const { backupCfg, guardarBackupCfg, backups, cargarBackups } = useConfigStore()
  const [cfg, setCfg] = useState<BackupConfig>(backupCfg)
  const [ok, setOk] = useState(false)
  const [restaurar, setRestaurar] = useState<{ ruta: string } | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => { setCfg(backupCfg) }, [backupCfg])
  useEffect(() => { cargarBackups() }, [cargarBackups])

  const guardarCfg = async () => { await guardarBackupCfg(cfg); setOk(true); setTimeout(() => setOk(false), 2000) }

  const backupAhora = async () => {
    setTrabajando(true)
    const r = await realizarBackup('manual')
    setTrabajando(false)
    if (r) { toast.success('Backup creado correctamente'); cargarBackups() }
    else toast.info('Backup cancelado')
  }

  const restaurarArchivo = async () => {
    setTrabajando(true)
    const r = await restaurarBackup()
    setTrabajando(false)
    if (r) { toast.success('Backup restaurado. Reiniciando…'); setTimeout(() => window.location.reload(), 1200) }
    else toast.info('Restauración cancelada')
  }

  const restaurarFila = async () => {
    if (!restaurar) return
    setTrabajando(true)
    try {
      await realizarBackup('pre_operacion')
      const dataDir = await appDataDir()
      const destino = await join(dataDir, 'velora.db')
      await copyFile(restaurar.ruta, destino)
      setRestaurar(null)
      toast.success('Backup restaurado. Reiniciando…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      console.error('restaurarFila', e); toast.error('Error al restaurar')
    } finally { setTrabajando(false) }
  }

  const num = (k: keyof BackupConfig, v: string) => setCfg(c => ({ ...c, [k]: Number(v) }))

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Backup</h2>
        <p className="text-[12px] text-[#606060]">Resguardo y restauración de la base de datos.</p>
      </header>

      {/* Acciones manuales */}
      <div className="flex gap-2">
        <Button onClick={backupAhora} disabled={trabajando}><DatabaseBackup size={15} className="mr-1.5" />Hacer backup ahora</Button>
        <Button variant="secondary" onClick={restaurarArchivo} disabled={trabajando}><Upload size={15} className="mr-1.5" />Restaurar desde archivo</Button>
        <Button variant="secondary" onClick={backupAhora} disabled={trabajando}><Package size={15} className="mr-1.5" />Exportar paquete completo</Button>
      </div>

      {/* Configuración */}
      <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4 flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Configuración automática</span>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-[#A0A0A0] light:text-[#404040]">Frecuencia</label>
          <div className="flex gap-2 flex-wrap">
            {FRECUENCIAS.map(f => (
              <button key={f.value} onClick={() => setCfg(c => ({ ...c, frecuencia: f.value }))}
                className={cn('px-3 py-1.5 text-[12px] rounded-input border transition-all',
                  cfg.frecuencia === f.value ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                    : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-white light:border-[#E4E4E4] light:text-[#404040]')}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {cfg.frecuencia === 'horas' && (
            <Campo label="Cada (horas)" value={cfg.cadaHoras} onChange={v => num('cadaHoras', v)} />
          )}
          {cfg.frecuencia === 'diario' && (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] text-[#A0A0A0] light:text-[#404040]">Hora diaria</label>
              <input type="time" value={cfg.horaDiaria} onChange={e => setCfg(c => ({ ...c, horaDiaria: e.target.value }))}
                className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            </div>
          )}
          <Campo label="Límite de backups" value={cfg.limite} onChange={v => num('limite', v)} />
          <Campo label="Umbral espacio libre (MB)" value={cfg.umbralEspacioMB} onChange={v => num('umbralEspacioMB', v)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-[#A0A0A0] light:text-[#404040]">Destinos (hasta 3 — carpeta local o de red)</label>
          {[0, 1, 2].map(i => (
            <input key={i} value={cfg.destinos[i] ?? ''} onChange={e => setCfg(c => { const d = [...c.destinos]; d[i] = e.target.value; return { ...c, destinos: d } })}
              placeholder={`Destino ${i + 1} (ej: C:\\Backups o \\\\servidor\\backups)`}
              className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          ))}
        </div>
        <Button className="self-start" onClick={guardarCfg}>{ok ? <><Check size={15} className="mr-1.5" />Guardado</> : 'Guardar configuración'}</Button>
      </div>

      {/* Historial */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Historial de backups</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2">Fecha</th><th className="font-medium px-3 py-2">Ruta</th>
              <th className="font-medium px-3 py-2">Tipo</th><th className="font-medium px-3 py-2">Estado</th><th className="font-medium px-3 py-2 w-20"></th>
            </tr></thead>
            <tbody>
              {backups.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-[#606060]">Sin backups registrados</td></tr>}
              {backups.map(b => (
                <tr key={b.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2 text-[#A0A0A0] light:text-[#404040] tabular-nums">{format(new Date(b.creadoEn), 'dd/MM/yy HH:mm')}</td>
                  <td className="px-3 py-2 text-[#606060] truncate max-w-[220px]" title={b.ruta}>{b.ruta}</td>
                  <td className="px-3 py-2 text-[#A0A0A0] light:text-[#404040]">{b.tipo}</td>
                  <td className="px-3 py-2"><Badge label={b.estado === 'ok' ? 'OK' : 'Corrupto'} variant={b.estado === 'ok' ? 'success' : 'error'} /></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setRestaurar({ ruta: b.ruta })} className="text-[12px] text-[#606060] hover:text-white light:hover:text-black transition-colors inline-flex items-center gap-1"><Download size={12} />Restaurar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={restaurar != null} onClose={() => setRestaurar(null)} title="Restaurar backup" maxWidth="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setRestaurar(null)} disabled={trabajando}>Cancelar</Button>
          <Button onClick={restaurarFila} disabled={trabajando}>{trabajando ? 'Restaurando…' : 'Restaurar'}</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">Se hará un backup pre-operación automático y luego se reemplazará la base actual. La app se reiniciará.</p>
        <p className="text-[11px] text-[#606060] break-all">{restaurar?.ruta}</p>
      </Modal>
    </div>
  )
}

const Campo = ({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[12px] text-[#A0A0A0] light:text-[#404040]">{label}</label>
    <input type="number" min={0} value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
  </div>
)
