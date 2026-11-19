/** Reglas de adjuntos (D-16): PDF, JPG, PNG, XLSX y CSV, hasta 20 MB. El backend valida el contenido real. */
export const EXTENSIONES_ADJUNTO = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'csv'] as const;
export const MAX_BYTES_ADJUNTO = 20 * 1024 * 1024;
export const TIPOS_ACEPTADOS = EXTENSIONES_ADJUNTO.map((e) => `.${e}`).join(',');

/** Mensaje de error si el archivo no cumple las reglas; `null` si es válido. */
export function validarArchivoCliente(archivo: { name: string; size: number }): string | null {
  const indice = archivo.name.lastIndexOf('.');
  const extension = indice > 0 ? archivo.name.slice(indice + 1).toLowerCase() : '';
  if (!(EXTENSIONES_ADJUNTO as readonly string[]).includes(extension)) {
    return 'Tipo de archivo no permitido. Se aceptan PDF, JPG, PNG, XLSX y CSV.';
  }
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_BYTES_ADJUNTO) return 'El archivo supera el máximo de 20 MB.';
  return null;
}
