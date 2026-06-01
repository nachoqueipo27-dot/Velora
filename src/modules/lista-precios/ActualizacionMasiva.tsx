import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useListaPreciosStore } from '../../store/listaPreciosStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { toast } from '../../store/toastStore'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const ActualizacionMasiva = () => {
  const { previsualizacion, cargarItems, previsualizarAumento, cancelarPrevisualizacion, aplicarAumento } = useListaPreciosStore()
  const { categorias, cargarCategorias } = useInventarioStore()
  const [porcentaje, setPorcentaje] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => { cargarItems(); cargarCategorias() }, [cargarItems, cargarCategorias])

  const pct = Number(porcentaje)
  const pctValido = porcentaje !== '' && !isNaN(pct) && pct !== 0

  const totales = useMemo(() => {
    if (!previsualizacion) return null
    const afectados = previsualizacion.length
    const impacto = previsualizacion.reduce((s, i) => s + ((i.precioNuevo ?? 0) - i.precioActual), 0)
    return { afectados, promedio: afectados ? impacto / afectados : 0 }
  }, [previsualizacion])

  const handlePrevisualizar = () => {
    if (!pctValido) return
    previsualizarAumento(pct, categoriaId === '' ? null : Number(categoriaId))
  }

  const handleAplicar = async () => {
    await aplicarAumento(pct, categoriaId === '' ? null : Number(categoriaId), motivo.trim() || undefined)
    setConfirmar(false)
    setPorcentaje(''); setMotivo('')
    toast.success('Precios actualizados correctamente')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* Configuración */}
      <Card className="mb-4 hover:border-[#2A2A2A]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Configuración del aumento</span>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input label="Porcentaje (%)" type="number" value={porcentaje} onChange={e => setPorcentaje(e.target.value)}
            placeholder="Ej. 15 (o -10 para bajar)" hint="Positivo aumenta, negativo reduce" />
          <Select label="Categoría" value={categoriaId} onChange={e => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
          </Select>
        </div>
        <div className="mt-3">
          <Textarea label="Motivo (opcional)" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Ajuste por inflación de marzo" />
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={handlePrevisualizar} disabled={!pctValido}>Previsualizar</Button>
        </div>
      </Card>

      {/* Previsualización */}
      {previsualizacion && (
        <Card className="hover:border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Previsualización</span>
            <div className="flex gap-4 text-[11px]">
              <span className="text-[#606060]">Productos: <span className="text-white light:text-black">{totales?.afectados}</span></span>
              <span className="text-[#606060]">Impacto prom.: <span className={cn(totales && totales.promedio >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{money(totales?.promedio ?? 0)}</span></span>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Producto</th>
                <th className="text-right font-medium px-3 py-2">Actual</th>
                <th className="text-right font-medium px-3 py-2">Nuevo</th>
                <th className="text-right font-medium px-3 py-2">Var. $</th>
                <th className="text-right font-medium px-3 py-2">Var. %</th>
              </tr></thead>
              <tbody>
                {previsualizacion.map(i => {
                  const nuevo = i.precioNuevo ?? i.precioActual
                  const varAbs = nuevo - i.precioActual
                  const sube = varAbs >= 0
                  return (
                    <tr key={i.productoId} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <td className="px-3 py-2 text-white light:text-black">{i.nombre}</td>
                      <td className="px-3 py-2 text-right text-[#A0A0A0] light:text-[#404040]">{money(i.precioActual)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', sube ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{money(nuevo)}</td>
                      <td className={cn('px-3 py-2 text-right', sube ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{sube ? '+' : ''}{money(varAbs)}</td>
                      <td className="px-3 py-2 text-right text-[#A0A0A0] light:text-[#404040]">{i.variacion?.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={cancelarPrevisualizacion}>Cancelar previsualización</Button>
            <Button size="sm" onClick={() => setConfirmar(true)} disabled={previsualizacion.length === 0}>Aplicar actualización</Button>
          </div>
        </Card>
      )}

      {/* Confirmación */}
      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Confirmar actualización"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmar(false)}>Cancelar</Button>
          <Button onClick={handleAplicar}>Confirmar</Button>
        </>}>
        <p className="text-sm text-white light:text-black pb-1">¿Aplicar aumento de {pct}% a {previsualizacion?.length ?? 0} productos?</p>
        <p className="text-[11px] text-[#606060] pb-2">Esta acción actualizará los precios y quedará registrada en el historial.</p>
      </Modal>
    </div>
  )
}
