import { dividir, multiplicar, sumar } from '../../common/dinero/decimal.js';

/**
 * Cálculos de compras con aritmética decimal exacta. Montos en CLP enteros (half-up); porcentajes
 * con hasta 2 decimales.
 */

/** Decimales de los porcentajes (hitos y OC parciales). */
export const DECIMALES_PORCENTAJE = 2;

/** Porcentaje en centésimas enteras (para comparar sin errores de punto flotante). */
const centesimas = (porcentaje: number): number =>
  Math.round(sumar([porcentaje], DECIMALES_PORCENTAJE) * 100);

export const sumarPorcentajes = (porcentajes: readonly number[]): number =>
  sumar(porcentajes, DECIMALES_PORCENTAJE);

/** `true` si `a` y `b` son el mismo porcentaje (a 2 decimales). */
export const mismoPorcentaje = (a: number, b: number): boolean =>
  centesimas(a) === centesimas(b);

/** `true` si `a` supera a `b` (a 2 decimales). */
export const porcentajeMayor = (a: number, b: number): boolean =>
  centesimas(a) > centesimas(b);

/** `monto × porcentaje / 100` redondeado a pesos. */
export const montoDePorcentaje = (monto: number, porcentaje: number): number =>
  dividir(multiplicar(monto, porcentaje, DECIMALES_PORCENTAJE), 100, 0);

/**
 * Monto de cada hito según su porcentaje del monto de la OT. Si los hitos suman exactamente 100 %,
 * el último absorbe el redondeo para que la suma sea exactamente el monto de la OT.
 */
export function montosDeHitos(
  montoOt: number,
  porcentajes: readonly number[],
): number[] {
  const montos = porcentajes.map((p) => montoDePorcentaje(montoOt, p));
  if (
    montos.length > 0 &&
    mismoPorcentaje(sumarPorcentajes(porcentajes), 100)
  ) {
    const resto = montos.slice(0, -1).reduce((a, b) => a + b, 0);
    montos[montos.length - 1] = montoOt - resto;
  }
  return montos;
}

/**
 * Error de los porcentajes de los hitos, o `null` si están bien. En un borrador basta con que no
 * superen el 100 %; para enviar a revisión deben sumar exactamente 100 %.
 */
export function errorDeHitos(
  porcentajes: readonly number[],
  exigirCien: boolean,
): string | null {
  if (exigirCien && porcentajes.length === 0) {
    return 'La OT debe tener al menos un hito.';
  }
  const suma = sumarPorcentajes(porcentajes);
  if (porcentajeMayor(suma, 100)) {
    return `Los hitos suman ${formatearPorcentaje(suma)}: no pueden superar el 100 %.`;
  }
  if (exigirCien && !mismoPorcentaje(suma, 100)) {
    return `Los hitos suman ${formatearPorcentaje(suma)}: deben sumar exactamente 100 %.`;
  }
  return null;
}

export const formatearPorcentaje = (porcentaje: number): string =>
  `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(porcentaje)} %`;

export interface SaldoHito {
  /** Porcentaje y monto del hito. */
  porcentaje: number;
  montoNeto: number;
  /** Lo ya ocupado por OC parciales vigentes (sin contar la OC que se calcula). */
  porcentajeOcupado: number;
  montoOcupado: number;
}

export type ResultadoParcial =
  | { ok: true; montoNeto: number }
  | { ok: false; porcentajeDisponible: number; montoDisponible: number };

/**
 * Monto de una OC parcial por `porcentaje` del monto de la OT, con tope en el saldo del hito. Si
 * la OC completa el hito, toma exactamente su monto restante (absorbe el redondeo).
 */
export function montoParcial(
  montoOt: number,
  hito: SaldoHito,
  porcentaje: number,
): ResultadoParcial {
  const porcentajeDisponible = sumar(
    [hito.porcentaje, -hito.porcentajeOcupado],
    DECIMALES_PORCENTAJE,
  );
  const montoDisponible = hito.montoNeto - hito.montoOcupado;
  if (porcentajeMayor(porcentaje, porcentajeDisponible)) {
    return { ok: false, porcentajeDisponible, montoDisponible };
  }
  const montoNeto = mismoPorcentaje(porcentaje, porcentajeDisponible)
    ? montoDisponible
    : Math.min(montoDePorcentaje(montoOt, porcentaje), montoDisponible);
  if (montoNeto <= 0) {
    return { ok: false, porcentajeDisponible, montoDisponible };
  }
  return { ok: true, montoNeto };
}

/** Total de una línea de OC (cantidad × precio unitario), redondeado a pesos. */
export const totalDeLinea = (
  cantidad: number,
  precioUnitario: number,
): number => multiplicar(cantidad, precioUnitario, 0);

export interface MontosOc {
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
}

/** IVA (half-up a pesos) y total de una OC. Una OC exenta no lleva IVA. */
export function montosDeOc(
  montoNeto: number,
  tasaIva: number,
  afectaIva: boolean,
): MontosOc {
  const montoIva = afectaIva ? montoDePorcentaje(montoNeto, tasaIva) : 0;
  return { montoNeto, montoIva, montoTotal: montoNeto + montoIva };
}
