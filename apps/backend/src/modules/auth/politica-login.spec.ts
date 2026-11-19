import { describe, expect, it } from 'vitest';
import {
  DURACION_BLOQUEO_MS,
  MAX_INTENTOS_FALLIDOS,
  estaBloqueado,
  minutosRestantes,
  registrarFalloLogin,
} from './politica-login.js';

const ahora = new Date('2026-11-19T10:00:00.000Z');

describe('política de bloqueo por intentos', () => {
  it('cuenta intentos sin bloquear hasta el máximo', () => {
    let intentos = 0;
    for (let i = 1; i < MAX_INTENTOS_FALLIDOS; i++) {
      const r = registrarFalloLogin({ intentosFallidos: intentos }, ahora);
      expect(r).toEqual({
        intentosFallidos: i,
        bloqueadoHasta: null,
        bloqueada: false,
      });
      intentos = r.intentosFallidos;
    }
  });

  it('bloquea 15 minutos al llegar a 5 y reinicia el contador', () => {
    const r = registrarFalloLogin(
      { intentosFallidos: MAX_INTENTOS_FALLIDOS - 1 },
      ahora,
    );
    expect(r.bloqueada).toBe(true);
    expect(r.intentosFallidos).toBe(0);
    expect(r.bloqueadoHasta).toEqual(
      new Date(ahora.getTime() + DURACION_BLOQUEO_MS),
    );
    expect(DURACION_BLOQUEO_MS).toBe(15 * 60_000);
  });

  it('estaBloqueado depende de bloqueado_hasta', () => {
    expect(estaBloqueado({ bloqueadoHasta: null }, ahora)).toBe(false);
    expect(
      estaBloqueado({ bloqueadoHasta: new Date(ahora.getTime() + 1) }, ahora),
    ).toBe(true);
    expect(estaBloqueado({ bloqueadoHasta: ahora }, ahora)).toBe(false);
    expect(
      estaBloqueado(
        { bloqueadoHasta: new Date(ahora.getTime() - 1000) },
        ahora,
      ),
    ).toBe(false);
  });

  it('minutosRestantes redondea hacia arriba, mínimo 1', () => {
    expect(
      minutosRestantes(new Date(ahora.getTime() + 15 * 60_000), ahora),
    ).toBe(15);
    expect(minutosRestantes(new Date(ahora.getTime() + 61_000), ahora)).toBe(2);
    expect(minutosRestantes(new Date(ahora.getTime() + 500), ahora)).toBe(1);
  });
});
