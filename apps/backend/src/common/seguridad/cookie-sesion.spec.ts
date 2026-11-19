import { describe, expect, it } from 'vitest';
import {
  ipCliente,
  leerCookie,
  opcionesCookieSesion,
  opcionesLimpiarCookie,
} from './cookie-sesion.js';

describe('cookies de sesión', () => {
  it('lee una cookie entre varias', () => {
    expect(
      leerCookie('a=1; nomade_session=abc123; b=2', 'nomade_session'),
    ).toBe('abc123');
    expect(leerCookie('nomade_session=x%20y', 'nomade_session')).toBe('x y');
  });

  it('devuelve undefined si no existe o está malformada', () => {
    expect(leerCookie(undefined, 'nomade_session')).toBeUndefined();
    expect(leerCookie('otra=1', 'nomade_session')).toBeUndefined();
    expect(
      leerCookie('nomade_session=%E0%A4%A', 'nomade_session'),
    ).toBeUndefined();
    expect(leerCookie('xnomade_session=1', 'nomade_session')).toBeUndefined();
  });

  it('la cookie es httpOnly, SameSite=Strict y Secure según COOKIE_SECURE', () => {
    const expira = new Date('2026-11-19T18:00:00.000Z');
    expect(opcionesCookieSesion(true, expira)).toEqual({
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
      expires: expira,
    });
    expect(opcionesCookieSesion(false, expira).secure).toBe(false);
    expect(opcionesLimpiarCookie(true)).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });
  });

  it('la IP del cliente prefiere CF-Connecting-IP válida (Cloudflare Tunnel)', () => {
    expect(
      ipCliente({
        headers: { 'cf-connecting-ip': '200.1.2.3' },
        ip: '172.18.0.5',
      }),
    ).toBe('200.1.2.3');
    expect(
      ipCliente({
        headers: { 'cf-connecting-ip': 'basura' },
        ip: '172.18.0.5',
      }),
    ).toBe('172.18.0.5');
    expect(ipCliente({ headers: {}, ip: undefined })).toBe('desconocida');
  });
});
