import { describe, expect, it } from 'vitest';
import { validarEntorno } from './entorno.js';

const valido = {
  DATABASE_URL: 'postgres://nomade_app:clave@localhost:5437/nomade',
  APP_ORIGIN: 'http://localhost:5177',
};

describe('validarEntorno', () => {
  it('aplica valores por defecto', () => {
    expect(validarEntorno(valido)).toEqual({
      ...valido,
      NODE_ENV: 'development',
      PORT: 3007,
      COOKIE_SECURE: false,
      SWAGGER_ENABLED: false,
      LOG_LEVEL: 'info',
      ADJUNTOS_DIR: './data/adjuntos',
    });
  });

  it('convierte booleanos y puerto', () => {
    const entorno = validarEntorno({
      ...valido,
      PORT: '4000',
      SWAGGER_ENABLED: 'true',
      COOKIE_SECURE: 'true',
    });
    expect(entorno.PORT).toBe(4000);
    expect(entorno.SWAGGER_ENABLED).toBe(true);
    expect(entorno.COOKIE_SECURE).toBe(true);
  });

  it('acepta ADJUNTOS_DIR y rechaza una ruta vacía', () => {
    expect(
      validarEntorno({ ...valido, ADJUNTOS_DIR: '/data/adjuntos' })
        .ADJUNTOS_DIR,
    ).toBe('/data/adjuntos');
    expect(() => validarEntorno({ ...valido, ADJUNTOS_DIR: '  ' })).toThrow(
      /ADJUNTOS_DIR no puede estar vacía/,
    );
  });

  it('falla con mensaje en español si falta DATABASE_URL', () => {
    expect(() => validarEntorno({ APP_ORIGIN: valido.APP_ORIGIN })).toThrow(
      /DATABASE_URL es obligatoria/,
    );
  });

  it('rechaza valores inválidos', () => {
    expect(() =>
      validarEntorno({
        ...valido,
        APP_ORIGIN: 'http://localhost:5177/',
        SWAGGER_ENABLED: 'si',
      }),
    ).toThrow(/APP_ORIGIN[\s\S]*SWAGGER_ENABLED debe ser "true" o "false"/);
  });
});
