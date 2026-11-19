import { describe, expect, it } from 'vitest';
import { sanitizarParaAuditoria } from './sanitizar.js';

describe('sanitizarParaAuditoria', () => {
  it('elimina contraseñas, hashes y tokens (en cualquier nivel)', () => {
    const resultado = sanitizarParaAuditoria({
      id: 1,
      correo: 'a@nomade.cl',
      claveTemporal: 'secreta',
      claveHash: '$argon2id$…',
      password: 'x',
      anidado: { token: 't', tokenHash: 'h', ok: true },
      lista: [{ clave: 'c', valor: 2 }],
    });
    expect(resultado).toEqual({
      id: 1,
      correo: 'a@nomade.cl',
      anidado: { ok: true },
      lista: [{ valor: 2 }],
    });
  });

  it('conserva campos que solo contienen la palabra "clave" en su nombre', () => {
    expect(
      sanitizarParaAuditoria({ debeCambiarClave: true, claveCambiadaEn: null }),
    ).toEqual({
      debeCambiarClave: true,
      claveCambiadaEn: null,
    });
  });

  it('convierte fechas a ISO y maneja null/undefined', () => {
    expect(
      sanitizarParaAuditoria({ f: new Date('2026-11-19T00:00:00.000Z') }),
    ).toEqual({
      f: '2026-11-19T00:00:00.000Z',
    });
    expect(sanitizarParaAuditoria(null)).toBeNull();
    expect(sanitizarParaAuditoria(undefined)).toBeNull();
    expect(sanitizarParaAuditoria('texto')).toBe('texto');
  });

  it('corta estructuras demasiado profundas', () => {
    let profundo: Record<string, unknown> = { fin: 1 };
    for (let i = 0; i < 10; i++) profundo = { n: profundo };
    expect(JSON.stringify(sanitizarParaAuditoria(profundo))).toContain('[…]');
  });
});
