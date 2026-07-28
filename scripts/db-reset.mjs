import { createInterface } from 'node:readline'
import { existsSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Identificador de la app: debe coincidir con `identifier` en src-tauri/tauri.conf.json.
const IDENTIFIER = 'com.velora.app'

// Nombres tal cual los abre la app con Database.load('sqlite:...').
const BASES = ['velora.db', 'velora_master.db']

// SQLite deja archivos laterales cuando usa WAL; hay que borrarlos junto con el .db
// o la próxima apertura puede recuperar páginas de la base vieja.
const SUFIJOS = ['', '-wal', '-shm', '-journal']

// tauri-plugin-sql v2 guarda las bases en el directorio de configuración de la app
// (app_config_dir), que Tauri resuelve distinto según el sistema operativo.
function directorioDatos() {
  const home = homedir()
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming')
    return join(appData, IDENTIFIER)
  }
  if (process.platform === 'darwin') {
    return join(home, 'Library', 'Application Support', IDENTIFIER)
  }
  const xdg = process.env.XDG_CONFIG_HOME || join(home, '.config')
  return join(xdg, IDENTIFIER)
}

function preguntar(pregunta) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(pregunta, r => { rl.close(); resolve(r) }))
}

const kb = n => `${(n / 1024).toFixed(0)} KB`

const dir = directorioDatos()
console.log(`Directorio de datos: ${dir}\n`)

if (!existsSync(dir)) {
  console.log('Ese directorio no existe: la app todavía no creó ninguna base.')
  console.log('No hay nada que borrar — al abrir la app se creará una base nueva y vacía.')
  process.exit(0)
}

// Relevar qué existe realmente antes de preguntar nada.
const encontrados = []
for (const base of BASES) {
  for (const sufijo of SUFIJOS) {
    const ruta = join(dir, base + sufijo)
    if (existsSync(ruta)) encontrados.push({ ruta, tam: statSync(ruta).size })
  }
}

if (encontrados.length === 0) {
  console.log('No se encontró ningún archivo de base de datos.')
  console.log('No hay nada que borrar — al abrir la app se creará una base nueva y vacía.')
  process.exit(0)
}

console.log('Se van a BORRAR estos archivos:')
for (const { ruta, tam } of encontrados) console.log(`  ${ruta}  (${kb(tam)})`)
console.log('\nEsto elimina TODOS los datos locales: negocio, usuarios, clientes, empleados,')
console.log('productos, órdenes de trabajo, presupuestos y caja. Es irreversible.\n')

const respuesta = (await preguntar('¿Continuar? (s/N): ')).trim().toLowerCase()
if (respuesta !== 's' && respuesta !== 'si' && respuesta !== 'sí') {
  console.log('\nCancelado. No se borró nada.')
  process.exit(0)
}

console.log()
let borrados = 0
for (const { ruta } of encontrados) {
  try {
    rmSync(ruta)
    console.log(`  borrado  ${ruta}`)
    borrados++
  } catch (e) {
    console.error(`  ERROR    ${ruta} — ${e.message}`)
    console.error('           (si la app está abierta, cerrala y volvé a intentar)')
  }
}

console.log(`\n${borrados} de ${encontrados.length} archivo(s) borrado(s).`)
if (borrados === encontrados.length) {
  console.log('\nListo. La próxima vez que abras la app con "npm run tauri dev" se va a crear')
  console.log('una base de datos nueva y vacía, y vas a ver el Onboarding desde cero.')
} else {
  console.log('\nQuedaron archivos sin borrar. Cerrá la app (y cualquier "tauri dev" abierto)')
  console.log('y volvé a correr "npm run db:reset".')
  process.exit(1)
}
