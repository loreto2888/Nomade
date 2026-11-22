import { describe, expect, it } from 'vitest';
import {
  errorDeHitos,
  montoDePorcentaje,
  montoParcial,
  montosDeHitos,
  montosDeOc,
  totalDeLinea,
} from './calculo.js';

describe('cálculos de compras', () => {
  describe('montosDeHitos', () => {
    it('reparte el monto por porcentaje y el último hito absorbe el redondeo', () => {
      const montos = montosDeHitos(10_000_000, [33.33, 33.33, 33.34]);
      expect(montos).toEqual([3_333_000, 3_333_000, 3_334_000]);
      expect(montos.reduce((a, b) => a + b, 0)).toBe(10_000_000);
    });

    it('con un monto que no divide exacto, la suma sigue siendo el monto de la OT', () => {
      const montos = montosDeHitos(1_000_001, [33.33, 33.33, 33.34]);
      expect(montos.reduce((a, b) => a + b, 0)).toBe(1_000_001);
    });

    it('si los hitos no suman 100 % (borrador) no ajusta el último', () => {
      expect(montosDeHitos(1_000_000, [30, 20])).toEqual([300_000, 200_000]);
    });
  });

  describe('errorDeHitos', () => {
    it('un borrador admite menos de 100 % pero no más', () => {
      expect(errorDeHitos([30, 20], false)).toBeNull();
      expect(errorDeHitos([], false)).toBeNull();
      expect(errorDeHitos([80, 30], false)).toMatch(/no pueden superar el 100/);
    });

    it('para enviar a revisión deben sumar exactamente 100 % (sin error de punto flotante)', () => {
      expect(errorDeHitos([33.33, 33.33, 33.34], true)).toBeNull();
      expect(errorDeHitos([0.1, 0.2, 99.7], true)).toBeNull();
      expect(errorDeHitos([50, 49.99], true)).toMatch(/exactamente 100/);
      expect(errorDeHitos([], true)).toMatch(/al menos un hito/);
    });
  });

  describe('montoParcial (tope = saldo del hito)', () => {
    const hito = {
      porcentaje: 33.33,
      montoNeto: 3_333_000,
      porcentajeOcupado: 0,
      montoOcupado: 0,
    };

    it('calcula el porcentaje sobre el monto de la OT', () => {
      expect(montoParcial(10_000_000, hito, 20)).toEqual({
        ok: true,
        montoNeto: 2_000_000,
      });
    });

    it('la OC que completa el hito toma exactamente su saldo', () => {
      expect(
        montoParcial(
          10_000_001,
          {
            ...hito,
            montoNeto: 3_333_400,
            porcentajeOcupado: 20,
            montoOcupado: 2_000_000,
          },
          13.33,
        ),
      ).toEqual({ ok: true, montoNeto: 1_333_400 });
    });

    it('rechaza un porcentaje mayor que el disponible del hito', () => {
      expect(
        montoParcial(
          10_000_000,
          { ...hito, porcentajeOcupado: 20, montoOcupado: 2_000_000 },
          13.34,
        ),
      ).toEqual({
        ok: false,
        porcentajeDisponible: 13.33,
        montoDisponible: 1_333_000,
      });
    });

    it('un hito agotado no admite más OC', () => {
      expect(
        montoParcial(
          10_000_000,
          { ...hito, porcentajeOcupado: 33.33, montoOcupado: 3_333_000 },
          0.01,
        ).ok,
      ).toBe(false);
    });
  });

  it('IVA half-up a pesos y OC exenta sin IVA', () => {
    expect(montosDeOc(874_455, 19, true)).toEqual({
      montoNeto: 874_455,
      montoIva: 166_146,
      montoTotal: 1_040_601,
    });
    expect(montosDeOc(874_455, 19, false)).toEqual({
      montoNeto: 874_455,
      montoIva: 0,
      montoTotal: 874_455,
    });
  });

  it('total de línea con decimales, redondeado a pesos', () => {
    expect(totalDeLinea(120, 6500.5)).toBe(780_060);
    expect(totalDeLinea(10.5, 8990)).toBe(94_395);
    expect(totalDeLinea(0.3333, 3)).toBe(1);
    expect(montoDePorcentaje(1_000_000, 0.01)).toBe(100);
  });
});
