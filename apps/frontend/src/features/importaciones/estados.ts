/** Estado de un lote de importación: texto y semántica de color (código de `StatusChip`). */
export const ETIQUETA_ESTADO = {
  previsualizado: 'Pendiente de confirmar',
  confirmado: 'Confirmado',
  descartado: 'Descartado',
} as const;

export const ESTADO_CHIP = {
  previsualizado: 'pendiente',
  confirmado: 'aprobado',
  descartado: 'cerrado',
} as const;

export const TITULOS_CAMPO: Record<string, string> = {
  codigo: 'Código',
  familia: 'Familia',
  descripcion: 'Descripción',
  unidad: 'Unidad',
  cantidad: 'Cantidad',
  precioUnitario: 'Precio unitario',
  fila: 'Fila',
};

export const EXTENSIONES_IMPORTACION = ['.xlsx', '.csv'];
const MAX_BYTES = 20 * 1024 * 1024;

/** Valida el archivo antes de subirlo (el backend valida de nuevo, incluido el contenido). */
export function validarArchivoImportacion(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_IMPORTACION.some((e) => nombre.endsWith(e))) {
    return 'Sube un archivo Excel (.xlsx) o CSV (.csv).';
  }
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_BYTES) return 'El archivo supera el máximo de 20 MB.';
  return null;
}
