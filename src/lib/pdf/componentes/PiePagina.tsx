import { Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import type { DatosNegocio } from './Encabezado'

interface PiePaginaProps {
  negocio: DatosNegocio
  fecha: string
}

export const PiePagina = ({ negocio, fecha }: PiePaginaProps) => (
  <View style={s.piePagina} fixed>
    <Text>
      {negocio.nombre}
      {negocio.direccion ? ` · ${negocio.direccion}` : ''}
      {negocio.telefono ? ` · Tel: ${negocio.telefono}` : ''}
    </Text>
    <Text>Documento emitido el {fecha} — Generado con Velora</Text>
  </View>
)
