import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';
import { tienePermiso, type Permiso } from './permisos.js';
import { Rol } from './rol.js';

export interface ActorAprobacion {
  id: number;
  rol: Rol;
}

/**
 * Política de autoaprobación (D-10): el `usuario` no puede aprobar lo que él
 * mismo creó (OC, lote de pago, EEPP); el `admin` sí. Si el creador es
 * desconocido (`null`, p. ej. datos importados) no hay conflicto.
 */
export function puedeAprobar(
  actor: ActorAprobacion,
  documento: { creadoPor: number | null },
  permiso: Permiso,
): boolean {
  if (!tienePermiso(actor.rol, permiso)) return false;
  if (actor.rol === Rol.Admin) return true;
  return documento.creadoPor === null || documento.creadoPor !== actor.id;
}

/** Lanza `403 PROHIBIDO` si el rol del actor no tiene el permiso. */
export function exigirPermiso(actor: { rol: Rol }, permiso: Permiso): void {
  if (!tienePermiso(actor.rol, permiso)) {
    throw new ErrorAplicacion(
      HttpStatus.FORBIDDEN,
      'PROHIBIDO',
      'No tienes permiso para realizar esta acción.',
    );
  }
}

/** Igual que `puedeAprobar`, pero lanza `403` con el motivo exacto. */
export function exigirPuedeAprobar(
  actor: ActorAprobacion,
  documento: { creadoPor: number | null },
  permiso: Permiso,
): void {
  exigirPermiso(actor, permiso);
  if (!puedeAprobar(actor, documento, permiso)) {
    throw new ErrorAplicacion(
      HttpStatus.FORBIDDEN,
      'AUTOAPROBACION_NO_PERMITIDA',
      'No puedes aprobar un documento que tú mismo creaste.',
    );
  }
}
