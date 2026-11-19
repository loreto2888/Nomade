import type { AxiosInstance } from 'axios';
import { Configuration } from './generated';
import { http } from './http';

/** Ruta base relativa: funciona igual en `localhost:5177` (proxy de Vite) y en `http://dell-pc` (nginx). */
export const API_BASE_PATH = '';

/** `Configuration` única del cliente generado (`src/api/generated`), compartida por todas las `*Api`. */
export const configuracionApi = new Configuration({
  basePath: API_BASE_PATH,
  baseOptions: { withCredentials: true },
});

/** Forma de los constructores de las clases `*Api` que genera `typescript-axios`. */
type ConstructorApi<TApi> = new (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) => TApi;

/**
 * Crea una clase `*Api` generada con la configuración única y el cliente axios compartido
 * (interceptores, credenciales).
 *
 * @example crearApi(SaludApi).obtenerSalud()
 */
export function crearApi<TApi>(Api: ConstructorApi<TApi>): TApi {
  return new Api(configuracionApi, API_BASE_PATH, http);
}
