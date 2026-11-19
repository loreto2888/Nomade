import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { Entorno } from '../../config/entorno.js';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF básica (complementa la cookie `SameSite=Strict`): los
 * métodos que modifican estado solo se aceptan si el header `Origin` (cuando
 * viene) coincide con `APP_ORIGIN`. Sin `Origin`, se rechaza si el navegador
 * declara la solicitud como `cross-site` mediante `Sec-Fetch-Site`.
 */
@Injectable()
export class OrigenMiddleware implements NestMiddleware {
  private readonly origenPermitido: string;

  constructor(config: ConfigService<Entorno, true>) {
    this.origenPermitido = config.get('APP_ORIGIN', { infer: true });
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    const origen = req.headers.origin;
    const origenAjeno =
      origen !== undefined
        ? origen !== this.origenPermitido
        : req.headers['sec-fetch-site'] === 'cross-site';
    if (!METODOS_SEGUROS.has(req.method) && origenAjeno) {
      throw new ErrorAplicacion(
        HttpStatus.FORBIDDEN,
        'ORIGEN_NO_PERMITIDO',
        'El origen de la solicitud no está permitido.',
      );
    }
    next();
  }
}
