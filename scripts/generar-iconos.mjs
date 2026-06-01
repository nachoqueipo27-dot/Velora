import sharp from 'sharp'
import { readFileSync } from 'fs'

// Requiere: npm install -D sharp
// El SVG usa currentColor; lo forzamos a un color sólido para el ícono rasterizado.
const svgRaw = readFileSync('public/velora-logo.svg', 'utf8')
// Render del ícono en negro sobre transparente (currentColor -> #0A0A0A)
const svg = Buffer.from(svgRaw.replaceAll('currentColor', '#0A0A0A'))

const tamanios = [
  { size: 32,  nombre: 'icons/32x32.png' },
  { size: 128, nombre: 'icons/128x128.png' },
  { size: 256, nombre: 'icons/128x128@2x.png' },
]

for (const { size, nombre } of tamanios) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`src-tauri/${nombre}`)
  console.log(`Generado: ${nombre}`)
}

// NOTA: el .ico de Windows no lo genera sharp. Para el .ico real usar png-to-ico o icotool.
console.log('Íconos PNG generados.')
