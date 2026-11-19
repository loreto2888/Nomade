export type Rol = 'admin' | 'usuario';

export interface Sesion {
  nombre: string;
  rol: Rol;
}

const SESION_PROVISORIA: Sesion = { nombre: 'Administrador', rol: 'admin' };

/**
 * Sesión del usuario actual.
 *
 * TODO: stub mientras no existe autenticación (módulo `auth`, P01). Reemplazar por la sesión real
 * obtenida del backend (cookie `httpOnly`) con TanStack Query.
 */
export function useSesion(): Sesion {
  return SESION_PROVISORIA;
}

export const esAdmin = (sesion: Sesion): boolean => sesion.rol === 'admin';
