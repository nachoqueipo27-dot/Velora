import sharp from 'sharp'
import { readFileSync } from 'fs'

// Fuente 1024x1024 para `tauri icon`: hexágono blanco centrado sobre fondo #0A0A0A.
// Fondo sólido → el ícono se ve nítido en barras de tareas claras y oscuras.
const svgRaw = readFileSync('public/velora-logo.svg', 'utf8')
const logoSvg = Buffer.from(svgRaw.replaceAll('currentColor', '#FFFFFF'))

const SIZE = 1024
const logoH = 600
const logoW = Math.round(logoH * (136 / 156))

const logoPng = await sharp(logoSvg, { density: 512 })
  .resize(logoW, logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } })
  .composite([{ input: logoPng, gravity: 'center' }])
  .png()
  .toFile('src-tauri/icons/source-1024.png')

console.log('Fuente generada: src-tauri/icons/source-1024.png')
