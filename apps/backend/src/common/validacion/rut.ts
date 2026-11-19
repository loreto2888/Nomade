/**
 * RUT chileno: normalización y validación con el algoritmo módulo 11.
 * Formato normalizado: cuerpo sin puntos (7–8 dígitos), guion y dígito
 * verificador en mayúscula: `76123456-0`, `12345678-K`.
 *
 * El frontend tiene su propia copia en `apps/frontend/src/lib/rut.ts`; la base de datos
 * repite la validación en `nomade.fn_rut_valido` como defensa en profundidad.
 */

const FORMATO_NORMALIZADO = /^\d{7,8}-[\dK]$/;

/** Dígito verificador (`0`–`9` o `K`) del cuerpo numérico de un RUT. */
export function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/**
 * Limpia puntos, espacios y guiones y devuelve el RUT en formato normalizado,
 * o `null` si no tiene la forma de un RUT (no verifica el dígito).
 */
export function normalizarRut(texto: string): string | null {
  const limpio = texto.replace(/[.\s-]/g, '').toUpperCase();
  if (limpio.length < 2) return null;
  const normalizado = `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
  return FORMATO_NORMALIZADO.test(normalizado) ? normalizado : null;
}

/** `true` si el texto es un RUT con dígito verificador correcto. */
export function esRutValido(texto: string): boolean {
  const rut = normalizarRut(texto);
  if (!rut) return false;
  const [cuerpo, dv] = rut.split('-');
  return calcularDigitoVerificador(cuerpo) === dv;
}

/** RUT normalizado si es válido; `null` en caso contrario. */
export function rutValidoONulo(texto: string): string | null {
  return esRutValido(texto) ? normalizarRut(texto) : null;
}

/** `12345678-5` → `12.345.678-5`. */
export function formatearRut(texto: string): string {
  const rut = normalizarRut(texto);
  if (!rut) return texto;
  const [cuerpo, dv] = rut.split('-');
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
