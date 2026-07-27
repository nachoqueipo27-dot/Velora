# Velora

Sistema de gestión operativa para PyMEs: punto de venta, caja diaria, clientes,
empleados, inventario, órdenes de trabajo, presupuestos, proveedores, agenda,
lista de precios, devoluciones, PDFs y reportes de uso.

100% local: no depende de ningún servicio en la nube ni sincroniza datos con
un servidor. Todo vive en una base de datos SQLite en la máquina donde corre
la aplicación.

## Stack

- [Tauri 2](https://tauri.app/)
- React 19 + TypeScript
- Vite
- SQLite vía [Drizzle ORM](https://orm.drizzle.team/)

## Desarrollo

```bash
npm install
npm run tauri dev
```

## Build de producción

```bash
npm run tauri build
```
