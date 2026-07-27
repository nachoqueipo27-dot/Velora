// Lista fija de preguntas de seguridad para la recuperación de contraseña del
// Admin General. No es texto libre: el usuario elige una de estas 3 opciones.
export const PREGUNTAS_SEGURIDAD = [
  { id: 'mascota', label: '¿Cuál es el nombre de tu primera mascota?' },
  { id: 'escuela', label: '¿Cuál es el nombre de tu escuela primaria?' },
  { id: 'apellido_madre', label: '¿Cuál es el apellido de soltera de tu madre?' },
] as const

export type PreguntaSeguridadId = typeof PREGUNTAS_SEGURIDAD[number]['id']

export function labelPreguntaSeguridad(id: string): string {
  return PREGUNTAS_SEGURIDAD.find(p => p.id === id)?.label ?? 'Pregunta de seguridad'
}
