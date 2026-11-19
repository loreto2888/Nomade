import { describe, expect, it } from 'vitest';
import { rutaDestinoSegura } from './rutasAcceso';

describe('rutaDestinoSegura', () => {
  it('acepta rutas internas', () => {
    expect(rutaDestinoSegura('/obras?x=1')).toBe('/obras?x=1');
  });

  it('descarta destinos externos o inválidos (sin redirecciones abiertas)', () => {
    expect(rutaDestinoSegura('//evil.example')).toBe('/');
    expect(rutaDestinoSegura('https://evil.example')).toBe('/');
    expect(rutaDestinoSegura(undefined)).toBe('/');
    expect(rutaDestinoSegura(42)).toBe('/');
  });
});
