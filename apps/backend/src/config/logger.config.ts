import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { Entorno } from './entorno.js';

const HEADER_ID = 'x-request-id';
const ID_VALIDO = /^[\w.:-]{1,128}$/;

/**
 * Logs JSON a stdout (pino). Cada request lleva un id de correlación: se
 * reutiliza `x-request-id` si viene (p. ej. desde nginx) y se devuelve en la
 * respuesta. En desarrollo se formatean con pino-pretty.
 */
export function crearConfigLogger(
  entorno: Pick<Entorno, 'NODE_ENV' | 'LOG_LEVEL'>,
): Params {
  return {
    pinoHttp: {
      level: entorno.LOG_LEVEL,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const recibido = req.headers[HEADER_ID];
        const id =
          typeof recibido === 'string' && ID_VALIDO.test(recibido)
            ? recibido
            : randomUUID();
        res.setHeader(HEADER_ID, id);
        return id;
      },
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
        ],
        censor: '[oculto]',
      },
      autoLogging: {
        // El healthcheck de Docker consulta cada pocos segundos: no se registra.
        ignore: (req) => req.url?.startsWith('/api/health') ?? false,
      },
      transport:
        entorno.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' },
            }
          : undefined,
    },
  };
}
