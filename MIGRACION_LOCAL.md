# Migración a 100% Local — Plan (Paso 1: Auditoría)

Este documento es el resultado de una auditoría de solo lectura. No se modificó
ningún archivo de código en este paso. Describe qué eliminar, qué modificar y
qué riesgos hay antes de tocar una sola línea.

Decisiones ya tomadas (contexto, no se cuestionan aquí):
1. El Admin General pasa a crearse LOCALMENTE — el primer usuario del onboarding.
2. Se elimina multi-negocio/multi-local — un solo negocio y un solo local por instalación.
3. Se elimina todo sync/heartbeat/ping_supabase y las columnas de sync del schema.

---

## a) Archivos a ELIMINAR por completo

| Archivo | Razón |
|---|---|
| `src/lib/supabase.ts` | Cliente Supabase (createClient). Sin sync ni login remoto, no hay ningún consumidor legítimo. |
| `src/lib/sync/engine.ts` | Motor de sync (`sincronizarTabla`, `sincronizarTodo`, `enviarHeartbeat`, `resolverLocalRemoteId`). Sync se elimina por completo. |
| `src/lib/sync/queries.ts` | Queries de `sync_status`/pendientes contra SQLite. Sin columnas de sync, no tiene sentido. |
| `src/lib/sync/types.ts` | Tipos `TablaSyncable`, `ResultadoSync`, `EstadoSync`, `RegistroSync`. Solo se usan desde el engine/queries/store que desaparecen. |
| `src/lib/sync/` (carpeta) | Queda vacía tras eliminar los 3 archivos de arriba. |
| `src/store/syncStore.ts` | Store de Zustand que orquesta `sincronizar()`, `heartbeat()`, `iniciarHeartbeatPeriodico()`. Sin motor de sync detrás, el store no tiene función. |
| `src/store/conectividadStore.ts` | Verifica conectividad vía `invoke('ping_supabase')`. Sin Supabase no hay qué pingear. |
| `src/store/negocioStore.ts` | Store de selección de empresa/local activo (multi-tenant). Obsoleto por la decisión #2 (un solo negocio/local). |
| `src/hooks/useConectividad.ts` | Hook que programa el polling de `conectividadStore` (30s conectado / 5s desconectado). Depende 100% del store que se elimina. |
| `src/modules/configuracion/Sincronizacion.tsx` | Pantalla de configuración de sync (Remote ID, frecuencia, historial). Sin sync, no hay nada que configurar. |
| `src/modules/seleccion-negocio/` (carpeta completa: `index.tsx`, `SeleccionEmpresa.tsx`, `SeleccionLocal.tsx`, `ModalNuevoNegocio.tsx`, `components/NegocioCard.tsx`) | Módulo de selección de empresa → local. Obsoleto por la decisión #2. |
| `src/modules/login/Login.tsx` | **Ya está huérfano hoy** (no se importa desde ningún lado — ver PUNTOS A CONFIRMAR #2). Además muestra `negocioActivo.localNombre/empresaNombre`, que desaparece. |
| `supabase/schema.sql` | Schema del proyecto remoto Supabase (multi-tenant + mirrors + heartbeat). Ya no hay proyecto remoto que mantener. |
| `supabase/add_dni.sql` | Migración remota que siembra el Admin General en `usuarios_portal` de Supabase. El Admin General pasa a ser 100% local (decisión #1). |
| `supabase/add_system_id.sql` | Migración remota para la tabla `sistemas` (registro de PCs). Ver PUNTOS A CONFIRMAR #1 sobre si el ID de PC se conserva sin registro remoto. |
| `supabase/` (carpeta completa) | Sin proyecto Supabase, no hay SQL remoto que versionar. |
| `.env.example` | Solo contiene `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_KEY`. Ninguna variable sobrevive a la migración. |

**Nota:** el `.env` real de `src-tauri/` (gitignored, no visible en este repo) y cualquier
`.env` en la raíz con credenciales reales de Supabase deben ser borrados/rotados
manualmente por el usuario fuera de este repo — no es algo que se pueda auditar
ni tocar desde acá.

---

## b) Archivos a MODIFICAR (plan, sin código todavía)

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `src-tauri/src/lib.rs` | Quitar los comandos `sync_tabla`, `sync_heartbeat`, `ping_supabase` (líneas 49-122), las structs `SyncPayload`/`SyncResponse`, las constantes `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (líneas 26-33), el `use tauri_plugin_http::reqwest`, y sus entradas en `invoke_handler![...]` (línea 163). Evaluar si `.plugin(tauri_plugin_http::init())` (línea 161) sigue haciendo falta (ver PUNTOS A CONFIRMAR #1 — depende de si `get_system_id`/`hash_password`/`verify_password` se mantienen, que no usan HTTP). | Elimina toda la superficie de red hacia Supabase en Rust. |
| `src-tauri/Cargo.toml` | Quitar dependencia `tauri-plugin-http` si no queda ningún comando que la use. Mantener `bcrypt` y `hostname` (no son de sync). | Reduce dependencias a las estrictamente necesarias. |
| `src-tauri/build.rs` | Quitar el bloque que lee `.env` y embebe `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` como `cargo:rustc-env` (líneas 9-23). Dejar solo `tauri_build::build()`. | Ya no hay credenciales de Supabase que embeber en el binario. |
| `src/db/schema.ts` | Quitar el spread `...syncCols()` de las 16 tablas que lo usan (ver sección c) y eliminar la función `syncCols()` (líneas 3-11). El resto de columnas de cada tabla queda intacto. | Elimina las columnas `sync_status`/`synced_at`/`remote_id`/`deleted_at` del modelo Drizzle. |
| `src/db/index.ts` | (1) Quitar el bloque de migración `tablasSync`/`columnasSync` con los `ALTER TABLE ... ADD COLUMN` de sync (líneas ~645-678). (2) Simplificar `getDb()`/`setActiveDb()`/`getActiveDbKey()`/`dbMap` — pasar de "una conexión por negocio" (`velora_e{X}_l{Y}.db`) a una única conexión fija (`velora.db`), ya que no hay multi-negocio. (3) En `seedDemoData()`, quitar la rama `esLocalDemo` basada en `getActiveDbKey() === 'e1_l1'` (ya no aplica el concepto de "local demo" vs "local nuevo" — pasa a ser una sola instalación). | Elimina columnas de sync del schema físico y colapsa el modelo multi-tenant a single-tenant. |
| `src/db/master.ts` | Reescritura significativa: (1) Quitar tablas `empresas`/`locales` de `initMasterSchema()` y sus funciones `getEmpresas`, `getLocalesByEmpresa`, `crearEmpresa`, `crearLocal`, `actualizarUltimaSync`. (2) Quitar `loginSupabase()` completo (usa `supabase.from('usuarios_portal')` + `supabase.auth.signInWithPassword`). (3) Quitar el seed hardcodeado de `seedAdminGeneralSiNoExiste()` (DNI `42997462` fijo) — el Admin General pasa a nacer del primer usuario del onboarding (ver PUNTOS A CONFIRMAR #3). (4) Revisar `usuario_locales`, `asignarUsuarioALocal`, `eliminarUsuarioDeLocal`, `getLocalesPorUsuario`, `getAsignacionesPorDni` — dependen todas del concepto "local"; sin multi-negocio no hay a qué asignar un usuario, por lo que probablemente se eliminen junto con la tabla `usuario_locales`. | Es el archivo con más lógica acoplada a Supabase + multi-negocio a la vez. |
| `src/store/authGlobalStore.ts` | Quitar la rama de `loginSupabase` + chequeo de `useConectividadStore` (líneas 55-79) — el login pasa a ser solo `loginLocal`. Quitar la llamada a `seedAdminGeneralSiNoExiste()` en `login()` (línea 35) una vez que esa función deje de sembrar un DNI hardcodeado. | El login deja de tener una segunda vía "en la nube". |
| `src/store/sistemaStore.ts` | Quitar `registrarEnSupabase()` completo (usa `supabase.from('sistemas').upsert`). Decidir si `inicializar()`/`systemId` se mantienen como dato meramente local (ver PUNTOS A CONFIRMAR #1). | El registro remoto del ID de PC ya no tiene destino. |
| `src/store/onboardingStore.ts` | `onboardingKey()` (líneas 7-16) lee `negocioActivo.localId` de `localStorage` para generar una key de persistencia distinta por local. Sin multi-negocio, pasa a ser una key fija (ej. `'velora-onboarding'`). | Ya no hay múltiples locales que necesiten onboarding independiente. |
| `src/store/empleadosStore.ts` | `syncUsuarioMaster()` (líneas 109-130) llama a `useNegocioStore.getState().negocioActivo` y `asignarUsuarioALocal(id, negocio.empresaId, negocio.localId)`. Simplificar para que registre/actualice el usuario en `master.db` sin asignación a empresa/local. También quitar `sync_status = 'pendiente'` de los `UPDATE empleados` en `actualizarEmpleado()` (líneas 200, 205). | Coherente con la eliminación de `negocioStore` y de las columnas de sync. |
| `src/components/dev/DevPanel.tsx` | Quitar la sección "Sync" completa (`syncAhora`, `heartbeatManual`, ping manual, `marcarTodoPendiente`, `verPendientes`) y sus imports de `syncStore`/`conectividadStore`. Quitar `irASeleccion` (ya no existe `SeleccionNegocio`). Ajustar el bloque "Estado actual" que muestra `negocioActivo`, `pendientesSync`, `estadoConexion`. | Panel de debug referencia directamente todo lo que se elimina. |
| `src/components/layout/Layout.tsx` | Quitar el `useEffect` (líneas 62-70) que llama `registrarEnSupabase(negocioActivo?.localRemoteId, undefined)`. Evaluar si `inicializar()` (solo obtiene el `systemId` local) se mantiene. Quitar el import de `useNegocioStore` si ya no se usa nada más de él. | El registro remoto desaparece; el resto de `Layout` no depende de sync. |
| `src/components/layout/Navbar.tsx` | Quitar el componente `StatusIndicador` (líneas 14-57, indicador de conectividad/pendientes) y sus imports de `conectividadStore`/`syncStore`. Quitar la referencia a `negocioActivo.localNombre` (línea 144-147) o reemplazarla por el nombre del negocio único (desde `onboardingStore`/`configStore`, a definir). Evaluar si el indicador de `systemId` (líneas 151-163) se mantiene. | El navbar es el punto donde más se ve visualmente el estado de sync/conectividad. |
| `src/components/layout/StatusBar.tsx` | Quitar el indicador/botón de sync (`estado`, `pendientes`, `sincronizar`, `iniciarHeartbeatPeriodico`, líneas 18, 20-24, 114-132) y el botón "cambiar de negocio" (`negocioActivo`, `limpiarNegocio`, líneas 17, 86-99). | Misma razón que Navbar — referencias directas a sync y a negocio activo. |
| `src/App.tsx` | Quitar el nivel `SeleccionNegocio` del árbol de pantallas (línea 42) y el import de `useNegocioStore`/`negocioActivo`. El flujo pasa a: login único → (si no hay onboarding completado) Onboarding → Layout. | Colapsa un nivel completo de navegación que dependía de multi-negocio. |
| `src/modules/onboarding/ResumenFinal.tsx` | `guardarAdminEnDB()` (líneas 12-53) llama `asignarUsuarioALocal(rows[0].id, negocio.empresaId, negocio.localId)` usando `useNegocioStore`. Debe simplificarse para que el usuario creado en el onboarding se registre directamente como Admin General en `master.db` (sin asignación a empresa/local), cumpliendo la decisión #1. | Es el punto exacto donde nace hoy el "admin del local"; pasa a ser el punto donde nace el Admin General. |
| `src/modules/login-global/LoginGlobal.tsx` | No requiere cambios de UI, pero su único store (`authGlobalStore`) cambia de comportamiento (ver arriba) — la pantalla deja de tener un camino "offline falla → probar Supabase". Revisar si el nombre del componente/módulo sigue teniendo sentido una vez que no queda ningún otro "Login" activo (ver PUNTOS A CONFIRMAR #2). | Login pasa a ser puramente local, sin cambios visuales obligatorios. |
| `package.json` | Quitar la dependencia `"@supabase/supabase-js"`. | Ya no hay ningún import de `@supabase/supabase-js` en el código tras eliminar `src/lib/supabase.ts`. |

---

## c) Tablas de `schema.ts` que pierden columnas de sync

Todas usan hoy el spread `...syncCols()` (agrega `syncStatus`, `syncedAt`, `remoteId`, `deletedAt`). Tras la migración pierden **solo esas 4 columnas** — el resto de columnas de cada tabla queda exactamente igual:

1. `clientes`
2. `empleados`
3. `fichajes`
4. `horasExtras` (`horas_extras`)
5. `ausencias`
6. `productos`
7. `movimientosStock` (`movimientos_stock`)
8. `proveedores`
9. `ordenesCompra` (`ordenes_compra`)
10. `presupuestos`
11. `itemsPresupuesto` (`items_presupuesto`)
12. `ordenesTrabajo` (`ordenes_trabajo`)
13. `cobrosCaja` (`cobros_caja`)
14. `gastosOperativos` (`gastos_operativos`)
15. `cierresCaja` (`cierres_caja`)
16. `cierresMes` (`cierres_mes`)

**Total: 16 tablas.** Confirmado contra `src/db/index.ts` (el array `tablasSync` que hace los `ALTER TABLE` en runtime tiene exactamente estas mismas 16 tablas), así que ambos lugares están hoy sincronizados entre sí y deben editarse juntos.

Las demás tablas del schema (`configuracion`, `roles`, `permisos`, `categorias`, `proveedores` ya contado, `conjuntoComponentes`, `historialPrecios`, `listasPreciosSnapshot`, `itemsOrdenCompra`, `etiquetasOT`, `plantillasOT`, `otEtiquetas`, `otNotas`, `garantias`, `citas`, `ventasPOS`, `itemsVentaPOS`, `devoluciones`, `itemsDevolucion`, `historialActividad`, `backups`, `configuracionTicket`, `configuracionPDF`, `motivosCancelacion`, `tiposCambio`) nunca tuvieron columnas de sync y no se tocan.

---

## d) Flujo de login — ANTES vs DESPUÉS

### ANTES (con Supabase / Admin General remoto)

```
Usuario abre la app
        │
        ▼
   LoginGlobal (DNI + password)
        │
        ▼
  loginLocal(dni, pass) contra master.db (cache local, bcrypt)
        │
        ├── match ────────────────────────────────────┐
        │                                              │
        └── no match                                   │
              │                                        │
              ▼                                        │
      ¿hay conexión? (conectividadStore → ping_supabase)│
              │                                        │
         no ──┴── error "sin conexión"                 │
         sí                                             │
              ▼                                        │
      loginSupabase(dni, pass)                          │
        → Supabase Auth (signInWithPassword)             │
        → tabla usuarios_portal                          │
              │                                        │
              ├─ rol admin_master → cachea copia local   │
              │    (es_local = 0) en master.db           │
              └─ otro rol → guardarUsuarioLocal()         │
                                                          │
        usuarioGlobal seteado (authGlobalStore) ◄─────────┘
              │
              ▼
      SeleccionNegocio (empresa → local)
        - lee empresas/locales desde master.db
          (con remote_id apuntando a Supabase)
        - setActiveDb(`e{empresaId}_l{localId}`)
          → abre velora_eX_lY.db
              │
              ▼
      ¿Onboarding completado para ESE local?
              │
         no ──┴── sí
         │         │
         ▼         ▼
   Onboarding    Layout (sistema operativo)
   - guarda admin en DB del local
     + master.db, asignado a
     empresa/local (usuario_locales)
         │
         ▼
      Layout
         │
         ▼
   Sync periódico (syncStore, cada N horas / al cerrar caja)
     → invoke('sync_tabla'/'sync_heartbeat') en Rust
     → POST a Supabase (tablas *_mirror, heartbeat)
   Conectividad (useConectividad, cada 5-30s)
     → invoke('ping_supabase') → StatusIndicador en Navbar
```

### DESPUÉS (100% local)

```
Usuario abre la app
        │
        ▼
   ¿Existe algún usuario en master.db?
        │
   no ──┴── sí
   │         │
   ▼         ▼
Onboarding   Login (DNI + password)
- crea el      │
  primer       ▼
  usuario  loginLocal(dni, pass) contra master.db (bcrypt)
  → se           │
  convierte      ├─ match → usuario autenticado
  en Admin       └─ no match → error
  General             │
  (100% local)        │
        └──────────────┘
                │
                ▼
        Layout (sistema operativo)
        - un solo negocio, un solo local, una sola velora.db
        - sin sync, sin conectividad, sin heartbeat
```

---

## PUNTOS A CONFIRMAR

Estos puntos no están cubiertos por las 3 decisiones ya tomadas y requieren definición antes de (o durante) la implementación:

1. **ID único por PC (`system_id` / `get_system_id` / `sistemaStore` / indicador en Navbar).** Hoy su ÚNICO uso real es registrarse en la tabla `sistemas` de Supabase (`registrarEnSupabase`) y mostrarse como dato informativo en el Navbar. Es una feature agregada muy recientemente (commit `eb48a50 feat: ID unico por PC`). ¿Se elimina por completo (comando Rust incluido), o se conserva como dato puramente local/informativo (sin ningún registro remoto)? Esto decide si `tauri_plugin_http`/`hostname` siguen haciendo falta en `Cargo.toml`.

2. **`src/modules/login/Login.tsx` ya está huérfano HOY**, antes de tocar nada — no lo importa ningún otro archivo (`App.tsx` usa `LoginGlobal`, no `Login`). Muestra `negocioActivo.localNombre/empresaNombre`, que desaparece con la decisión #2. ¿Se elimina directamente (recomendado, ya que no se usa), o había intención de que fuera el login post-migración y `LoginGlobal` el que se elimina/renombra? Necesito saber cuál de los dos componentes de login sobrevive antes de tocar `App.tsx`.

3. **Seed hardcodeado del Admin General.** Hoy `authGlobalStore.login()` llama SIEMPRE a `seedAdminGeneralSiNoExiste()`, que inserta un usuario fijo (DNI `42997462`, password `Dark1996$`, rol `admin_master`) si no existe. Esto es incompatible con la decisión #1 ("el primer usuario creado en el onboarding se convierte en Admin General"). Asumo que este seed hardcodeado se **elimina sin dejar ningún usuario de fallback/demo**, y que el único camino para tener un Admin General es completar el onboarding. Confirmar que no se necesita ningún usuario de emergencia/recuperación tipo "backdoor" para el caso de pérdida de contraseña del Admin General (hoy no existe ningún mecanismo de recuperación de contraseña — ni local ni remoto).

4. **Columnas de sync muertas.** Las tablas `horas_extras`, `ausencias` e `items_presupuesto` tienen columnas de sync físicamente creadas en SQLite (vía `db/index.ts`) y en `schema.ts`, pero **nunca aparecen** en `TABLAS_SYNC` (`queries.ts`) ni en el tipo `TablaSyncable` (`sync/types.ts`) — es decir, esas 3 tablas nunca se sincronizaron realmente pese a tener las columnas. No cambia el plan (las 16 tablas pierden sync igual), pero confirma que quitarles esas columnas no tiene ningún impacto funcional observable hoy.

5. **Persistencia del onboarding ligada al local (`onboardingStore.onboardingKey()`).** Hoy la key de `localStorage` del onboarding depende de `negocioActivo.localId` (para soportar multi-local). Al pasar a una key fija, cualquier instalación **ya existente y con datos reales** perdería el estado de "onboarding completado" (porque cambia el nombre de la key en `localStorage`) y volvería a mostrar el wizard de onboarding aunque ya tenga negocio/empleados/datos cargados. Esto es un riesgo de UX/datos para instalaciones en producción, no solo para instalaciones nuevas — hay que decidir una migración de esa key o aceptar que el onboarding se vuelva a mostrar una vez tras actualizar.

6. **`.env` reales con credenciales de Supabase** (`src-tauri/.env`, y cualquier `.env` en la raíz) no están en este repo (gitignored) y por lo tanto no se pueden auditar ni eliminar desde acá. Si existen credenciales de servicio (`SUPABASE_SERVICE_KEY`) vigentes, recomendar al usuario rotarlas/revocarlas en el dashboard de Supabase una vez completada la migración, ya que quedarán huérfanas pero potencialmente válidas.

No se encontró ningún caso de pérdida de datos irreversible ni ninguna función de negocio crítica con dependencia oculta de Supabase más allá de lo listado arriba. **No se requiere escalar a Claude Opus.**
