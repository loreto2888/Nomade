import { describe, expect, it } from 'vitest';
import { MonedaContrato } from '../obras/obras.tipos.js';
import {
  TOPE_TOTAL,
  decimalesDe,
  errorDeCantidad,
  errorDePrecio,
  totalesDePartida,
  totalizar,
} from './calculo.js';

const clp = { moneda: MonedaContrato.Clp, valorUf: null };
const uf = { moneda: MonedaContrato.Uf, valorUf: 39284.8712 };

describe('total de una partida', () => {
  it('CLP: cantidad × precio redondeado a pesos enteros (half-up)', () => {
    expect(totalesDePartida(120.5, 18500, clp)).toEqual({
      total: 2_229_250,
      totalClp: 2_229_250,
    });
    // 33,3333 × 12.345 = 411.499,6… → 411.500
    expect(totalesDePartida(33.3333, 12_345, clp).total).toBe(411_500);
    expect(totalesDePartida(0.5, 1, clp).total).toBe(1);
  });

  it('evita los errores de punto flotante', () => {
    // 0,1 × 3 = 0,30000000000000004 en flotante
    expect(totalesDePartida(0.1, 30, clp).total).toBe(3);
    expect(totalesDePartida(1.005, 1000, clp).total).toBe(1005);
  });

  it('UF: total con 4 decimales y su equivalente en pesos al valor de la UF', () => {
    const r = totalesDePartida(2.5, 120.1234, uf);
    expect(r.total).toBe(300.3085);
    expect(r.totalClp).toBe(11_797_581); // 300,3085 × 39.284,8712
  });

  it('una versión en UF sin valor de UF es un error de programación', () => {
    expect(() =>
      totalesDePartida(1, 1, { moneda: MonedaContrato.Uf, valorUf: null }),
    ).toThrow('valor de la UF');
  });

  it('rechaza montos que no caben en la base de datos (422 MONTO_FUERA_DE_RANGO)', () => {
    expect(() =>
      totalesDePartida(1_000_000_000_000, 1_000_000_000_000, clp),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ codigo: 'MONTO_FUERA_DE_RANGO' }),
      }),
    );
    expect(totalesDePartida(1, TOPE_TOTAL, clp).total).toBe(TOPE_TOTAL);
    // En UF el equivalente en CLP también se acota.
    expect(() =>
      totalesDePartida(1, 90_000_000_000_000, {
        moneda: MonedaContrato.Uf,
        valorUf: 100_000,
      }),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ codigo: 'MONTO_FUERA_DE_RANGO' }),
      }),
    );
  });
});

describe('validación de cantidad y precio', () => {
  it('cantidad: mayor que cero y hasta 4 decimales', () => {
    expect(errorDeCantidad(1)).toBeNull();
    expect(errorDeCantidad(0.0001)).toBeNull();
    expect(errorDeCantidad(0)).toMatch(/mayor que cero/);
    expect(errorDeCantidad(-1)).toMatch(/mayor que cero/);
    expect(errorDeCantidad(1.00001)).toMatch(/4 decimales/);
    expect(errorDeCantidad(Number.NaN)).toMatch(/mayor que cero/);
    expect(errorDeCantidad(2_000_000_000_000)).toMatch(/demasiado alta/);
  });

  it('precio en CLP: entero y no negativo', () => {
    expect(errorDePrecio(0, MonedaContrato.Clp)).toBeNull();
    expect(errorDePrecio(18500, MonedaContrato.Clp)).toBeNull();
    expect(errorDePrecio(18500.5, MonedaContrato.Clp)).toMatch(/entero/);
    expect(errorDePrecio(-1, MonedaContrato.Clp)).toMatch(/negativo/);
  });

  it('precio en UF: hasta 4 decimales', () => {
    expect(errorDePrecio(120.1234, MonedaContrato.Uf)).toBeNull();
    expect(errorDePrecio(120.12345, MonedaContrato.Uf)).toMatch(/4 decimales/);
  });

  it('decimalesDe cuenta decimales significativos', () => {
    expect(decimalesDe(5)).toBe(0);
    expect(decimalesDe(5.25)).toBe(2);
    expect(decimalesDe(0.0001)).toBe(4);
    expect(decimalesDe(1.1)).toBe(1);
  });
});

describe('totales de una versión', () => {
  const partidas = [
    { familiaId: 1, total: 100.1, totalClp: 100 },
    { familiaId: 2, total: 200.2, totalClp: 200 },
    { familiaId: 1, total: 0.2, totalClp: 1 },
  ];

  it('suma exacta en la moneda de la versión y en CLP, general y por familia', () => {
    const t = totalizar(partidas, MonedaContrato.Uf);
    expect(t.total).toBe(300.5);
    expect(t.totalClp).toBe(301);
    expect(t.cantidadPartidas).toBe(3);
    expect(t.porFamilia).toEqual([
      { familiaId: 1, cantidadPartidas: 2, total: 100.3, totalClp: 101 },
      { familiaId: 2, cantidadPartidas: 1, total: 200.2, totalClp: 200 },
    ]);
  });

  it('una versión vacía totaliza cero', () => {
    expect(totalizar([], MonedaContrato.Clp)).toEqual({
      cantidadPartidas: 0,
      total: 0,
      totalClp: 0,
      porFamilia: [],
    });
  });

  it('la suma de los totales por familia coincide con el total', () => {
    const t = totalizar(partidas, MonedaContrato.Uf);
    expect(t.porFamilia.reduce((s, f) => s + f.totalClp, 0)).toBe(t.totalClp);
  });
});
