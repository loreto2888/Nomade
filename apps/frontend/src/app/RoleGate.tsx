import type { ReactNode } from 'react';
import { tienePermiso, useSesion, type Rol } from './sesion';

interface RoleGateProps {
  /** Roles que ven el contenido. */
  roles?: Rol[];
  /** Código de permiso (ver `permisos` de la sesión). */
  permiso?: string;
  /** Qué mostrar a quien no cumple (por defecto, nada). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Oculta acciones o secciones según el rol o el permiso. Es solo una ayuda visual: el backend
 * siempre valida (`403`). Si se indican `roles` y `permiso`, deben cumplirse ambos.
 */
export function RoleGate({ roles, permiso, fallback = null, children }: RoleGateProps) {
  const sesion = useSesion();
  const rolPermitido = !roles || roles.includes(sesion.rol);
  const permisoPermitido = !permiso || tienePermiso(sesion, permiso);
  return rolPermitido && permisoPermitido ? children : fallback;
}
