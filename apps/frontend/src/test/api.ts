import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { vi } from 'vitest';
import { http } from '@/api/http';

type Manejador = (config: AxiosRequestConfig) => unknown;

/** Error HTTP con el cuerpo `ErrorResponse` del backend. */
export function errorApi(
  estado: number,
  codigo: string,
  mensaje: string,
  detalles?: unknown[],
): AxiosError {
  const config = { headers: {} } as AxiosResponse['config'];
  const respuesta = {
    status: estado,
    statusText: String(estado),
    headers: {},
    config,
    data: detalles ? { codigo, mensaje, detalles } : { codigo, mensaje },
  } as AxiosResponse;
  return new AxiosError(mensaje, 'ERR_BAD_REQUEST', config, null, respuesta);
}

/**
 * Sustituye `http.request` por manejadores por ruta. La clave es `MÉTODO /ruta` (sin query).
 * Un manejador puede devolver datos (→ 200) o lanzar/devolver un error de `errorApi`.
 * Las rutas sin manejador responden «Network Error».
 */
export function simularApi(manejadores: Record<string, Manejador>) {
  const llamadas: { clave: string; config: AxiosRequestConfig }[] = [];
  const espia = vi.spyOn(http, 'request').mockImplementation((config: AxiosRequestConfig) => {
    const metodo = (config.method ?? 'get').toUpperCase();
    const ruta = (config.url ?? '').replace(/\?.*$/, '');
    const clave = `${metodo} ${ruta}`;
    llamadas.push({ clave, config });
    const manejador = manejadores[clave];
    if (!manejador) {
      return Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config as never));
    }
    try {
      const resultado = manejador(config);
      if (resultado instanceof Error) return Promise.reject(resultado);
      return Promise.resolve({
        data: resultado,
        status: resultado === undefined ? 204 : 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
  return {
    espia,
    llamadas,
    /** Cuerpo JSON enviado en la última llamada a `clave`. */
    cuerpo: (clave: string): unknown => {
      const ultima = [...llamadas].reverse().find((l) => l.clave === clave);
      const data: unknown = ultima?.config.data;
      return typeof data === 'string' ? JSON.parse(data) : data;
    },
    veces: (clave: string) => llamadas.filter((l) => l.clave === clave).length,
  };
}
