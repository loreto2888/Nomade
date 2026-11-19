import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestConActor } from '../auth/actor.js';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';
import { CLAVE_PERMISO, CLAVE_PUBLICO, CLAVE_ROLES } from './decoradores.js';
import { tienePermiso, type Permiso } from './permisos.js';
import type { Rol } from './rol.js';

const PROHIBIDO = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.FORBIDDEN,
    'PROHIBIDO',
    'No tienes permiso para realizar esta acción.',
  );

/**
 * Guard global (después de `SessionGuard`): aplica `@Roles` y el código de
 * `@RequierePermiso` contra el mapa de permisos central.
 */
@Injectable()
export class AutorizacionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, destinos)) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(
      CLAVE_ROLES,
      destinos,
    );
    const permiso = this.reflector.getAllAndOverride<Permiso | undefined>(
      CLAVE_PERMISO,
      destinos,
    );
    if (!roles && !permiso) return true;

    const usuario = contexto
      .switchToHttp()
      .getRequest<RequestConActor>().usuario;
    if (!usuario) throw PROHIBIDO();
    if (roles && !roles.includes(usuario.rol)) throw PROHIBIDO();
    if (permiso && !tienePermiso(usuario.rol, permiso)) throw PROHIBIDO();
    return true;
  }
}
