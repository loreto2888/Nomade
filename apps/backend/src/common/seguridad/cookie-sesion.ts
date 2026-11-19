import type { CookieOptions, Request } from 'express';
import { isIP } from 'node:net';

/** Lee una cookie del header `Cookie` sin depender de `cookie-parser`. */
export function leerCookie(
  encabezado: string | undefined,
  nombre: string,
): string | undefined {
  if (!encabezado) return undefined;
  for (const par of encabezado.split(';')) {
    const indice = par.indexOf('=');
    if (indice < 0) continue;
    if (par.slice(0, indice).trim() !== nombre) continue;
    const valor = par.slice(indice + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Cookie `httpOnly`, `SameSite=Strict`; `Secure` según `COOKIE_SECURE`. */
export function opcionesCookieSesion(
  secure: boolean,
  expira: Date,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    expires: expira,
  };
}

export function opcionesLimpiarCookie(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: '/' };
}

/**
 * IP del cliente. Detrás de Cloudflare Tunnel, `req.ip` es la del conector;
 * la IP real llega en `CF-Connecting-IP`. Es solo informativa (auditoría y
 * límite de tasa): el bloqueo de cuenta no depende de ella.
 */
export function ipCliente(req: Pick<Request, 'headers' | 'ip'>): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && isIP(cf.trim()) !== 0) return cf.trim();
  return req.ip ?? 'desconocida';
}
