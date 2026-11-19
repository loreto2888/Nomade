import { describe, expect, it } from 'vitest';
import {
  calcularDigitoVerificador,
  esRutValido,
  formatearRut,
  formatearRutAlEscribir,
  normalizarRut,
} from './rut';

describe('RUT chileno (módulo 11)', () => {
  it('calcula el dígito verificador, incluidos 0 y K', () => {
    expect(calcularDigitoVerificador('12345678')).toBe('5');
    expect(calcularDigitoVerificador('76086428')).toBe('5');
    expect(calcularDigitoVerificador('10000013')).toBe('K');
    expect(calcularDigitoVerificador('7000004')).toBe('0');
  });

  it('normaliza puntos, espacios, guion y minúsculas', () => {
    expect(normalizarRut('12.345.678-5')).toBe('12345678-5');
    expect(normalizarRut(' 12345678 5 ')).toBe('12345678-5');
    expect(normalizarRut('10.000.013-k')).toBe('10000013-K');
    expect(normalizarRut('abc')).toBeNull();
    expect(normalizarRut('1234-5')).toBeNull();
  });

  it('valida el dígito verificador', () => {
    expect(esRutValido('12.345.678-5')).toBe(true);
    expect(esRutValido('10000013-K')).toBe(true);
    expect(esRutValido('7000004-0')).toBe(true);
    expect(esRutValido('12.345.678-9')).toBe(false);
    expect(esRutValido('')).toBe(false);
  });

  it('da formato mientras se escribe', () => {
    expect(formatearRutAlEscribir('')).toBe('');
    expect(formatearRutAlEscribir('1')).toBe('1');
    expect(formatearRutAlEscribir('12')).toBe('1-2');
    expect(formatearRutAlEscribir('123456785')).toBe('12.345.678-5');
    expect(formatearRutAlEscribir('12.345.678-5')).toBe('12.345.678-5');
    expect(formatearRutAlEscribir('10000013k')).toBe('10.000.013-K');
    expect(formatearRutAlEscribir('12a3b4')).toBe('123-4');
    expect(formatearRutAlEscribir('1234567890123')).toBe('12.345.678-9');
  });

  it('formatearRut deja el texto como está si no es un RUT', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5');
    expect(formatearRut('texto')).toBe('texto');
  });
});
