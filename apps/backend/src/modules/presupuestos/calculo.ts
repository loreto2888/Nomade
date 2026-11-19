import { HttpStatus } from '@nestjs/common';
import { ufAClp } from '../../common/dinero/conversion-uf.js';
import { multiplicar, sumar } from '../../common/dinero/decimal.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { MonedaContrato } from '../obras/obras.tipos.js';

/** Mayor total que cabe en `numeric(18,4)` (14 enteros). */
export const TOPE_TOTAL = 99_999_999_999_999;
/** Mayor monto en CLP que se calcula sin perder precisión (< 2^53). */
export const TOPE_TOTAL_CLP = 9_000_000_000_000_000;
/** Cota de cada factor (cantidad y precio) que acepta la API. */
export const TOPE_FACTOR = 1_000_000_000_000;

export const DECIMALES_CANTIDAD = 4;
export const DECIMALES_UF = 4;

export interface ContextoMoneda {
  moneda: MonedaContrato;
  /** Valor de la UF con que se convierte a CLP (obligatorio en versiones en UF). */
  valorUf: number | null;
}

export interface TotalesPartida {
  /** `cantidad × precio` en la moneda de la versión. */
  total: number;
  totalClp: number;
}

export interface ErrorCalculo {
  campo: 'cantidad' | 'precioUnitario';
  mensaje: string;
}

/** Cantidad de decimales significativos de un número. */
export function decimalesDe(valor: number): number {
  const texto = valor.toFixed(10).replace(/0+$/, '');
  const punto = texto.indexOf('.');
  return punto === -1 ? 0 : texto.length - punto - 1;
}

/** Mensaje de error de una cantidad, o `null` si es válida. */
export function errorDeCantidad(cantidad: number): string | null {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return 'La cantidad debe ser mayor que cero.';
  }
  if (decimalesDe(cantidad) > DECIMALES_CANTIDAD) {
    return `La cantidad admite hasta ${DECIMALES_CANTIDAD} decimales.`;
  }
  if (cantidad > TOPE_FACTOR) return 'La cantidad es demasiado alta.';
  return null;
}

/** Mensaje de error de un precio unitario según la moneda, o `null` si es válido. */
export function errorDePrecio(
  precio: number,
  moneda: MonedaContrato,
): string | null {
  if (!Number.isFinite(precio) || precio < 0) {
    return 'El precio unitario no puede ser negativo.';
  }
  if (precio > TOPE_FACTOR) return 'El precio unitario es demasiado alto.';
  if (moneda === MonedaContrato.Clp) {
    return Number.isInteger(precio)
      ? null
      : 'En una obra en CLP el precio unitario debe ser un número entero.';
  }
  return decimalesDe(precio) > DECIMALES_UF
    ? `El precio unitario en UF admite hasta ${DECIMALES_UF} decimales.`
    : null;
}

/** Decimales de los montos de una versión según su moneda (CLP: 0; UF: 4). */
export const decimalesDeMoneda = (moneda: MonedaContrato): number =>
  moneda === MonedaContrato.Clp ? 0 : DECIMALES_UF;

const fueraDeRango = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'MONTO_FUERA_DE_RANGO',
    'El monto de la partida es demasiado alto.',
  );

/**
 * Total de una partida: `cantidad × precio` redondeado (half-up) a los decimales de la
 * moneda de la versión, y su equivalente en CLP (en UF, al valor de la UF de la versión).
 * Aritmética exacta (sin errores de punto flotante). Lanza `422 MONTO_FUERA_DE_RANGO`.
 */
export function totalesDePartida(
  cantidad: number,
  precioUnitario: number,
  contexto: ContextoMoneda,
): TotalesPartida {
  const total = multiplicar(
    cantidad,
    precioUnitario,
    decimalesDeMoneda(contexto.moneda),
  );
  if (total > TOPE_TOTAL) throw fueraDeRango();
  if (contexto.moneda === MonedaContrato.Clp) {
    return { total, totalClp: total };
  }
  if (contexto.valorUf === null) {
    throw new Error('Una versión en UF requiere el valor de la UF');
  }
  const totalClp = ufAClp(total, contexto.valorUf);
  if (totalClp > TOPE_TOTAL_CLP) throw fueraDeRango();
  return { total, totalClp };
}

export interface PartidaTotalizable {
  familiaId: number;
  total: number;
  totalClp: number;
}

export interface TotalFamilia {
  familiaId: number;
  cantidadPartidas: number;
  total: number;
  totalClp: number;
}

export interface TotalesVersion {
  cantidadPartidas: number;
  total: number;
  totalClp: number;
  porFamilia: TotalFamilia[];
}

/** Totales de una versión: general y por familia (suma exacta de los totales de las partidas). */
export function totalizar(
  partidas: readonly PartidaTotalizable[],
  moneda: MonedaContrato,
): TotalesVersion {
  const decimales = decimalesDeMoneda(moneda);
  const grupos = new Map<number, PartidaTotalizable[]>();
  for (const partida of partidas) {
    const grupo = grupos.get(partida.familiaId);
    if (grupo) grupo.push(partida);
    else grupos.set(partida.familiaId, [partida]);
  }
  const porFamilia = [...grupos.entries()].map(([familiaId, grupo]) => ({
    familiaId,
    cantidadPartidas: grupo.length,
    total: sumar(
      grupo.map((p) => p.total),
      decimales,
    ),
    totalClp: sumar(
      grupo.map((p) => p.totalClp),
      0,
    ),
  }));
  const total = sumar(
    partidas.map((p) => p.total),
    decimales,
  );
  const totalClp = sumar(
    partidas.map((p) => p.totalClp),
    0,
  );
  if (total > TOPE_TOTAL || totalClp > TOPE_TOTAL_CLP) throw fueraDeRango();
  return { cantidadPartidas: partidas.length, total, totalClp, porFamilia };
}
