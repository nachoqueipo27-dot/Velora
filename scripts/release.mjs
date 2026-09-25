import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Crea y pushea el tag vX.Y.Z (versión de src-tauri/tauri.conf.json).
// El tag dispara .github/workflows/release.yml, que compila Windows + macOS en GitHub Actions.

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const { version } = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'))
if (!version) fail('Error: no se encontró "version" en src-tauri/tauri.conf.json.')
const tag = `v${version}`

// a. Árbol limpio y todo pusheado: el build se hace con lo que está en GitHub, no con lo local.
if (runCapture('git status --porcelain')) {
  fail('Hay cambios sin commitear. Corré "npm run deploy" primero y después volvé a correr "npm run release".')
}
runCapture('git fetch origin')
let pendientes
try {
  pendientes = parseInt(runCapture('git rev-list --count @{u}..HEAD'), 10) || 0
} catch {
  fail('La rama actual no tiene upstream en origin. Corré "npm run deploy" primero.')
}
if (pendientes > 0) {
  fail(`Hay ${pendientes} commit(s) sin pushear. Corré "npm run deploy" primero.`)
}

// b. El tag no debe existir (ni local ni remoto): cada release necesita una versión nueva.
const existeLocal = runCapture(`git tag --list ${tag}`) !== ''
const existeRemoto = runCapture(`git ls-remote --tags origin refs/tags/${tag}`) !== ''
if (existeLocal || existeRemoto) {
  fail(`El tag ${tag} ya existe. Subí "version" en src-tauri/tauri.conf.json (por ejemplo a la siguiente versión), hacé "npm run deploy" y reintentá.`)
}

// c. Crear y pushear el tag
execSync(`git tag -a ${tag} -m "Velora ${tag}"`, { stdio: 'inherit' })
const push = spawnSync('git', ['push', 'origin', tag], { encoding: 'utf8', stdio: 'inherit' })
if (push.status !== 0) {
  execSync(`git tag -d ${tag}`)
  fail(`\nNo se pudo pushear el tag ${tag} (ver el error de git arriba). Se borró el tag local; podés reintentar.`)
}

const remoto = runCapture('git remote get-url origin').replace(/\.git$/, '')
console.log(`\nTag ${tag} publicado. GitHub está compilando Windows y macOS (~15-20 min).`)
console.log(`Progreso:   ${remoto}/actions`)
console.log(`Instaladores (Release en borrador): ${remoto}/releases`)
