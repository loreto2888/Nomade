import { describe, expect, it } from 'vitest';
import {
  formatCLP,
  formatUF,
  formatearFecha,
  formatearFechaHora,
  formatearMonto,
  formatearTamanio,
  iniciales,
} from './formato';

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

  it('formatCLP usa punto de miles y sin decimales', () => {
    expect(formatCLP(185_000_000)).toBe('$ 185.000.000');
    expect(formatCLP(0)).toBe('$ 0');
    expect(formatCLP(1500.4)).toBe('$ 1.500');
    expect(formatCLP(null)).toBe('—');
    expect(formatCLP(undefined)).toBe('—');
  });

  it('formatUF usa coma decimal con 2 a 4 decimales', () => {
    expect(formatUF(4710.5)).toBe('UF 4.710,50');
    expect(formatUF(1.2345)).toBe('UF 1,2345');
    expect(formatUF(null)).toBe('—');
  });

  it('formatearMonto elige la moneda', () => {
    expect(formatearMonto(1000, 'CLP')).toBe('$ 1.000');
    expect(formatearMonto(10, 'UF')).toBe('UF 10,00');
  });

  it('formatearFecha no corre el día por el huso horario', () => {
    expect(formatearFecha('2026-03-01')).toMatch(/^(01-03-2026|1 mar\.? 2026)$/i);
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('no-fecha')).toBe('no-fecha');
  });

  it('formatearTamanio muestra B, KB y MB', () => {
    expect(formatearTamanio(500)).toBe('500 B');
    expect(formatearTamanio(482_133)).toBe('471 KB');
    expect(formatearTamanio(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
});
