import { useRef, useState } from 'react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { ImagePlus, ZoomIn, ZoomOut, Check, Trash2 } from 'lucide-react'

interface ImagenCropperProps {
  value: string | null
  onChange: (base64: string | null) => void
}

const ASPECT = 1080 / 720 // 3:2
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

interface CropBox { x: number; y: number; w: number; h: number }

export const ImagenCropper = ({ value, onChange }: ImagenCropperProps) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [error, setError] = useState<string | null>(null)
  const drag = useRef<{ ox: number; oy: number; bx: number; by: number } | null>(null)

  const cargarArchivo = (file: File) => {
    setError(null)
    if (!TIPOS_OK.includes(file.type)) { setError('Formato no soportado (usá JPG, PNG o WEBP)'); return }
    if (file.size > MAX_BYTES) { setError('La imagen supera los 10MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setSrc(reader.result as string); setCrop(null) }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) cargarArchivo(f)
  }

  const onImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    const dw = img.clientWidth, dh = img.clientHeight
    let w = Math.min(dw, dh * ASPECT)
    let h = w / ASPECT
    if (h > dh) { h = dh; w = h * ASPECT }
    setCrop({ x: (dw - w) / 2, y: (dh - h) / 2, w, h })
  }

  const clamp = (b: CropBox): CropBox => {
    const img = imgRef.current
    if (!img) return b
    const dw = img.clientWidth, dh = img.clientHeight
    const w = Math.min(b.w, dw), h = Math.min(b.h, dh)
    return {
      w, h,
      x: Math.max(0, Math.min(b.x, dw - w)),
      y: Math.max(0, Math.min(b.y, dh - h)),
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!crop) return
    drag.current = { ox: e.clientX, oy: e.clientY, bx: crop.x, by: crop.y }
    const move = (ev: PointerEvent) => {
      if (!drag.current) return
      setCrop(c => c && clamp({ ...c, x: drag.current!.bx + (ev.clientX - drag.current!.ox), y: drag.current!.by + (ev.clientY - drag.current!.oy) }))
    }
    const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const zoom = (factor: number) => {
    setCrop(c => {
      if (!c) return c
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2
      let w = c.w * factor
      const img = imgRef.current
      if (img) w = Math.min(w, img.clientWidth, img.clientHeight * ASPECT)
      w = Math.max(40, w)
      const h = w / ASPECT
      return clamp({ x: cx - w / 2, y: cy - h / 2, w, h })
    })
  }

  const confirmar = () => {
    const img = imgRef.current
    if (!img || !crop) return
    const scaleX = img.naturalWidth / img.clientWidth
    const scaleY = img.naturalHeight / img.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, 1080, 720)
    onChange(canvas.toDataURL('image/jpeg', 0.9))
    setSrc(null); setCrop(null)
  }

  const limpiar = () => { onChange(null); setSrc(null); setCrop(null); setError(null) }

  // ── Modo recorte ──
  if (src) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative inline-block select-none overflow-hidden rounded-card border border-[#2A2A2A] light:border-[#E4E4E4]">
          <img ref={imgRef} src={src} onLoad={onImgLoad} className="block w-full h-auto max-h-[300px] object-contain pointer-events-none" alt="" />
          {crop && (
            <div
              onPointerDown={onPointerDown}
              className="absolute border-2 border-white cursor-move"
              style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            >
              {/* Grilla 3x3 */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/30" />)}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => zoom(0.85)}><ZoomIn size={14} /></Button>
          <Button size="sm" variant="secondary" onClick={() => zoom(1 / 0.85)}><ZoomOut size={14} /></Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => { setSrc(null); setCrop(null) }}>Cancelar</Button>
          <Button size="sm" onClick={confirmar}><Check size={14} className="mr-1.5" /> Recortar</Button>
        </div>
        <span className="text-[11px] text-[#606060]">Salida: 1080 × 720 px · arrastrá el recuadro y usá el zoom</span>
      </div>
    )
  }

  // ── Preview de imagen ya recortada ──
  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <img src={value} className="w-full h-auto object-cover" alt="Producto" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Cambiar imagen</Button>
          <Button size="sm" variant="ghost" onClick={limpiar}><Trash2 size={14} className="mr-1.5" /> Limpiar</Button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) cargarArchivo(f) }} />
      </div>
    )
  }

  // ── Zona de upload ──
  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-card border border-dashed cursor-pointer py-10 px-4 text-center transition-colors',
          'border-[#2A2A2A] text-[#606060] hover:border-[#3A3A3A] hover:text-[#A0A0A0]',
          'light:border-[#E4E4E4] light:hover:border-[#D0D0D0]',
        )}
      >
        <ImagePlus size={24} />
        <span className="text-[13px]">Arrastrá o hacé click para subir</span>
        <span className="text-[11px] text-[#606060]">JPG, PNG o WEBP · máx 10MB · salida 1080×720</span>
      </div>
      {error && <span className="text-[11px] text-[#C0392B]">{error}</span>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) cargarArchivo(f) }} />
    </div>
  )
}
