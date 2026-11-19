import { describe, expect, it } from 'vitest';
import { parsearMonto, textoEditableDeMonto } from './monto';

describe('parsearMonto', () => {
  it('CLP: solo dígitos, ignora puntos, espacios y símbolos', () => {
    expect(parsearMonto('185.000.000', 'CLP')).toBe(185_000_000);
    expect(parsearMonto('$ 1.250', 'CLP')).toBe(1250);
    expect(parsearMonto('0', 'CLP')).toBe(0);
  });

  it('CLP: descarta los decimales', () => {
    expect(parsearMonto('1.500,75', 'CLP')).toBe(1500);
  });

  it('vacío o sin dígitos es null', () => {
    expect(parsearMonto('', 'CLP')).toBeNull();
    expect(parsearMonto('abc', 'UF')).toBeNull();
    expect(parsearMonto(',5', 'CLP')).toBeNull();
  });

  it('UF: coma decimal y punto de miles', () => {
    expect(parsearMonto('4.710,5', 'UF')).toBe(4710.5);
    expect(parsearMonto('4710,5025', 'UF')).toBe(4710.5025);
    expect(parsearMonto('1.234.567,89', 'UF')).toBe(1_234_567.89);
    expect(parsearMonto('4710,', 'UF')).toBe(4710);
  });

  it('UF: un único punto con 1-2 o 4 decimales se toma como decimal; con 3 dígitos, como miles', () => {
    expect(parsearMonto('4710.5', 'UF')).toBe(4710.5);
    expect(parsearMonto('4710.5025', 'UF')).toBe(4710.5025);
    expect(parsearMonto('4.710', 'UF')).toBe(4710);
    expect(parsearMonto('1.234.567', 'UF')).toBe(1_234_567);
  });

  it('UF: recorta a 4 decimales', () => {
    expect(parsearMonto('1,123456', 'UF')).toBe(1.1234);
  });
});

describe('textoEditableDeMonto', () => {
  it('formatea con separador de miles y coma decimal', () => {
    expect(textoEditableDeMonto(185_000_000, 'CLP')).toBe('185.000.000');
    expect(textoEditableDeMonto(4710.5, 'UF')).toBe('4.710,5');
    expect(textoEditableDeMonto(0, 'CLP')).toBe('0');
    expect(textoEditableDeMonto(null, 'CLP')).toBe('');
  });

  it('CLP no muestra decimales', () => {
    expect(textoEditableDeMonto(1500.6, 'CLP')).toBe('1.501');
  });
});
