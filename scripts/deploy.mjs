import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'

const BUILD_CMD = 'npx tsc --noEmit'

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf8' })
}

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

// 0. Repositorio git con remoto configurado
try {
  runCapture('git rev-parse --is-inside-work-tree')
} catch {
  fail('Error: este directorio no es un repositorio git. No se puede continuar con el deploy.')
}

let remotos = ''
try {
  remotos = runCapture('git remote').trim()
} catch {
  fail('Error: no se pudo leer la configuración de remotos de git.')
}
if (!remotos) {
  fail('Error: el repositorio no tiene ningún remoto configurado. Configurá uno (git remote add origin <url>) antes de usar "npm run deploy".')
}

// a. Verificar compilación
console.log('Verificando que el proyecto compile...')
try {
  run(BUILD_CMD)
} catch {
  fail('\nEl proyecto no compila. Deploy detenido: no se hizo commit ni push (ver el error de compilación arriba).')
}
console.log('Compilación OK.\n')

// b. Cambios pendientes
const status = runCapture('git status --porcelain')
if (!status.trim()) {
  console.log('No hay cambios para subir.')
  process.exit(0)
}
const lineas = status.split('\n').filter(Boolean)

// c. Conflictos de merge sin resolver
const enConflictoPorEstado = lineas
  .filter(l => /^(UU|AA|DD|AU|UA|UD|DU) /.test(l))
  .map(l => l.slice(3))

const rutas = lineas.map(l => {
  const p = l.slice(3)
  const flechaIdx = p.indexOf(' -> ')
  return flechaIdx === -1 ? p : p.slice(flechaIdx + 4)
})

const marcadorConflicto = /^(<{7}|={7}|>{7})(?![<=>])/m
const conMarcadores = []
for (const ruta of rutas) {
  try {
    if (existsSync(ruta) && statSync(ruta).isFile() && marcadorConflicto.test(readFileSync(ruta, 'utf8'))) {
      conMarcadores.push(ruta)
    }
  } catch {
    // archivo binario o no legible como texto: se ignora para esta verificación
  }
}

const conflictos = [...new Set([...enConflictoPorEstado, ...conMarcadores])]
if (conflictos.length > 0) {
  console.error('Se encontraron archivos con conflictos de merge sin resolver:')
  conflictos.forEach(f => console.error('  ' + f))
  fail('Deploy detenido: resolvé los conflictos antes de reintentar.')
}

// d. Agregar cambios
run('git add .')

// e. Commit con mensaje automático
const ahora = new Date()
const pad = n => String(n).padStart(2, '0')
const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`
const mensaje = `deploy: actualización automática - ${fecha}`
run(`git commit -m "${mensaje}"`)

// f. Push a la rama actual
const rama = runCapture('git rev-parse --abbrev-ref HEAD').trim()
console.log(`\nPusheando a origin/${rama}...`)
try {
  run(`git push origin ${rama}`)
} catch {
  console.error('\nEl push falló (ver el error de git arriba).')
  console.error('Esto probablemente significa que el remoto tiene commits que no tenés localmente (hacé "git pull") o que falla la conexión/autenticación con el remoto.')
  process.exit(1)
}

// g. Confirmación final
console.log('\nDeploy completado con éxito.')
console.log(`Commit: "${mensaje}"`)
console.log(`Rama: ${rama}`)
