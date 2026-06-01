import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { usePosStore } from '../../store/posStore'
import { useSessionStore } from '../../store/sessionStore'
import { useNegocio } from '../../hooks/useNegocio'
import { useOnboardingStore } from '../../store/onboardingStore'
import { imprimirTicket } from '../../lib/ticket/generarTicket'
import { FORMAS_PAGO, type VentaPOS } from '../../types/pos'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface ModalConfirmacionProps {
  open: boolean
  onClose: () => void
  onVenta: (v: VentaPOS) => void
}

export const ModalConfirmacion = ({ open, onClose, onVenta }: ModalConfirmacionProps) => {
  const { carrito, formaPago, procesando, calcularTotal, calcularSubtotal, calcularDescuentoGlobal, confirmarVenta, empleadoPOS } = usePosStore()
  const { usuario } = useSessionStore()
  const negocio = useNegocio()
  const anchoPapel = useOnboardingStore(s => s.data.anchoPapel) ?? '80mm'
  const [recibido, setRecibido] = useState('')
  const [imprimir, setImprimir] = useState(true)

  useEffect(() => { if (open) setRecibido('') }, [open])

  const total = calcularTotal()
  const recibidoNum = Number(recibido) || 0
  const vuelto = recibidoNum - total
  const insuficiente = formaPago === 'efectivo' && recibido !== '' && recibidoNum < total
  const empleadoNombre = empleadoPOS?.nombre ?? usuario?.nombre ?? 'Sistema'
  const formaLabel = FORMAS_PAGO.find(f => f.value === formaPago)?.label

  const puedeConfirmar = !procesando && carrito.length > 0 && !insuficiente

  const handleConfirmar = async () => {
    const subtotal = calcularSubtotal()
    const descuento = calcularDescuentoGlobal()
    const venta = await confirmarVenta()
    if (venta) {
      if (imprimir) {
        await imprimirTicket({
          negocio: { nombre: negocio.nombre, direccion: negocio.direccion, telefono: negocio.telefono },
          numero: String(venta.numero).padStart(3, '0'),
          cliente: null,
          items: venta.items.map(it => ({ nombre: it.nombre, cantidad: it.cantidad, precio: it.subtotal })),
          subtotal, descuento, total: venta.totalFinal,
          formaPago: formaLabel ?? venta.formaPago, fecha: format(new Date(), 'dd/MM/yyyy HH:mm'), anchoPapel,
        })
      }
      onVenta(venta)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmar venta" maxWidth="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={procesando}>Cancelar</Button>
        <Button onClick={handleConfirmar} disabled={!puedeConfirmar}>{procesando ? 'Cobrando...' : 'Confirmar y cobrar'}</Button>
      </>}>
      <div className="flex flex-col gap-3 pb-1">
        {/* Items */}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {carrito.map(it => (
            <div key={it.productoId} className="flex items-center justify-between text-[13px]">
              <span className="text-[#A0A0A0] light:text-[#404040] truncate">{it.cantidad}× {it.nombre}</span>
              <span className="text-white light:text-black">{money(it.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-baseline pt-2 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
          <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total</span>
          <span className="text-2xl font-bold text-white light:text-black">{money(total)}</span>
        </div>

        <div className="flex justify-between text-[13px]">
          <span className="text-[#606060]">Forma de pago</span>
          <span className="text-white light:text-black">{formaLabel}</span>
        </div>

        {/* Efectivo: vuelto */}
        {formaPago === 'efectivo' && (
          <div className="flex flex-col gap-2 rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-[#A0A0A0] light:text-[#404040]">Monto recibido</label>
              <input type="number" min={0} value={recibido} onChange={e => setRecibido(e.target.value)} autoFocus
                className="w-32 px-2 py-1 text-sm text-right rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
            </div>
            {recibido !== '' && (
              insuficiente
                ? <span className="text-[13px] text-[#C0392B] text-right">Monto insuficiente</span>
                : <div className="flex items-center justify-between"><span className="text-[13px] text-[#606060]">Vuelto</span><span className="text-base font-semibold text-[#4CAF7D]">{money(vuelto)}</span></div>
            )}
          </div>
        )}

        <div className="flex justify-between text-[11px] text-[#606060]">
          <span>Vendedor</span><span className="text-[#A0A0A0]">{empleadoNombre}</span>
        </div>

        <button onClick={() => setImprimir(v => !v)}
          className="flex items-center gap-2 text-[12px] text-[#A0A0A0] light:text-[#404040] hover:text-white light:hover:text-black transition-colors">
          <span className={`w-4 h-4 rounded border flex items-center justify-center ${imprimir ? 'bg-white border-white light:bg-black light:border-black' : 'border-[#606060]'}`}>
            {imprimir && <Printer size={10} className="text-black light:text-white" />}
          </span>
          Imprimir ticket al cobrar
        </button>
      </div>
    </Modal>
  )
}
