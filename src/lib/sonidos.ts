// Sonidos del lector de códigos, generados con Web Audio (sin archivos).
//   encontrado:   un pitido corto y agudo.
//   desconocido:  dos pitidos graves.

let contexto: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (!contexto) contexto = new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()
    return contexto
  } catch {
    return null // sin audio disponible: el escaneo sigue funcionando en silencio
  }
}

function pitido(ctx: AudioContext, frecuencia: number, inicio: number, duracion: number, volumen: number) {
  const osc = ctx.createOscillator()
  const gan = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = frecuencia
  const t0 = ctx.currentTime + inicio
  // Subida y bajada cortas para que no "chasquee".
  gan.gain.setValueAtTime(0, t0)
  gan.gain.linearRampToValueAtTime(volumen, t0 + 0.005)
  gan.gain.setValueAtTime(volumen, t0 + duracion - 0.01)
  gan.gain.linearRampToValueAtTime(0, t0 + duracion)
  osc.connect(gan).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duracion + 0.01)
}

export function sonarEncontrado(): void {
  const ctx = audio()
  if (ctx) pitido(ctx, 1800, 0, 0.07, 0.08)
}

export function sonarDesconocido(): void {
  const ctx = audio()
  if (!ctx) return
  pitido(ctx, 330, 0, 0.11, 0.1)
  pitido(ctx, 330, 0.16, 0.11, 0.1)
}
