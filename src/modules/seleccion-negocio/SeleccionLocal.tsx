import { useEffect, useState } from 'react'
import { getLocalesByEmpresa, type EmpresaRow, type LocalRow } from '../../db/master'
import { NegocioCard } from './components/NegocioCard'
import { ModalNuevoNegocio } from './ModalNuevoNegocio'
import { Store, Plus, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface SeleccionLocalProps {
  empresa: EmpresaRow
  onSelect: (local: LocalRow) => void
  onBack: () => void
}

const subtituloLocal = (l: LocalRow): string => {
  const partes: string[] = []
  if (l.direccion) partes.push(l.direccion)
  if (l.ultima_sync) {
    try { partes.push(`Última sync: hace ${formatDistanceToNow(new Date(l.ultima_sync), { locale: es })}`) }
    catch { /* ignora fechas inválidas */ }
  }
  return partes.join(' · ')
}

export const SeleccionLocal = ({ empresa, onSelect, onBack }: SeleccionLocalProps) => {
  const [locales, setLocales] = useState<LocalRow[] | null>(null)
  const [modal, setModal] = useState(false)

  const cargar = async () => setLocales(await getLocalesByEmpresa(empresa.id))
  useEffect(() => { cargar() }, [empresa.id])

  return (
    <div className="flex flex-col gap-5 animate-fade-slide-down">
      <div className="flex items-center justify-center gap-2 relative">
        <button onClick={onBack} aria-label="Volver a empresas"
          className="absolute left-0 p-1.5 rounded-input text-[#808080] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-semibold text-white light:text-black text-center">
          {empresa.nombre} — Seleccioná local
        </h1>
      </div>

      {locales === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-card animate-shimmer" />)}
        </div>
      ) : locales.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Store size={32} className="text-[#606060]" />
          <p className="text-sm text-[#808080]">No hay locales registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {locales.map(l => (
            <NegocioCard key={l.id} nombre={l.nombre} logo={l.logo}
              subtitulo={subtituloLocal(l)} onClick={() => onSelect(l)} />
          ))}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 text-[13px] text-[#808080] hover:text-white light:hover:text-black transition-colors">
          <Plus size={15} /> Agregar local
        </button>
      </div>

      <ModalNuevoNegocio open={modal} modo="local" empresaId={empresa.id} onClose={() => setModal(false)} onCreado={cargar} />
    </div>
  )
}
