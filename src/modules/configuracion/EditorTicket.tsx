import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useConfigStore, type BloqueConfig, type TicketConfig } from '../../store/configStore'
import { useNegocio } from '../../hooks/useNegocio'
import { ListaBloques } from './components/ListaBloques'
import { Button } from '../../components/ui/Button'
import { imprimirTicket } from '../../lib/ticket/generarTicket'
import { Check, Printer, Save } from 'lucide-react'

const TIPOS_TICKET = ['encabezado', 'datos_negocio', 'fecha', 'fecha_hora', 'numero_ot', 'cliente', 'productos', 'total', 'forma_pago', 'separador', 'texto_libre', 'pie_pagina', 'espacio_en_blanco']

const DEMO_ITEMS = [{ nombre: 'Combo Hamburguesa', cantidad: 1, precio: 2500 }, { nombre: 'Gaseosa 500ml', cantidad: 2, precio: 800 }]

export const EditorTicket = () => {
  const { ticket, guardarTicket } = useConfigStore()
  const negocio = useNegocio()
  const [cfg, setCfg] = useState<TicketConfig>(ticket ?? { bloques: [], anchoPapel: '80mm', impresoraNombre: null })
  const [ok, setOk] = useState(false)

  useEffect(() => { if (ticket) setCfg(ticket) }, [ticket])

  const ancho = cfg.anchoPapel === '58mm' ? 32 : 48
  const linea = '─'.repeat(ancho)
  const centrar = (t: string) => ' '.repeat(Math.max(0, Math.floor((ancho - t.length) / 2))) + t
  const col2 = (i: string, d: string) => i + ' '.repeat(Math.max(1, ancho - i.length - d.length)) + d

  const renderBloque = (b: BloqueConfig): string[] => {
    switch (b.tipo) {
      case 'encabezado': return [centrar(negocio.nombre || 'MI NEGOCIO')]
      case 'datos_negocio': return [centrar(negocio.direccion || 'Dirección'), centrar(negocio.telefono || 'Tel: —')]
      case 'fecha': return [`Fecha: ${new Date().toLocaleDateString('es-AR')}`]
      case 'fecha_hora': return [`Fecha: ${new Date().toLocaleString('es-AR')}`]
      case 'numero_ot': return ['N° 001']
      case 'cliente': return ['Cliente: Juan Pérez']
      case 'productos': return DEMO_ITEMS.map(i => col2(`${i.cantidad}x ${i.nombre}`, `$${i.precio}`))
      case 'total': return [col2('TOTAL:', '$4.100')]
      case 'forma_pago': return [col2('Forma de pago:', 'Efectivo')]
      case 'separador': return [linea]
      case 'texto_libre': return b.texto ? [b.texto] : ['']
      case 'pie_pagina': return [centrar(b.texto || '¡Gracias!')]
      case 'espacio_en_blanco': return ['']
      default: return ['']
    }
  }

  const lineas = cfg.bloques.filter(b => b.activo).flatMap(renderBloque)

  const guardar = async () => { await guardarTicket(cfg); setOk(true); setTimeout(() => setOk(false), 2000) }

  const imprimirPrueba = () => imprimirTicket({
    negocio: { nombre: negocio.nombre, direccion: negocio.direccion, telefono: negocio.telefono },
    numero: '001', cliente: 'Juan Pérez', items: DEMO_ITEMS,
    subtotal: 4100, descuento: 0, total: 4100, formaPago: 'Efectivo',
    fecha: new Date().toLocaleString('es-AR'), anchoPapel: cfg.anchoPapel,
  })

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Editor de ticket</h2>
          <p className="text-[12px] text-[#606060]">Arrastrá los bloques para reordenar. El preview se actualiza en vivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] p-1">
            {(['58mm', '80mm'] as const).map(a => (
              <button key={a} onClick={() => setCfg(c => ({ ...c, anchoPapel: a }))}
                className={cn('px-2.5 py-1 text-[12px] rounded-[6px] transition-all',
                  cfg.anchoPapel === a ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] light:text-[#404040]')}>{a}</button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={imprimirPrueba}><Printer size={14} className="mr-1.5" />Prueba</Button>
          <Button size="sm" onClick={guardar}>{ok ? <><Check size={14} className="mr-1.5" />Guardado</> : <><Save size={14} className="mr-1.5" />Guardar</>}</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-5">
        <ListaBloques bloques={cfg.bloques} onChange={b => setCfg(c => ({ ...c, bloques: b }))} tiposDisponibles={TIPOS_TICKET} />
        <div className="flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2">Vista previa · {cfg.anchoPapel}</span>
          <div className="bg-white text-black rounded-card shadow-lg p-4 overflow-x-auto" style={{ width: cfg.anchoPapel === '58mm' ? 260 : 360 }}>
            <pre className="font-mono text-[10px] leading-[1.5] whitespace-pre">{lineas.join('\n') || '(sin bloques activos)'}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
