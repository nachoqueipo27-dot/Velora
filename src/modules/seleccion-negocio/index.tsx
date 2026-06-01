import { useState } from 'react'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { BotonAtras } from '../../components/ui/BotonAtras'
import { useNegocioStore } from '../../store/negocioStore'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { SeleccionEmpresa } from './SeleccionEmpresa'
import { SeleccionLocal } from './SeleccionLocal'
import type { EmpresaRow, LocalRow } from '../../db/master'

const SeleccionNegocio = () => {
  const { seleccionarNegocio } = useNegocioStore()
  const { logout: logoutGlobal } = useAuthGlobalStore()
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
      <BotonAtras
        label={empresa ? 'Empresas' : 'Cerrar sesión'}
        onClick={() => { if (empresa) setEmpresa(null); else logoutGlobal() }}
      />
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <VeloraLogo size={56} variant="auto" />
        <div className="w-full">
          {empresa
            ? <SeleccionLocal empresa={empresa} onSelect={onLocal} onBack={() => setEmpresa(null)} />
            : <SeleccionEmpresa onSelect={setEmpresa} />}
        </div>
      </div>
    </div>
  )
}

export default SeleccionNegocio
