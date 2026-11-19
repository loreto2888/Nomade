import { isAxiosError } from 'axios';

/** Error de la API normalizado (`ErrorResponse` del backend: `{ codigo, mensaje, detalles? }`). */
export interface ErrorApi {
  /** Estado HTTP; `undefined` si no hubo respuesta (red caída). */
  estado: number | undefined;
  codigo: string;
  mensaje: string;
  detalles: unknown[];
}

const MENSAJE_RED =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta nuevamente.';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

export function normalizarError(error: unknown): ErrorApi {
  if (isAxiosError(error)) {
    if (!error.response) {
      return { estado: undefined, codigo: 'SIN_CONEXION', mensaje: MENSAJE_RED, detalles: [] };
    }
    const datos: unknown = error.response.data;
    if (esObjeto(datos) && typeof datos.codigo === 'string' && typeof datos.mensaje === 'string') {
      return {
        estado: error.response.status,
        codigo: datos.codigo,
        mensaje: datos.mensaje,
        detalles: Array.isArray(datos.detalles) ? datos.detalles : [],
      };
    }
    return {
      estado: error.response.status,
      codigo: 'ERROR',
      mensaje: MENSAJE_GENERICO,
      detalles: [],
    };
  }
  return { estado: undefined, codigo: 'ERROR', mensaje: MENSAJE_GENERICO, detalles: [] };
}

export const mensajeDeError = (error: unknown): string => normalizarError(error).mensaje;

export const esConflictoVersion = (error: unknown): boolean =>
  normalizarError(error).codigo === 'CONFLICTO_VERSION';

/** Versión vigente informada por un `409 CONFLICTO_VERSION`. */
export function versionActualDelConflicto(error: unknown): number | undefined {
  const detalle = normalizarError(error).detalles[0];
  return esObjeto(detalle) && typeof detalle.versionActual === 'number'
    ? detalle.versionActual
    : undefined;
}

/** Errores de validación por campo (`detalles: [{ campo, errores[] }]`). */
export function erroresPorCampo(error: unknown): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const detalle of normalizarError(error).detalles) {
    if (
      esObjeto(detalle) &&
      typeof detalle.campo === 'string' &&
      Array.isArray(detalle.errores) &&
      typeof detalle.errores[0] === 'string'
    ) {
      resultado[detalle.campo] = detalle.errores[0];
    }
  }
  return resultado;
}
