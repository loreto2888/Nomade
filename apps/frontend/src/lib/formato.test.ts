import { describe, expect, it } from 'vitest';
import { formatearFechaHora, iniciales } from './formato';

describe('formato', () => {
  it('iniciales usa hasta dos palabras en mayúsculas', () => {
    expect(iniciales('Camila Rojas')).toBe('CR');
    expect(iniciales('  ana   maría  pérez ')).toBe('AM');
    expect(iniciales('Administrador')).toBe('A');
    expect(iniciales('')).toBe('');
  });

  it('formatearFechaHora tolera nulos y textos inválidos', () => {
    expect(formatearFechaHora(null)).toBe('—');
    expect(formatearFechaHora('no es fecha')).toBe('no es fecha');
    expect(formatearFechaHora('2026-11-19T12:30:00.000Z')).toMatch(/2026/);
  });
});
