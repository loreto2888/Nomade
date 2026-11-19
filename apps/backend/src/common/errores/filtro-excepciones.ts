import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { CuerpoError } from './error-aplicacion.js';

const POR_ESTADO: Record<number, { codigo: string; mensaje: string }> = {
  400: { codigo: 'SOLICITUD_INVALIDA', mensaje: 'La solicitud no es válida.' },
  401: { codigo: 'NO_AUTENTICADO', mensaje: 'Debes iniciar sesión.' },
  403: {
    codigo: 'PROHIBIDO',
    mensaje: 'No tienes permiso para realizar esta acción.',
  },
  404: { codigo: 'NO_ENCONTRADO', mensaje: 'El recurso solicitado no existe.' },
  405: { codigo: 'METODO_NO_PERMITIDO', mensaje: 'Método no permitido.' },
  409: {
    codigo: 'CONFLICTO',
    mensaje: 'La operación entra en conflicto con el estado actual.',
  },
  413: {
    codigo: 'CONTENIDO_DEMASIADO_GRANDE',
    mensaje: 'El contenido enviado es demasiado grande.',
  },
  415: {
    codigo: 'TIPO_NO_SOPORTADO',
    mensaje: 'El tipo de contenido no es soportado.',
  },
  422: {
    codigo: 'NO_PROCESABLE',
    mensaje: 'No se pudo procesar la solicitud.',
  },
  429: {
    codigo: 'DEMASIADAS_SOLICITUDES',
    mensaje: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.',
  },
  503: {
    codigo: 'SERVICIO_NO_DISPONIBLE',
    mensaje: 'El servicio no está disponible.',
  },
};

const ERROR_INTERNO: CuerpoError = {
  codigo: 'ERROR_INTERNO',
  mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
};

function esCuerpoError(valor: unknown): valor is CuerpoError {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as CuerpoError).codigo === 'string' &&
    typeof (valor as CuerpoError).mensaje === 'string'
  );
}

/**
 * Convierte cualquier excepción en `{ codigo, mensaje, detalles? }`.
 * Nunca envía stack traces al cliente; los errores 5xx se registran en el log.
 */
@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepciones.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const { estado, cuerpo } = this.traducir(excepcion);

    if (estado >= 500) {
      this.logger.error(
        excepcion instanceof Error ? excepcion : String(excepcion),
      );
    }

    if (respuesta.headersSent) return;
    respuesta.status(estado).json(cuerpo);
  }

  private traducir(excepcion: unknown): {
    estado: number;
    cuerpo: CuerpoError;
  } {
    if (!(excepcion instanceof HttpException)) {
      return {
        estado: HttpStatus.INTERNAL_SERVER_ERROR,
        cuerpo: ERROR_INTERNO,
      };
    }

    const estado = excepcion.getStatus();
    const original = excepcion.getResponse();
    if (esCuerpoError(original)) {
      const cuerpo: CuerpoError = {
        codigo: original.codigo,
        mensaje: original.mensaje,
      };
      if (Array.isArray(original.detalles)) cuerpo.detalles = original.detalles;
      return { estado, cuerpo };
    }

    if (estado >= 500) return { estado, cuerpo: ERROR_INTERNO };
    return {
      estado,
      cuerpo: POR_ESTADO[estado] ?? {
        codigo: 'ERROR',
        mensaje: 'No se pudo completar la solicitud.',
      },
    };
  }
}
