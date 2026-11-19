import { describe, expect, it } from 'vitest';
import { compararPartidas, type PartidaComparable } from './comparacion.js';

const partida = (
  codigo: string,
  orden: number,
  parcial: Partial<PartidaComparable> = {},
): PartidaComparable => ({
  codigo,
  orden,
  familiaId: 1,
  descripcion: `Partida ${codigo}`,
  unidad: 'm2',
  cantidad: 10,
  precioUnitario: 1000,
  total: 10_000,
  totalClp: 10_000,
  ...parcial,
});

describe('comparación de versiones por código de partida', () => {
  it('clasifica nuevas, eliminadas, modificadas y sin cambios', () => {
    const base = [partida('1', 1), partida('2', 2), partida('3', 3)];
    const nueva = [
      partida('1', 1),
      partida('2', 2, { cantidad: 20, total: 20_000, totalClp: 20_000 }),
      partida('4', 3, { totalClp: 5_000, total: 5_000 }),
    ];
    const r = compararPartidas(base, nueva, true);
    expect(r.filas.map((f) => [f.codigo, f.cambio, f.diferenciaClp])).toEqual([
      ['1', 'sin_cambios', 0],
      ['2', 'modificada', 10_000],
      ['4', 'nueva', 5_000],
      ['3', 'eliminada', -10_000],
    ]);
    expect(r).toMatchObject({
      nuevas: 1,
      eliminadas: 1,
      modificadas: 1,
      sinCambios: 1,
      totalBaseClp: 30_000,
      totalNuevoClp: 35_000,
      diferenciaClp: 5_000,
    });
  });

  it('cambiar familia, descripción, unidad o precio cuenta como modificación', () => {
    const base = [partida('1', 1)];
    for (const cambio of [
      { familiaId: 2 },
      { descripcion: 'otra' },
      { unidad: 'ml' },
      { precioUnitario: 1200 },
    ]) {
      const r = compararPartidas(base, [partida('1', 1, cambio)], true);
      expect(r.filas[0].cambio).toBe('modificada');
    }
  });

  it('con versiones en UF, un cambio solo del valor de la UF no es una modificación pero sí una diferencia en CLP', () => {
    const base = [partida('1', 1, { totalClp: 10_000 })];
    const nueva = [partida('1', 1, { totalClp: 10_300 })];
    const r = compararPartidas(base, nueva, true);
    expect(r.filas[0]).toMatchObject({
      cambio: 'sin_cambios',
      diferenciaClp: 300,
    });
  });

  it('con monedas distintas compara el total en CLP', () => {
    const base = [partida('1', 1, { precioUnitario: 1000, totalClp: 10_000 })];
    const igual = [partida('1', 1, { precioUnitario: 0.25, totalClp: 10_000 })];
    const distinta = [
      partida('1', 1, { precioUnitario: 0.25, totalClp: 11_000 }),
    ];
    expect(compararPartidas(base, igual, false).filas[0].cambio).toBe(
      'sin_cambios',
    );
    expect(compararPartidas(base, distinta, false).filas[0].cambio).toBe(
      'modificada',
    );
  });

  it('versiones vacías', () => {
    expect(compararPartidas([], [], true)).toMatchObject({
      filas: [],
      totalBaseClp: 0,
      diferenciaClp: 0,
    });
  });
});
