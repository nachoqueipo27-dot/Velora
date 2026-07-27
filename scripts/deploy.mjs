import { execSync, spawnSync } from 'node:child_process'
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

// Traduce el error de git push a una explicación de una línea.
function explicarErrorPush(salida) {
  const s = salida.toLowerCase()
  if (s.includes('403') || (s.includes('permission') && s.includes('denied'))) {
    return 'Probablemente git se está autenticando con una cuenta de GitHub que no tiene permiso sobre este repositorio (revisá con qué usuario estás logueado en el Administrador de credenciales de Windows).'
  }
  if (s.includes('authentication failed') || s.includes('could not read username')) {
    return 'Probablemente las credenciales de GitHub son inválidas o expiraron (token vencido o login desactualizado).'
  }
  if (s.includes('fetch first') || s.includes('non-fast-forward') || s.includes('rejected')) {
    return 'Probablemente el remoto tiene commits que no tenés localmente: hacé "git pull" y volvé a intentar.'
  }
  if (s.includes('could not resolve host') || s.includes('timed out') || s.includes('connection refused')) {
    return 'Probablemente hay un problema de conexión a internet o el remoto no está accesible.'
  }
  return 'Revisá el mensaje de git de arriba: puede ser falta de permisos, credenciales vencidas o problemas de conexión.'
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
// Ojo: "sin cambios" no siempre significa "nada que hacer". Si un push anterior falló,
// el árbol puede estar limpio pero con commits locales sin subir; en ese caso hay que pushear igual.
function commitsSinPushear() {
  try {
    return parseInt(runCapture('git rev-list --count @{u}..HEAD').trim(), 10) || 0
  } catch {
    return null // la rama no tiene upstream configurado todavía
  }
}

const status = runCapture('git status --porcelain')
const hayCambios = status.trim().length > 0

if (!hayCambios) {
  const pendientes = commitsSinPushear()
  if (pendientes === 0) {
    console.log('No hay cambios para subir.')
    process.exit(0)
  }
  console.log(pendientes === null
    ? 'No hay cambios sin commitear, pero la rama todavía no tiene upstream: se intentará pushear.'
    : `No hay cambios sin commitear, pero hay ${pendientes} commit(s) local(es) sin pushear: se intentará pushear.`)
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

let mensaje = null
if (hayCambios) {
  // d. Agregar cambios
  run('git add .')

  // e. Commit con mensaje automático
  const ahora = new Date()
  const pad = n => String(n).padStart(2, '0')
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`
  mensaje = `deploy: actualización automática - ${fecha}`
  run(`git commit -m "${mensaje}"`)
}

// f. Push a la rama actual
const rama = runCapture('git rev-parse --abbrev-ref HEAD').trim()
console.log(`\nPusheando a origin/${rama}...`)
const push = spawnSync('git', ['push', 'origin', rama], { encoding: 'utf8' })
const salidaPush = (push.stdout || '') + (push.stderr || '')
if (salidaPush) process.stdout.write(salidaPush)
if (push.status !== 0) {
  console.error('\nEl push falló (ver el error de git arriba).')
  console.error(explicarErrorPush(salidaPush))
  console.error('Los commits quedaron hechos localmente: cuando resuelvas el problema, volvé a correr "npm run deploy" y los subirá. Nunca uses --force.')
  process.exit(1)
}

// g. Confirmación final
console.log('\nDeploy completado con éxito.')
console.log(mensaje ? `Commit: "${mensaje}"` : 'Commit: (se subieron commits locales que ya existían)')
console.log(`Rama: ${rama}`)
