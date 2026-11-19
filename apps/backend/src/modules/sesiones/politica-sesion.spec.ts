import { describe, expect, it } from 'vitest';
import {
  DURACION_SESION_MS,
  INACTIVIDAD_MAXIMA_MS,
  INTERVALO_ACTIVIDAD_MS,
  calcularExpiracion,
  debeRegistrarActividad,
  evaluarSesion,
} from './politica-sesion.js';

const inicio = new Date('2026-11-19T08:00:00.000Z');
const despues = (ms: number) => new Date(inicio.getTime() + ms);
const sesion = (
  parcial: Partial<Parameters<typeof evaluarSesion>[0]> = {},
) => ({
  expiraEn: calcularExpiracion(inicio),
  ultimaActividadEn: inicio,
  revocadaEn: null,
  ...parcial,
});

describe('política de sesión (D-11)', () => {
  it('dura 8 h y expira tras 30 min de inactividad', () => {
    expect(DURACION_SESION_MS).toBe(8 * 3_600_000);
    expect(INACTIVIDAD_MAXIMA_MS).toBe(30 * 60_000);
    expect(calcularExpiracion(inicio)).toEqual(despues(DURACION_SESION_MS));
  });

  it('es válida mientras haya actividad reciente y no pasen 8 h', () => {
    expect(evaluarSesion(sesion(), despues(10 * 60_000))).toBe('valida');
    expect(evaluarSesion(sesion(), despues(INACTIVIDAD_MAXIMA_MS - 1))).toBe(
      'valida',
    );
  });

  it('queda inactiva a los 30 min sin actividad', () => {
    expect(evaluarSesion(sesion(), despues(INACTIVIDAD_MAXIMA_MS))).toBe(
      'inactiva',
    );
    expect(evaluarSesion(sesion(), despues(2 * 3_600_000))).toBe('inactiva');
  });

  it('con actividad sostenida expira igual a las 8 h', () => {
    const ahora = despues(DURACION_SESION_MS);
    const activa = sesion({
      ultimaActividadEn: despues(DURACION_SESION_MS - 60_000),
    });
    expect(evaluarSesion(activa, despues(DURACION_SESION_MS - 1))).toBe(
      'valida',
    );
    expect(evaluarSesion(activa, ahora)).toBe('expirada');
  });

  it('una sesión revocada no es válida aunque esté vigente', () => {
    expect(evaluarSesion(sesion({ revocadaEn: despues(1) }), despues(2))).toBe(
      'revocada',
    );
  });

  it('persiste la actividad como máximo una vez por intervalo', () => {
    expect(
      debeRegistrarActividad(
        { ultimaActividadEn: inicio },
        despues(INTERVALO_ACTIVIDAD_MS - 1),
      ),
    ).toBe(false);
    expect(
      debeRegistrarActividad(
        { ultimaActividadEn: inicio },
        despues(INTERVALO_ACTIVIDAD_MS),
      ),
    ).toBe(true);
  });
});
