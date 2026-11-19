export type Moneda = 'CLP' | 'UF';

/** Decimales máximos que admite cada moneda. */
export const DECIMALES_MONEDA: Record<Moneda, number> = { CLP: 0, UF: 4 };

/**
 * Interpreta lo que el usuario escribe en un campo de monto.
 * - CLP: solo dígitos (puntos, espacios y símbolos se ignoran).
 * - UF: la coma es el separador decimal y el punto el de miles (`4.710,5` → 4710.5);
 *   sin coma, un único punto seguido de 1–2 o 4 dígitos se toma como decimal (`4710.5`).
 * Devuelve `null` si el campo está vacío o no tiene un número válido.
 */
export function parsearMonto(texto: string, moneda: Moneda): number | null {
  const limpio = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(limpio)) return null;
  if (moneda === 'CLP') {
    // En pesos no hay decimales: se descarta todo lo que viene tras una coma.
    const digitos = limpio.split(',')[0].replace(/\./g, '');
    return digitos === '' ? null : Number(digitos);
  }
  let entera: string;
  let fraccion = '';
  if (limpio.includes(',')) {
    const [izquierda, ...resto] = limpio.split(',');
    entera = izquierda.replace(/\./g, '');
    fraccion = resto.join('').replace(/\./g, '');
  } else {
    const puntos = limpio.split('.');
    const ultimo = puntos[puntos.length - 1];
    if (puntos.length === 2 && ultimo.length !== 3) {
      entera = puntos[0];
      fraccion = ultimo;
    } else {
      entera = puntos.join('');
    }
  }
  const numero = Number(`${entera || '0'}.${fraccion.slice(0, DECIMALES_MONEDA.UF) || '0'}`);
  return Number.isFinite(numero) ? numero : null;
}

/** Texto editable de un monto, con miles separados por punto y coma decimal (`4.710,5`). */
export function textoEditableDeMonto(monto: number | null, moneda: Moneda): string {
  if (monto === null) return '';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: DECIMALES_MONEDA[moneda],
  }).format(monto);
}
