/** Largo mínimo de contraseña (D-19, §13 del plan). */
export const MIN_LARGO_CLAVE = 12;
/** Largo máximo: evita usar argon2 como vector de denegación de servicio. */
export const MAX_LARGO_CLAVE = 128;

/**
 * Valida una contraseña nueva. Devuelve el mensaje de error en español o
 * `null` si es válida.
 */
export function validarClaveNueva(clave: string): string | null {
  if (clave.length < MIN_LARGO_CLAVE) {
    return `La contraseña debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`;
  }
  if (clave.length > MAX_LARGO_CLAVE) {
    return `La contraseña debe tener como máximo ${MAX_LARGO_CLAVE} caracteres.`;
  }
  if (clave.trim().length === 0) {
    return 'La contraseña no puede estar formada solo por espacios.';
  }
  return null;
}
