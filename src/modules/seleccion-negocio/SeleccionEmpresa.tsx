import { useEffect, useState } from 'react'
import { getEmpresas, getAsignacionesPorDni, type EmpresaRow } from '../../db/master'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { NegocioCard } from './components/NegocioCard'
import { ModalNuevoNegocio } from './ModalNuevoNegocio'
import { Building2, Plus } from 'lucide-react'

interface SeleccionEmpresaProps {
  onSelect: (empresa: EmpresaRow) => void
}

export const SeleccionEmpresa = ({ onSelect }: SeleccionEmpresaProps) => {
  const { usuario } = useAuthGlobalStore()
  const [empresas, setEmpresas] = useState<EmpresaRow[] | null>(null)
  const [modal, setModal] = useState(false)

  // Admin General ve todas; usuario local solo sus empresas asignadas.
  const cargar = async () => {
    const todas = await getEmpresas()
    if (usuario?.esAdminGeneral || !usuario?.dni) {
      setEmpresas(todas)
      return
    }
    const asignaciones = await getAsignacionesPorDni(usuario.dni)
    const empresaIds = new Set(asignaciones.map(a => a.empresaId))
    setEmpresas(todas.filter(e => empresaIds.has(e.id)))
  }
  useEffect(() => { cargar() }, [])

  return (
    <div className="flex flex-col gap-5 animate-fade-slide-down">
      <h1 className="text-xl font-semibold text-white light:text-black text-center">Seleccioná tu negocio</h1>

      {empresas === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-card animate-shimmer" />
          ))}
        </div>
      ) : empresas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Building2 size={32} className="text-[#606060]" />
          <p className="text-sm text-[#808080]">No hay empresas registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {empresas.map(e => (
            <NegocioCard key={e.id} nombre={e.nombre} logo={e.logo}
              subtitulo="Ver locales" onClick={() => onSelect(e)} />
          ))}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 text-[13px] text-[#808080] hover:text-white light:hover:text-black transition-colors">
          <Plus size={15} /> Agregar empresa
        </button>
      </div>

      <ModalNuevoNegocio open={modal} modo="empresa" onClose={() => setModal(false)} onCreado={cargar} />
    </div>
  )
}
