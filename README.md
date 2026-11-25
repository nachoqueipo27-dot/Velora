# Velora

Sistema de punto de venta y gestión para comercios argentinos. Es una app de escritorio
para **Windows** y **macOS**: los datos del comercio se guardan en la propia PC.

## Funciones principales

- **Punto de venta** con productos por unidad, kilo o metro, descuentos y vuelto.
- **Caja diaria**: cobros, gastos y cierre de caja y de mes.
- **Inventario y stock**, con alertas de stock mínimo y ajustes.
- **Listas de precios** con aumentos masivos e historial.
- **Presupuestos y órdenes de trabajo**, con PDFs para imprimir o enviar.
- **Clientes, proveedores y compras.**
- **Empleados**: roles y permisos, horarios, horas extra y ausencias.
- **Devoluciones**, **agenda** y **reportes**.
- **Backup** de los datos en la carpeta que elijas.

## Instalación

1. Entrá a [Releases](https://github.com/nachoqueipo27-dot/Velora/releases/latest).
2. Descargá el instalador:
   - Windows: el archivo `.exe`.
   - macOS (Intel y Apple Silicon): el archivo `.dmg`. La primera vez, abrí la app con
     clic derecho → Abrir.
3. Instalalo y seguí la configuración inicial.

Velora **se actualiza sola**: cuando hay una versión nueva, la app avisa y la instala con un clic.

## Desarrollo

Tauri 2 · React 19 · TypeScript · Vite · SQLite.

```bash
npm install
npm run tauri dev
```
