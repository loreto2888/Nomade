import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Rol } from '../permisos/rol.js';

/** Usuario autenticado que la sesión adjunta a cada request. */
export interface ActorAutenticado {
  id: number;
  correo: string;
  nombre: string;
  rol: Rol;
  debeCambiarClave: boolean;
  sesionId: number;
  /** Vencimiento absoluto de la sesión (8 h). */
  sesionExpiraEn: Date;
}

/** Datos que los servicios aportan a la bitácora del request en curso. */
export interface ContextoAuditoria {
  antes?: unknown;
  despues?: unknown;
  entidadId?: string | number;
  motivo?: string;
}

export interface RequestConActor extends Request {
  usuario?: ActorAutenticado;
  contextoAuditoria?: ContextoAuditoria;
}

/** Inyecta el usuario autenticado (`req.usuario`). */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): ActorAutenticado => {
    const req = contexto.switchToHttp().getRequest<RequestConActor>();
    if (!req.usuario) {
      throw new Error('UsuarioActual usado en un endpoint sin sesión');
    }
    return req.usuario;
  },
);

/** Inyecta el objeto mutable con el que el servicio informa antes/después a la auditoría. */
export const ContextoAuditoriaActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): ContextoAuditoria => {
    const req = contexto.switchToHttp().getRequest<RequestConActor>();
    req.contextoAuditoria ??= {};
    return req.contextoAuditoria;
  },
);
