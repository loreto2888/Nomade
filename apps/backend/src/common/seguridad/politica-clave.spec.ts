import { describe, expect, it } from 'vitest';
import { generarClaveTemporal } from './clave-temporal.js';
import {
  MAX_LARGO_CLAVE,
  MIN_LARGO_CLAVE,
  validarClaveNueva,
} from './politica-clave.js';

describe('validarClaveNueva', () => {
  it('exige al menos 12 caracteres', () => {
    expect(MIN_LARGO_CLAVE).toBe(12);
    expect(validarClaveNueva('a'.repeat(11))).toBe(
      'La contraseña debe tener al menos 12 caracteres.',
    );
    expect(validarClaveNueva('a'.repeat(12))).toBeNull();
  });

  it('limita el largo máximo', () => {
    expect(validarClaveNueva('a'.repeat(MAX_LARGO_CLAVE))).toBeNull();
    expect(validarClaveNueva('a'.repeat(MAX_LARGO_CLAVE + 1))).toMatch(
      /como máximo 128/,
    );
  });

  it('rechaza contraseñas formadas solo por espacios', () => {
    expect(validarClaveNueva(' '.repeat(20))).toMatch(/solo por espacios/);
  });
});

describe('generarClaveTemporal', () => {
  it('cumple la política y no repite valores', () => {
    const claves = new Set(
      Array.from({ length: 50 }, () => generarClaveTemporal()),
    );
    expect(claves.size).toBe(50);
    for (const clave of claves) {
      expect(validarClaveNueva(clave)).toBeNull();
      expect(clave).toMatch(/^[A-HJ-NP-Za-km-z2-9]{16}$/);
    }
  });
});
