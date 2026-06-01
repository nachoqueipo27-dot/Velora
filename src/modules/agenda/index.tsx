import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { useAgendaStore } from '../../store/agendaStore'
import type { Cita, VistaAgenda } from '../../types/agenda'
import { NavegadorFecha } from './components/NavegadorFecha'
import { VistaDiaria } from './VistaDiaria'
import { VistaSemanal } from './VistaSemanal'
import { VistaMensual } from './VistaMensual'
import { ModalCita } from './ModalCita'
import { Plus } from 'lucide-react'

const VISTAS: { id: VistaAgenda; label: string }[] = [
  { id: 'diaria',  label: 'Diaria' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensual', label: 'Mensual' },
]

const Agenda = () => {
  const { vistaActiva, setVista, fechaActiva, recargarRango, citaSeleccionada, seleccionar } = useAgendaStore()
  const [modal, setModal] = useState<{ open: boolean; fecha: Date | null }>({ open: false, fecha: null })

  useEffect(() => { recargarRango() }, [recargarRango])

  const nuevaEn = (fecha: Date) => setModal({ open: true, fecha })
  const verCita = (c: Cita) => { seleccionar(c) }
  const irADia = (fecha: Date) => { useAgendaStore.setState({ fechaActiva: fecha, vistaActiva: 'diaria' }); recargarRango() }

  const cerrarModal = () => { setModal({ open: false, fecha: null }); seleccionar(null) }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {VISTAS.map(v => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className={cn('px-3 py-1.5 text-[13px] rounded-[6px] transition-all duration-150',
                vistaActiva === v.id ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
              {v.label}
            </button>
          ))}
        </div>
        <NavegadorFecha />
        <div className="flex-1" />
        <Button size="sm" onClick={() => setModal({ open: true, fecha: new Date(fechaActiva) })}><Plus size={14} className="mr-1.5" /> Nueva cita</Button>
      </div>

      {/* Vista activa */}
      <div className="flex-1 overflow-hidden rounded-card border border-[#2A2A2A] light:border-[#E4E4E4]">
        {vistaActiva === 'diaria' && <VistaDiaria onNuevaEn={nuevaEn} onVerCita={verCita} />}
        {vistaActiva === 'semanal' && <VistaSemanal onNuevaEn={nuevaEn} onVerCita={verCita} />}
        {vistaActiva === 'mensual' && <VistaMensual onIrADia={irADia} onVerCita={verCita} onNuevaEn={nuevaEn} />}
      </div>

      <ModalCita
        open={modal.open || citaSeleccionada !== null}
        cita={citaSeleccionada}
        fechaInicial={modal.fecha}
        onClose={cerrarModal}
      />
    </div>
  )
}

export default Agenda
