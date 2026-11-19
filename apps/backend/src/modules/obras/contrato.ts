import { HttpStatus } from '@nestjs/common';
import { ufAClp, type ValorUfDia } from '../../common/dinero/conversion-uf.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { MonedaContrato } from './obras.tipos.js';

/** Monto del contrato de una obra tal como se guarda (moneda original + equivalente en CLP). */
export interface ContratoObra {
  monedaContrato: MonedaContrato;
  montoContrato: number | null;
  montoContratoClp: number | null;
  fechaValorUf: string | null;
  valorUf: number | null;
}

const errorMonto = (mensaje: string): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'MONTO_INVALIDO',
    mensaje,
    [{ campo: 'montoContrato', errores: [mensaje] }],
  );

/**
 * Calcula lo que se guarda del monto del contrato (D-13):
 *  - sin monto: todo en `null`;
 *  - en CLP: pesos enteros, el equivalente es el mismo monto;
 *  - en UF: hasta 4 decimales; el equivalente en CLP es una fotografía con el valor de
 *    la UF aplicado (`valorUf`, obligatorio), redondeado a pesos enteros.
 */
export function calcularContrato(params: {
  moneda: MonedaContrato;
  monto: number | null;
  valorUf: ValorUfDia | null;
}): ContratoObra {
  const { moneda, monto, valorUf } = params;
  if (monto === null) {
    return {
      monedaContrato: moneda,
      montoContrato: null,
      montoContratoClp: null,
      fechaValorUf: null,
      valorUf: null,
    };
  }
  if (monto < 0) throw errorMonto('El monto no puede ser negativo.');

  if (moneda === MonedaContrato.Clp) {
    if (!Number.isInteger(monto)) {
      throw errorMonto('Un monto en CLP debe ser un número entero de pesos.');
    }
    return {
      monedaContrato: moneda,
      montoContrato: monto,
      montoContratoClp: monto,
      fechaValorUf: null,
      valorUf: null,
    };
  }

  if (!valorUf)
    throw new Error('Se requiere el valor de la UF para un monto en UF.');
  return {
    monedaContrato: moneda,
    montoContrato: monto,
    montoContratoClp: ufAClp(monto, valorUf.valor),
    fechaValorUf: valorUf.fecha,
    valorUf: valorUf.valor,
  };
}
