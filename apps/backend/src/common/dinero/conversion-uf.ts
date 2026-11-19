import { DECIMALES_UF, dividir, multiplicar } from './decimal.js';

/** UF → CLP: pesos enteros (redondeo half-up) al valor de la UF indicado. */
export function ufAClp(montoUf: number, valorUf: number): number {
  return multiplicar(montoUf, valorUf, 0);
}

/** CLP → UF con 4 decimales (redondeo half-up) al valor de la UF indicado. */
export function clpAUf(montoClp: number, valorUf: number): number {
  return dividir(montoClp, valorUf, DECIMALES_UF);
}

export interface ValorUfDia {
  fecha: string;
  valor: number;
}

/** Máximo de días hacia atrás en que se acepta el último valor cargado. */
export const DIAS_MAXIMOS_UF_ANTERIOR = 7;

/**
 * Elige el valor de la UF para una fecha: el del mismo día o, si falta, el
 * último anterior siempre que no tenga más de `DIAS_MAXIMOS_UF_ANTERIOR` días.
 * `valores` puede venir en cualquier orden. Devuelve `null` si no hay valor aplicable.
 */
export function elegirValorUf(
  valores: readonly ValorUfDia[],
  fecha: string,
): ValorUfDia | null {
  const limite = restarDias(fecha, DIAS_MAXIMOS_UF_ANTERIOR);
  let mejor: ValorUfDia | null = null;
  for (const v of valores) {
    if (v.fecha > fecha || v.fecha < limite) continue;
    if (!mejor || v.fecha > mejor.fecha) mejor = v;
  }
  return mejor;
}

/** Resta días a una fecha `YYYY-MM-DD` (calendario UTC, sin husos horarios). */
export function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}
