import { Fragment, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { getDb } from '../../db'
import { Button } from '../../components/ui/Button'
import type { RegistroActividad } from '../../store/configStore'
import { ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

const PAGE = 50

export const HistorialActividad = () => {
  const [registros, setRegistros] = useState<RegistroActividad[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [usuarios, setUsuarios] = useState<string[]>([])
  const [modulos, setModulos] = useState<string[]>([])
  const [fUsuario, setFUsuario] = useState('')
  const [fModulo, setFModulo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [expandida, setExpandida] = useState<number | null>(null)

  const cargar = async () => {
    const db = await getDb()
    const where: string[] = []
    const params: any[] = []
    if (fUsuario) { where.push('usuario = ?'); params.push(fUsuario) }
    if (fModulo) { where.push('modulo = ?'); params.push(fModulo) }
    if (desde) { where.push('substr(fecha,1,10) >= ?'); params.push(desde) }
    if (hasta) { where.push('substr(fecha,1,10) <= ?'); params.push(hasta) }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const cnt = await db.select<{ n: number }[]>(`SELECT COUNT(*) as n FROM historial_actividad ${clause}`, params)
    setTotal(cnt[0]?.n ?? 0)
    const rows = await db.select<any[]>(
      `SELECT * FROM historial_actividad ${clause} ORDER BY id DESC LIMIT ${PAGE} OFFSET ${pagina * PAGE}`, params)
    setRegistros(rows.map(r => ({
      id: r.id, usuario: r.usuario, modulo: r.modulo, accion: r.accion, detalle: r.detalle ?? null,
      entidadTipo: r.entidad_tipo ?? null, entidadId: r.entidad_id ?? null,
      campoAnterior: r.campo_anterior ?? null, campoNuevo: r.campo_nuevo ?? null, fecha: r.fecha,
    })))
  }

  useEffect(() => { cargar() }, [pagina, fUsuario, fModulo, desde, hasta])
  useEffect(() => {
    (async () => {
      const db = await getDb()
      const u = await db.select<{ usuario: string }[]>('SELECT DISTINCT usuario FROM historial_actividad ORDER BY usuario')
      const m = await db.select<{ modulo: string }[]>('SELECT DISTINCT modulo FROM historial_actividad ORDER BY modulo')
      setUsuarios(u.map(x => x.usuario)); setModulos(m.map(x => x.modulo))
    })()
  }, [registros.length])

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE))
  const fmtJson = (s: string | null) => { if (!s) return '—'; try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s } }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Historial de actividad</h2>
          <p className="text-[12px] text-[#606060]">{total} registro{total !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => console.log('[Excel placeholder] Historial de actividad', registros)}>
          <FileSpreadsheet size={14} className="mr-1.5" />Exportar Excel
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Usuario</label>
          <select value={fUsuario} onChange={e => { setPagina(0); setFUsuario(e.target.value) }}
            className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
            <option value="">Todos</option>{usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Módulo</label>
          <select value={fModulo} onChange={e => { setPagina(0); setFModulo(e.target.value) }}
            className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
            <option value="">Todos</option>{modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Desde</label>
          <input type="date" value={desde} onChange={e => { setPagina(0); setDesde(e.target.value) }}
            className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[#606060]">Hasta</label>
          <input type="date" value={hasta} onChange={e => { setPagina(0); setHasta(e.target.value) }}
            className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
        </div>
      </div>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <th className="font-medium px-3 py-2.5 w-8"></th>
            <th className="font-medium px-3 py-2.5">Fecha</th>
            <th className="font-medium px-3 py-2.5">Usuario</th>
            <th className="font-medium px-3 py-2.5">Módulo</th>
            <th className="font-medium px-3 py-2.5">Acción</th>
            <th className="font-medium px-3 py-2.5">Detalle</th>
          </tr></thead>
          <tbody>
            {registros.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#606060]">Sin registros</td></tr>}
            {registros.map(r => {
              const tieneDetalle = r.campoAnterior || r.campoNuevo
              return (
                <Fragment key={r.id}>
                  <tr className={cn('border-b border-[#1C1C1C] light:border-[#F0F0F0]', tieneDetalle && 'cursor-pointer hover:bg-white/[0.02] light:hover:bg-black/[0.02]')}
                    onClick={() => tieneDetalle && setExpandida(expandida === r.id ? null : r.id)}>
                    <td className="px-3 py-2.5 text-[#606060]">{tieneDetalle ? (expandida === r.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : ''}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040] tabular-nums">{format(new Date(r.fecha), 'dd/MM/yy HH:mm')}</td>
                    <td className="px-3 py-2.5 text-white light:text-black">{r.usuario}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{r.modulo}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{r.accion}</td>
                    <td className="px-3 py-2.5 text-[#606060] truncate max-w-[200px]">{r.detalle ?? '—'}</td>
                  </tr>
                  {expandida === r.id && tieneDetalle && (
                    <tr className="bg-[#0F0F0F] light:bg-[#FAFAFA] border-b border-[#1C1C1C] light:border-[#F0F0F0]">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-[11px] text-[#606060]">Anterior</span><pre className="text-[11px] text-[#A0A0A0] light:text-[#404040] mt-1 whitespace-pre-wrap">{fmtJson(r.campoAnterior)}</pre></div>
                          <div><span className="text-[11px] text-[#606060]">Nuevo</span><pre className="text-[11px] text-[#A0A0A0] light:text-[#404040] mt-1 whitespace-pre-wrap">{fmtJson(r.campoNuevo)}</pre></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}>Anterior</Button>
          <span className="text-[12px] text-[#606060]">Página {pagina + 1} de {totalPaginas}</span>
          <Button size="sm" variant="secondary" onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}
