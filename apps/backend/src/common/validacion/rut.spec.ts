import { describe, expect, it } from 'vitest';
import {
  calcularDigitoVerificador,
  esRutValido,
  formatearRut,
  normalizarRut,
  rutValidoONulo,
} from './rut.js';

describe('RUT chileno (módulo 11)', () => {
  it('calcula el dígito verificador, incluidos 0 y K', () => {
    expect(calcularDigitoVerificador('12345678')).toBe('5');
    expect(calcularDigitoVerificador('76086428')).toBe('5');
    expect(calcularDigitoVerificador('11111111')).toBe('1');
    expect(calcularDigitoVerificador('10000013')).toBe('K');
    expect(calcularDigitoVerificador('7000004')).toBe('0');
    expect(calcularDigitoVerificador('7000005')).toBe('9');
  });

  it('normaliza puntos, espacios, guion y minúsculas', () => {
    expect(normalizarRut('12.345.678-5')).toBe('12345678-5');
    expect(normalizarRut(' 12345678 5 ')).toBe('12345678-5');
    expect(normalizarRut('123456785')).toBe('12345678-5');
    expect(normalizarRut('10.000.013-k')).toBe('10000013-K');
  });

  it('rechaza formatos que no son RUT', () => {
    for (const texto of [
      '',
      '5',
      'abc',
      '1234-5',
      '123456789012-3',
      '12.345.67X-5',
      '--',
    ]) {
      expect(normalizarRut(texto)).toBeNull();
    }
  });

  it('valida el dígito verificador', () => {
    expect(esRutValido('12.345.678-5')).toBe(true);
    expect(esRutValido('10000013-K')).toBe(true);
    expect(esRutValido('10000013-k')).toBe(true);
    expect(esRutValido('7000004-0')).toBe(true);
    expect(esRutValido('12.345.678-9')).toBe(false);
    expect(esRutValido('10000013-1')).toBe(false);
    expect(esRutValido('no es un rut')).toBe(false);
  });

  it('rutValidoONulo devuelve el RUT normalizado solo si es válido', () => {
    expect(rutValidoONulo('76.086.428-5')).toBe('76086428-5');
    expect(rutValidoONulo('76.086.428-4')).toBeNull();
  });

  it('formatea con puntos y guion', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5');
    expect(formatearRut('7000000-8')).toBe('7.000.000-8');
    expect(formatearRut('xyz')).toBe('xyz');
  });
});
