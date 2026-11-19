import { describe, expect, it } from 'vitest';
import { clpAUf, elegirValorUf, restarDias, ufAClp } from './conversion-uf.js';
import { dividir, multiplicar } from './decimal.js';

describe('aritmética decimal exacta', () => {
  it('multiplica sin errores de punto flotante', () => {
    // 0.1 × 3 en flotante da 0.30000000000000004
    expect(multiplicar(0.1, 3, 4)).toBe(0.3);
    expect(multiplicar('4710.5', '39284.8712', 4)).toBe(185051385.7876);
    expect(multiplicar(1.005, 100, 2)).toBe(100.5);
  });

  it('redondea half-up al número de decimales pedido', () => {
    expect(multiplicar('2.5', '1', 0)).toBe(3);
    expect(multiplicar('2.4999', '1', 0)).toBe(2);
    expect(multiplicar('-2.5', '1', 0)).toBe(-3);
    expect(multiplicar('1.2345', '1', 3)).toBe(1.235);
  });

  it('divide con redondeo y rechaza la división por cero', () => {
    expect(dividir(100, 3, 4)).toBe(33.3333);
    expect(dividir(200, 3, 4)).toBe(66.6667);
    expect(dividir('10', '4', 1)).toBe(2.5);
    expect(() => dividir(1, 0, 2)).toThrow('cero');
  });

  it('rechaza entradas no numéricas', () => {
    expect(() => multiplicar('abc', 1, 0)).toThrow('inválido');
  });
});

describe('conversión UF ↔ CLP', () => {
  it('UF → CLP en pesos enteros', () => {
    expect(ufAClp(4710.5, 39284.8712)).toBe(185051386);
    expect(ufAClp(1, 39284.8712)).toBe(39285);
    expect(ufAClp(0, 39284.8712)).toBe(0);
    expect(ufAClp(0.0001, 39284.8712)).toBe(4);
  });

  it('CLP → UF con 4 decimales', () => {
    expect(clpAUf(39284.8712, 39284.8712)).toBe(1);
    expect(clpAUf(1_000_000, 39284.8712)).toBe(25.4551);
  });

  it('ida y vuelta queda dentro del redondeo de un peso', () => {
    const clp = ufAClp(250.1234, 38000.5);
    expect(Math.abs(clpAUf(clp, 38000.5) - 250.1234)).toBeLessThan(0.0001);
  });
});

describe('valor de la UF por fecha', () => {
  const valores = [
    { fecha: '2026-11-10', valor: 100 },
    { fecha: '2026-11-17', valor: 107 },
    { fecha: '2026-11-18', valor: 108 },
    { fecha: '2026-11-21', valor: 111 },
  ];

  it('usa el valor del mismo día aunque haya posteriores (cualquier orden)', () => {
    expect(elegirValorUf([...valores].reverse(), '2026-11-18')).toEqual({
      fecha: '2026-11-18',
      valor: 108,
    });
  });

  it('si falta el día usa el último anterior de hasta 7 días', () => {
    expect(elegirValorUf(valores, '2026-11-19')).toEqual({
      fecha: '2026-11-18',
      valor: 108,
    });
    expect(elegirValorUf(valores, '2026-11-24')?.fecha).toBe('2026-11-21');
  });

  it('no usa valores de hace más de 7 días ni valores futuros', () => {
    expect(elegirValorUf(valores, '2026-11-29')).toBeNull();
    expect(elegirValorUf(valores, '2026-11-09')).toBeNull();
    expect(elegirValorUf([], '2026-11-19')).toBeNull();
  });

  it('restarDias respeta el calendario (meses y años bisiestos)', () => {
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
    expect(restarDias('2028-03-01', 1)).toBe('2028-02-29');
    expect(restarDias('2027-01-03', 7)).toBe('2026-12-27');
  });
});
