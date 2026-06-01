import { Text, View, Image } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'

export interface DatosNegocio {
  nombre: string
  direccion: string
  telefono: string
  logo: string | null
}

interface EncabezadoProps {
  negocio: DatosNegocio
  titulo: string
  numero?: string
}

export const Encabezado = ({ negocio, titulo, numero }: EncabezadoProps) => (
  <View style={s.encabezado}>
    <View style={s.encabezadoIzq}>
      {negocio.logo
        ? <Image style={s.logo} src={negocio.logo} />
        : <Text style={s.logoPlaceholder}>{(negocio.nombre || 'V').charAt(0).toUpperCase()}</Text>}
      <View>
        <Text style={s.nombreNegocio}>{negocio.nombre}</Text>
        {negocio.direccion ? <Text style={s.subtituloNegocio}>{negocio.direccion}</Text> : null}
        {negocio.telefono ? <Text style={s.subtituloNegocio}>Tel: {negocio.telefono}</Text> : null}
      </View>
    </View>
    <View style={s.encabezadoDer}>
      <Text style={s.tituloPDF}>{titulo}</Text>
      {numero ? <Text style={s.numeroPDF}>{numero}</Text> : null}
    </View>
  </View>
)
