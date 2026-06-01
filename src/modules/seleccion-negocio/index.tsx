import { useState } from 'react'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { useNegocioStore } from '../../store/negocioStore'
import { SeleccionEmpresa } from './SeleccionEmpresa'
import { SeleccionLocal } from './SeleccionLocal'
import type { EmpresaRow, LocalRow } from '../../db/master'

const SeleccionNegocio = () => {
  const { seleccionarNegocio } = useNegocioStore()
  const [empresa, setEmpresa] = useState<EmpresaRow | null>(null)

  const onLocal = (local: LocalRow) => {
    if (!empresa) return
    seleccionarNegocio({
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      empresaLogo: empresa.logo,
      localId: local.id,
      localNombre: local.nombre,
      localDireccion: local.direccion,
      localRemoteId: local.remote_id,
      localApiKey: local.api_key,
      ultimaSync: local.ultima_sync,
    })
    // App.tsx reacciona al negocioActivo y avanza a Onboarding/Login.
  }

  return (
    <div className={cn(
      'h-screen w-screen flex items-center justify-center p-6 overflow-y-auto',
      'bg-[#0A0A0A] text-white light:bg-[#FAFAFA] light:text-[#0A0A0A]',
    )}>
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <VeloraLogo size={56} variant="auto" />
        <div className="w-full">
          {empresa
            ? <SeleccionLocal empresa={empresa} onSelect={onLocal} onBack={() => setEmpresa(null)} />
            : <SeleccionEmpresa onSelect={setEmpresa} />}
        </div>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={async () => {
            localStorage.clear()
            const dbs = await window.indexedDB.databases?.() ?? []
            for (const db of dbs) {
              if (db.name) window.indexedDB.deleteDatabase(db.name)
            }
            window.location.reload()
          }}
          className="fixed bottom-20 right-4 px-3 py-1.5 text-[11px]
                     bg-[#C0392B]/20 text-[#C0392B] rounded-input
                     hover:bg-[#C0392B]/30 transition-all duration-150
                     border border-[#C0392B]/30"
        >
          DEV: Reset completo
        </button>
      )}
    </div>
  )
}

export default SeleccionNegocio
