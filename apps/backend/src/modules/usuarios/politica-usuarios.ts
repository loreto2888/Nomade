import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Rol } from '../../common/permisos/rol.js';

export interface CambioUsuario {
  /** Administrador que ejecuta el cambio. */
  actorId: number;
  objetivo: { id: number; rol: Rol; activo: boolean };
  nuevoRol?: Rol;
  nuevoActivo?: boolean;
  /** Administradores activos antes del cambio (leídos con bloqueo de fila). */
  adminsActivos: number;
}

function reglaNegocio(codigo: string, mensaje: string): ErrorAplicacion {
  return new ErrorAplicacion(HttpStatus.UNPROCESSABLE_ENTITY, codigo, mensaje);
}

/**
 * Reglas D-11: un admin no puede quitarse el rol ni desactivarse, y siempre
 * debe quedar al menos un admin activo. Lanza `422` si el cambio las viola.
 */
export function validarCambioUsuario(cambio: CambioUsuario): void {
  const { actorId, objetivo, nuevoRol, nuevoActivo, adminsActivos } = cambio;
  const esUnoMismo = objetivo.id === actorId;
  const pierdeRolAdmin =
    objetivo.rol === Rol.Admin &&
    nuevoRol !== undefined &&
    nuevoRol !== Rol.Admin;
  const seDesactiva = objetivo.activo && nuevoActivo === false;

  if (esUnoMismo && pierdeRolAdmin) {
    throw reglaNegocio(
      'ADMIN_NO_PUEDE_QUITARSE_ROL',
      'Un administrador no puede quitarse a sí mismo el rol de administrador.',
    );
  }
  if (esUnoMismo && seDesactiva) {
    throw reglaNegocio(
      'ADMIN_NO_PUEDE_DESACTIVARSE',
      'Un administrador no puede desactivar su propia cuenta.',
    );
  }

  const dejaDeSerAdminActivo =
    objetivo.rol === Rol.Admin &&
    objetivo.activo &&
    (pierdeRolAdmin || seDesactiva);
  if (dejaDeSerAdminActivo && adminsActivos <= 1) {
    throw reglaNegocio(
      'ULTIMO_ADMIN',
      'Debe existir al menos un administrador activo.',
    );
  }
}
