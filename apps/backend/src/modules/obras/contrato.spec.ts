import { describe, expect, it } from 'vitest';
import { calcularContrato } from './contrato.js';
import { MonedaContrato } from './obras.tipos.js';

const uf = { fecha: '2026-11-19', valor: 39284.8712 };

describe('calcularContrato (CLP y UF, D-13)', () => {
  it('sin monto deja todo vacío, sea cual sea la moneda', () => {
    for (const moneda of [MonedaContrato.Clp, MonedaContrato.Uf]) {
      expect(calcularContrato({ moneda, monto: null, valorUf: uf })).toEqual({
        monedaContrato: moneda,
        montoContrato: null,
        montoContratoClp: null,
        fechaValorUf: null,
        valorUf: null,
      });
    }
  });

  it('en CLP el equivalente es el mismo monto y no guarda UF', () => {
    expect(
      calcularContrato({
        moneda: MonedaContrato.Clp,
        monto: 185_000_000,
        valorUf: null,
      }),
    ).toEqual({
      monedaContrato: 'CLP',
      montoContrato: 185_000_000,
      montoContratoClp: 185_000_000,
      fechaValorUf: null,
      valorUf: null,
    });
  });

  it('en UF guarda una fotografía: monto UF, valor y fecha de la UF y el CLP redondeado', () => {
    expect(
      calcularContrato({
        moneda: MonedaContrato.Uf,
        monto: 4710.5,
        valorUf: uf,
      }),
    ).toEqual({
      monedaContrato: 'UF',
      montoContrato: 4710.5,
      montoContratoClp: 185_051_386,
      fechaValorUf: '2026-11-19',
      valorUf: 39284.8712,
    });
  });

  it('rechaza decimales en CLP y montos negativos (422)', () => {
    expect(() =>
      calcularContrato({
        moneda: MonedaContrato.Clp,
        monto: 100.5,
        valorUf: null,
      }),
    ).toThrow(expect.objectContaining({ status: 422 }));
    expect(() =>
      calcularContrato({ moneda: MonedaContrato.Uf, monto: -1, valorUf: uf }),
    ).toThrow(expect.objectContaining({ status: 422 }));
  });

  it('un monto en UF exige el valor de la UF (error de programación si falta)', () => {
    expect(() =>
      calcularContrato({ moneda: MonedaContrato.Uf, monto: 10, valorUf: null }),
    ).toThrow('valor de la UF');
  });
});
