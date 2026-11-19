import axios from 'axios';

/**
 * Cliente HTTP de la aplicación.
 *
 * `baseURL` vacío: las llamadas van al mismo origen (`/api/...`). En desarrollo, Vite hace proxy
 * hacia el backend y en despliegue lo hace nginx, así que no hay CORS. `withCredentials` envía la
 * cookie de sesión `httpOnly`.
 */
export const http = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

type ManejadorSesionPerdida = () => void;
let manejadorSesionPerdida: ManejadorSesionPerdida | undefined;

/** La app registra qué hacer cuando el servidor informa que la sesión ya no es válida. */
export function registrarManejadorSesionPerdida(manejador: ManejadorSesionPerdida | undefined) {
  manejadorSesionPerdida = manejador;
}

const CODIGOS_SESION_PERDIDA = new Set(['NO_AUTENTICADO', 'SESION_EXPIRADA']);

// Un 401 con estos códigos (sesión vencida o revocada) saca al usuario al login. Los 401 de
// credenciales incorrectas (`CREDENCIALES_INVALIDAS`) no, porque son parte del flujo de ingreso.
http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const datos: unknown = error.response.data;
    const codigo =
      typeof datos === 'object' && datos !== null && 'codigo' in datos
        ? (datos as { codigo: unknown }).codigo
        : undefined;
    if (typeof codigo === 'string' && CODIGOS_SESION_PERDIDA.has(codigo)) {
      manejadorSesionPerdida?.();
    }
  }
  return Promise.reject(error instanceof Error ? error : new Error(String(error)));
});
