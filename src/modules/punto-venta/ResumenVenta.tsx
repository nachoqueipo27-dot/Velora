import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { usePosStore } from '../../store/posStore'
import { FORMAS_PAGO } from '../../types/pos'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface ResumenVentaProps { onConfirmar: () => void }

export const ResumenVenta = ({ onConfirmar }: ResumenVentaProps) => {
  const {
    carrito, descuentoGlobal, tipoDescuentoGlobal, formaPago,
    setDescuentoGlobal, setFormaPago, calcularSubtotal, calcularDescuentoGlobal, calcularTotal,
  } = usePosStore()

  const subtotal = calcularSubtotal()
  const desc = calcularDescuentoGlobal()
  const total = calcularTotal()
  const vacio = carrito.length === 0

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
      <div className="flex justify-between text-sm">
        <span className="text-[#606060]">Subtotal</span>
        <span className="text-white light:text-black">{money(subtotal)}</span>
      </div>

      {/* Descuento global */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#606060] text-sm">Descuento</span>
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} value={descuentoGlobal || ''} placeholder="0"
            onChange={e => setDescuentoGlobal(Number(e.target.value), tipoDescuentoGlobal)}
            className="w-20 px-2 py-1 text-sm text-right rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
          <div className="flex gap-0.5 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
            {(['porcentaje', 'monto'] as const).map(t => (
              <button key={t} onClick={() => setDescuentoGlobal(descuentoGlobal, t)}
                className={cn('px-2 py-1 text-[11px] rounded-[5px] transition-all',
                  tipoDescuentoGlobal === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0]')}>
                {t === 'porcentaje' ? '%' : '$'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {desc > 0 && <div className="flex justify-between text-[11px] -mt-1"><span /><span className="text-[#C0392B]">- {money(desc)}</span></div>}

      {/* Total */}
      <div className="flex justify-between items-baseline pt-2 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total</span>
        <span className="text-2xl font-bold text-white light:text-black">{money(total)}</span>
      </div>

      {/* Forma de pago */}
      <div className="grid grid-cols-3 gap-2">
        {FORMAS_PAGO.map(f => (
          <button key={f.value} onClick={() => setFormaPago(f.value)}
            className={cn('px-2 py-2.5 rounded-input border text-[12px] font-medium transition-all',
              formaPago === f.value
                ? 'border-white bg-white/[0.08] text-white light:border-black light:bg-black/[0.06] light:text-black'
                : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black')}>
            {f.label}
          </button>
        ))}
      </div>

      <Button size="lg" onClick={onConfirmar} disabled={vacio} className="w-full">Confirmar venta</Button>
    </div>
  )
}
