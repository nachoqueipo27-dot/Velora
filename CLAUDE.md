# Velora — reglas fijas para Claude Code

Este archivo vale para TODOS los prompts. Cada Master Prompt solo dice lo nuevo.

## Qué es Velora
App de escritorio POS/ERP para comercios argentinos. Tauri 2 + React 19 + TypeScript + Vite + Tailwind 3.
Datos 100% locales en SQLite (`velora.db` y `velora_master.db`) con Drizzle. Estado con Zustand. PDF con @react-pdf.
Supabase (proyecto "Velora") se usa SOLO para licencias y la base compartida de códigos de barras. Los datos del comercio nunca salen de la PC.

## Cómo trabajar
- Idioma: código y comentarios como ya están en el repo (nombres en español). Reportes en español.
- Leé los archivos que vas a tocar antes de cambiarlos. No reescribas archivos enteros si alcanza con editar.
- Un cambio por vez, el mínimo necesario. No refactorices lo que el prompt no pide.
- Verificación: solo `npx tsc --noEmit` al final (y `npm run build` si el prompt lo pide). NO correr Playwright ni suites largas. NO hacer capturas ni pruebas de rendimiento/accesibilidad.
- NO hacer `git push`, `npm run deploy` ni `npm run release`. Podés hacer commits locales con mensajes claros en español.
- Nunca escribir claves, tokens ni contraseñas en el repo ni en el reporte. Las claves privadas viven fuera del repo o en secretos de GitHub/Supabase.

## Base de datos
- Las tablas se crean en `src/db/index.ts` (`CREATE TABLE IF NOT EXISTS`) y se describen en `src/db/schema.ts`. Los dos tienen que quedar coincidiendo.
- Hay clientes usando Velora con datos reales: todo cambio de estructura debe ser una migración que conserve los datos, correr una sola vez y estar dentro de una transacción.
- Antes de migrar, la app ya hace una copia de las bases cuando cambia la versión (`src/db/respaldoActualizacion.ts`). No la rompas.

## Dinero
- Todos los montos en pesos se guardan como ENTEROS en centavos (desde el prompt de centavos en adelante). Nunca `float` para plata.
- Usar siempre los helpers de `src/lib/dinero.ts` para convertir, operar y mostrar. Formato argentino: `$ 1.234,56`.
- Cantidades, stock, horas, porcentajes y tipos de cambio siguen siendo decimales (no son plata).

## Diseño
- Modo claro principal. Acento terracota. Tipografías Geist (texto) y Geist Mono (números, códigos, montos).
- Colores, radios y tipografías solo desde los tokens (`src/lib/tokens.ts` + `tailwind.config.js`). Nada de hex sueltos en componentes nuevos.
- Las pantallas de referencia están en `docs/diseno/*.dc.html` (abrilas como texto: son HTML). Copiá su estructura y textos; no inventes pantallas.
- Cada opción de Configuración lleva debajo una línea de ayuda que explica qué hace.

## Seguridad
- PIN y contraseñas siempre con hash (bcrypt), nunca `btoa`.
- Reportes y Finanzas son datos sensibles: respetar permisos por rol.

## Si algo sale mal
Si aparece un problema grave o bloqueante (pérdida de datos posible, migración que falla, algo que no entendés del código), FRENÁ. No improvises. Empezá el reporte con:
`🔴 REQUIERE CLAUDE OPUS — PROBLEMA GRAVE` y explicá qué pasó, dónde y qué probaste.

## Reporte final (obligatorio, corto, en español)
1. Qué se hizo
2. Archivos modificados
3. Decisiones tomadas (y por qué)
4. Resultado de `tsc` (y build si aplica)
5. Próximo paso sugerido
