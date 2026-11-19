import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, mergeMap } from 'rxjs';
import type { RequestConActor } from '../../common/auth/actor.js';
import { ipCliente } from '../../common/seguridad/cookie-sesion.js';
import { CLAVE_AUDITAR, type OpcionesAuditar } from './auditar.decorator.js';
import { AuditoriaService } from './auditoria.service.js';

/**
 * Registra en la bitácora los endpoints marcados con `@Auditar`: actor,
 * acción, entidad, id, antes/después (sin campos sensibles), motivo e IP.
 * Solo registra ejecuciones exitosas; los servicios aportan antes/después y
 * el id mediante `ContextoAuditoria`.
 */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  intercept(
    contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    const opciones = this.reflector.getAllAndOverride<
      OpcionesAuditar | undefined
    >(CLAVE_AUDITAR, [contexto.getHandler(), contexto.getClass()]);
    if (!opciones) return siguiente.handle();

    const http = contexto.switchToHttp();
    const req = http.getRequest<RequestConActor>();
    const res = http.getResponse<Response>();

    return siguiente.handle().pipe(
      mergeMap(async (respuesta: unknown) => {
        const extra = req.contextoAuditoria ?? {};
        const idRuta = req.params?.id;
        const idRespuesta =
          typeof respuesta === 'object' && respuesta !== null
            ? (respuesta as { id?: unknown }).id
            : undefined;
        const idCorrelacion = res.getHeader('x-request-id');

        await this.auditoria.registrarSinFallar({
          usuarioId: req.usuario?.id ?? null,
          usuarioCorreo: req.usuario?.correo ?? null,
          usuarioNombre: req.usuario?.nombre ?? null,
          accion: opciones.accion,
          entidad: opciones.entidad,
          entidadId:
            extra.entidadId ??
            (typeof idRespuesta === 'number' || typeof idRespuesta === 'string'
              ? idRespuesta
              : undefined) ??
            (typeof idRuta === 'string' ? idRuta : undefined),
          antes: extra.antes,
          despues:
            extra.despues ??
            (opciones.incluirRespuesta === false ? undefined : respuesta),
          motivo: extra.motivo,
          ip: ipCliente(req),
          idCorrelacion:
            typeof idCorrelacion === 'string' ? idCorrelacion : null,
        });
        return respuesta;
      }),
    );
  }
}
