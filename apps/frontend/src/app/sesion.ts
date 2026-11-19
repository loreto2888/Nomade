import { createContext, useContext } from 'react';
import type { SesionApi } from '@/api/auth';
import type { Rol, TemaInterfaz } from '@/api/generated';

export type { Rol };

/** Usuario autenticado con su rol y permisos efectivos. */
export interface Sesion {
  id: number;
  correo: string;
  nombre: string;
  rol: Rol;
  tema: TemaInterfaz;
  debeCambiarClave: boolean;
  permisos: string[];
}

export function aSesion(api: SesionApi): Sesion {
  return { ...api.usuario, permisos: api.permisos };
}

/** La provee `RutaProtegida` solo mientras hay sesión: los hijos nunca se renderizan sin ella. */
export const ContextoSesion = createContext<Sesion | null>(null);

/** Sesión actual. Solo se usa dentro de rutas protegidas. */
export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion se usó fuera de una ruta protegida');
  return sesion;
}

export const esAdmin = (sesion: Pick<Sesion, 'rol'>): boolean => sesion.rol === 'admin';

export const tienePermiso = (sesion: Pick<Sesion, 'permisos'>, permiso: string): boolean =>
  sesion.permisos.includes(permiso);

export const ETIQUETA_ROL: Record<Rol, string> = { admin: 'Administrador', usuario: 'Usuario' };
