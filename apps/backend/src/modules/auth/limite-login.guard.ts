import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { ipCliente } from '../../common/seguridad/cookie-sesion.js';

/**
 * Límite de tasa por IP real del cliente (detrás del túnel `req.ip` sería
 * siempre la del conector de Cloudflare).
 */
@Injectable()
export class LimiteLoginGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(ipCliente(req as unknown as Request));
  }
}
