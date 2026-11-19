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
