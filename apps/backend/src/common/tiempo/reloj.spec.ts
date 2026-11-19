import { describe, expect, it } from 'vitest';
import { esFechaValida, fechaChile, Reloj } from './reloj.js';

describe('fechas de Chile', () => {
  it('convierte un instante a la fecha de Chile (no a la de UTC)', () => {
    // 02:30 UTC del 19-11 son las 23:30 del 18-11 en Chile (UTC-3 en verano).
    expect(fechaChile(new Date('2026-11-19T02:30:00.000Z'))).toBe('2026-11-18');
    expect(fechaChile(new Date('2026-11-19T15:00:00.000Z'))).toBe('2026-11-19');
  });

  it('usa el huso de invierno (UTC-4) en julio', () => {
    expect(fechaChile(new Date('2026-07-10T03:30:00.000Z'))).toBe('2026-07-09');
    expect(fechaChile(new Date('2026-07-10T04:30:00.000Z'))).toBe('2026-07-10');
  });

  it('valida fechas de calendario existentes', () => {
    expect(esFechaValida('2026-11-19')).toBe(true);
    expect(esFechaValida('2028-02-29')).toBe(true);
    expect(esFechaValida('2027-02-29')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esFechaValida('19-11-2026')).toBe(false);
    expect(esFechaValida('2026-11-19T00:00:00Z')).toBe(false);
  });

  it('Reloj.hoy usa la hora de Chile', () => {
    class RelojDePrueba extends Reloj {
      override ahora(): Date {
        return new Date('2026-11-19T02:30:00.000Z');
      }
    }
    expect(new RelojDePrueba().hoy()).toBe('2026-11-18');
  });
});
