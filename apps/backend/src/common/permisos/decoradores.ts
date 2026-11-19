import { SetMetadata } from '@nestjs/common';
import type { Permiso } from './permisos.js';
import type { Rol } from './rol.js';

export const CLAVE_ROLES = 'nomade:roles';
export const CLAVE_PERMISO = 'nomade:permiso';
export const CLAVE_PUBLICO = 'nomade:publico';
export const CLAVE_PERMITE_CAMBIO_CLAVE = 'nomade:permite-cambio-clave';

/** Restringe el endpoint (o el controlador) a los roles indicados. */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** Declara el código de permiso de la acción (ver `permisos.ts`). */
export const RequierePermiso = (permiso: Permiso) =>
  SetMetadata(CLAVE_PERMISO, permiso);

/** Endpoint sin sesión (login, salud). */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/**
 * Endpoint accesible aunque la cuenta deba cambiar su contraseña
 * (sesión actual, cambio de contraseña, salir).
 */
export const PermitirConCambioClave = () =>
  SetMetadata(CLAVE_PERMITE_CAMBIO_CLAVE, true);
