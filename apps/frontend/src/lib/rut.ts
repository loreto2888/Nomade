/**
 * RUT chileno: validación (módulo 11) y formato. Copia en el frontend de
 * `apps/backend/src/common/validacion/rut.ts`; el backend sigue siendo la autoridad.
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

/** `12.345.678-5` → `12345678-5`; `null` si no tiene forma de RUT (no verifica el dígito). */
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

const conPuntos = (cuerpo: string) => cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Da formato mientras se escribe: deja solo dígitos y `K`, separa el dígito
 * verificador y agrega los puntos (`123456785` → `12.345.678-5`). Con un solo
 * carácter no agrega guion.
 */
export function formatearRutAlEscribir(texto: string): string {
  const limpio = texto
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .slice(0, 9);
  if (limpio.length <= 1) return limpio;
  return `${conPuntos(limpio.slice(0, -1))}-${limpio.slice(-1)}`;
}

/** Formato de lectura `12.345.678-5`; si no es un RUT devuelve el texto tal cual. */
export function formatearRut(texto: string): string {
  const rut = normalizarRut(texto);
  if (!rut) return texto;
  const [cuerpo, dv] = rut.split('-');
  return `${conPuntos(cuerpo)}-${dv}`;
}
