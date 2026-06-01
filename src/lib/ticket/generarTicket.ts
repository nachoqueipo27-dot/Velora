export interface DatosTicket {
  negocio: { nombre: string; direccion: string; telefono: string }
  numero: string
  cliente: string | null
  items: { nombre: string; cantidad: number; precio: number }[]
  subtotal: number
  descuento: number
  total: number
  formaPago: string
  fecha: string
  anchoPapel: '58mm' | '80mm'
}

export function formatearTicket(datos: DatosTicket): string {
  const ancho = datos.anchoPapel === '58mm' ? 32 : 48
  const linea = '─'.repeat(ancho)
  const centrar = (texto: string) => {
    const espacios = Math.max(0, Math.floor((ancho - texto.length) / 2))
    return ' '.repeat(espacios) + texto
  }
  const col2 = (izq: string, der: string) => {
    const espacios = Math.max(1, ancho - izq.length - der.length)
    return izq + ' '.repeat(espacios) + der
  }

  const lineas: string[] = [
    centrar(datos.negocio.nombre),
    centrar(datos.negocio.direccion || ''),
    centrar(datos.negocio.telefono || ''),
    linea,
    `N° ${datos.numero}`,
    `Fecha: ${datos.fecha}`,
    datos.cliente ? `Cliente: ${datos.cliente}` : '',
    linea,
    ...datos.items.map(i =>
      col2(`${i.cantidad}x ${i.nombre}`, `$${i.precio.toFixed(0)}`)
    ),
    linea,
    col2('Subtotal:', `$${datos.subtotal.toFixed(0)}`),
    datos.descuento > 0 ? col2('Descuento:', `-$${datos.descuento.toFixed(0)}`) : '',
    col2('TOTAL:', `$${datos.total.toFixed(0)}`),
    col2('Forma de pago:', datos.formaPago),
    linea,
    centrar('¡Gracias por su compra!'),
    '',
    '',
  ].filter(l => l !== '')

  return lineas.join('\n')
}

// Por ahora simular impresión registrando en consola.
// La integración real con ESC/POS se completa en Paso 16
// cuando el usuario configure su impresora.
export async function imprimirTicket(datos: DatosTicket): Promise<boolean> {
  try {
    const contenido = formatearTicket(datos)
    console.log('=== TICKET ===\n' + contenido + '\n=== FIN TICKET ===')
    return true
  } catch (e) {
    console.error('Error al imprimir ticket:', e)
    return false
  }
}
