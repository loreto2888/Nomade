import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { OrigenMiddleware } from './origen.middleware.js';

const middleware = new OrigenMiddleware({
  get: () => 'https://nomade.coworlabs.cl',
} as unknown as ConfigService<never, true>);

function ejecutar(metodo: string, headers: Record<string, string>) {
  const siguiente = vi.fn();
  const ejecucion = () =>
    middleware.use(
      { method: metodo, headers } as unknown as Request,
      {} as Response,
      siguiente,
    );
  return { ejecucion, siguiente };
}

describe('OrigenMiddleware (verificación de Origin en métodos no-GET)', () => {
  it('rechaza un POST desde otro origen con 403 ORIGEN_NO_PERMITIDO', () => {
    const { ejecucion, siguiente } = ejecutar('POST', {
      origin: 'https://evil.example',
    });
    expect(ejecucion).toThrow(
      expect.objectContaining({
        status: 403,
        response: expect.objectContaining({ codigo: 'ORIGEN_NO_PERMITIDO' }),
      }),
    );
    expect(siguiente).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s con el origen de la app pasa',
    (metodo) => {
      const { ejecucion, siguiente } = ejecutar(metodo, {
        origin: 'https://nomade.coworlabs.cl',
      });
      ejecucion();
      expect(siguiente).toHaveBeenCalled();
    },
  );

  it('los métodos seguros no se verifican', () => {
    for (const metodo of ['GET', 'HEAD', 'OPTIONS']) {
      const { ejecucion, siguiente } = ejecutar(metodo, {
        origin: 'https://evil.example',
      });
      ejecucion();
      expect(siguiente).toHaveBeenCalled();
    }
  });

  it('sin Origin pasa (curl, health checks) salvo que el navegador declare cross-site', () => {
    const sinOrigen = ejecutar('POST', {});
    sinOrigen.ejecucion();
    expect(sinOrigen.siguiente).toHaveBeenCalled();

    const mismoSitio = ejecutar('POST', { 'sec-fetch-site': 'same-origin' });
    mismoSitio.ejecucion();
    expect(mismoSitio.siguiente).toHaveBeenCalled();

    const ajeno = ejecutar('POST', { 'sec-fetch-site': 'cross-site' });
    expect(ajeno.ejecucion).toThrow(expect.objectContaining({ status: 403 }));
  });
});
