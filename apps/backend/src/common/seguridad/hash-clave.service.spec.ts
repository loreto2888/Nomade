import { describe, expect, it } from 'vitest';
import { HashClaveService } from './hash-clave.service.js';

describe('HashClaveService (argon2id)', () => {
  const servicio = new HashClaveService();

  it('genera un hash PHC argon2id con sal aleatoria', async () => {
    const a = await servicio.hashear('mi-clave-segura-123');
    const b = await servicio.hashear('mi-clave-segura-123');
    expect(a).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/,
    );
    expect(a).not.toContain('mi-clave-segura-123');
    expect(a).not.toBe(b);
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await servicio.hashear('mi-clave-segura-123');
    await expect(servicio.verificar('mi-clave-segura-123', hash)).resolves.toBe(
      true,
    );
    await expect(servicio.verificar('otra-clave-distinta', hash)).resolves.toBe(
      false,
    );
    await expect(servicio.verificar('', hash)).resolves.toBe(false);
  });

  it('soporta caracteres no ASCII', async () => {
    const hash = await servicio.hashear('contraseña-ñandú-✓-12345');
    await expect(
      servicio.verificar('contraseña-ñandú-✓-12345', hash),
    ).resolves.toBe(true);
  });

  it('devuelve false (sin lanzar) ante hashes malformados', async () => {
    for (const hash of [
      '',
      'texto',
      '$argon2id$v=19$m=1,t=1,p=1$a$b',
      '$bcrypt$x$y$z$w',
      '$argon2id$v=18$m=19456,t=2,p=1$AAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAA',
    ]) {
      await expect(servicio.verificar('x', hash)).resolves.toBe(false);
    }
  });
});
