import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COOKIE_SESION } from '../../app.constantes.js';
import type { RequestConActor } from '../../common/auth/actor.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import {
  CLAVE_PERMITE_CAMBIO_CLAVE,
  CLAVE_PUBLICO,
} from '../../common/permisos/decoradores.js';
import { leerCookie } from '../../common/seguridad/cookie-sesion.js';
import { SesionesService } from '../sesiones/sesiones.service.js';
import { UsuariosRepositorio } from '../usuarios/usuarios.repositorio.js';

/**
 * Guard global: exige una sesión válida (cookie opaca) salvo en endpoints
 * `@Publico()`. Adjunta `req.usuario` y, si la cuenta debe cambiar su
 * contraseña, bloquea todo salvo los endpoints `@PermitirConCambioClave()`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sesiones: SesionesService,
    private readonly usuarios: UsuariosRepositorio,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, destinos)) {
      return true;
    }

    const req = contexto.switchToHttp().getRequest<RequestConActor>();
    const token = leerCookie(req.headers.cookie, COOKIE_SESION);
    if (!token) {
      throw new ErrorAplicacion(
        HttpStatus.UNAUTHORIZED,
        'NO_AUTENTICADO',
        'Debes iniciar sesión.',
      );
    }

    const validacion = await this.sesiones.validar(token);
    if (validacion.estado === 'inexistente') {
      throw new ErrorAplicacion(
        HttpStatus.UNAUTHORIZED,
        'NO_AUTENTICADO',
        'Debes iniciar sesión.',
      );
    }
    if (validacion.estado !== 'valida') {
      throw new ErrorAplicacion(
        HttpStatus.UNAUTHORIZED,
        'SESION_EXPIRADA',
        'Tu sesión expiró. Inicia sesión nuevamente.',
      );
    }

    const usuario = await this.usuarios.buscarPorId(
      validacion.sesion.usuarioId,
    );
    if (!usuario?.activo) {
      throw new ErrorAplicacion(
        HttpStatus.UNAUTHORIZED,
        'NO_AUTENTICADO',
        'Debes iniciar sesión.',
      );
    }

    req.usuario = {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      debeCambiarClave: usuario.debeCambiarClave,
      sesionId: validacion.sesion.id,
      sesionExpiraEn: validacion.sesion.expiraEn,
    };

    if (
      usuario.debeCambiarClave &&
      !this.reflector.getAllAndOverride<boolean>(
        CLAVE_PERMITE_CAMBIO_CLAVE,
        destinos,
      )
    ) {
      throw new ErrorAplicacion(
        HttpStatus.FORBIDDEN,
        'CAMBIO_CLAVE_REQUERIDO',
        'Debes cambiar tu contraseña antes de continuar.',
      );
    }
    return true;
  }
}
