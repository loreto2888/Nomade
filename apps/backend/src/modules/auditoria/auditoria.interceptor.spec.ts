import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { crearContexto } from '../../../test/utils/contexto.js';
import type { RequestConActor } from '../../common/auth/actor.js';
import { Auditar } from './auditar.decorator.js';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import type { AuditoriaService } from './auditoria.service.js';

class Controlador {
  @Auditar({ accion: 'usuario.crear', entidad: 'usuario' })
  conRespuesta(): void {}

  @Auditar({
    accion: 'usuario.actualizar',
    entidad: 'usuario',
    incluirRespuesta: false,
  })
  sinRespuesta(): void {}

  sinAuditar(): void {}
}

function preparar(req: Partial<RequestConActor>) {
  const registrarSinFallar = vi.fn((_evento: unknown) => Promise.resolve());
  const auditoria = { registrarSinFallar };
  const interceptor = new AuditoriaInterceptor(
    new Reflector(),
    auditoria as unknown as AuditoriaService,
  );
  const ejecutar = (metodo: string, respuesta: unknown) =>
    lastValueFrom(
      interceptor.intercept(
        crearContexto(Controlador, metodo, req, { getHeader: () => 'corr-1' }),
        { handle: () => of(respuesta) },
      ),
    );
  return { auditoria, ejecutar };
}

const actor = {
  id: 1,
  correo: 'a@nomade.cl',
  nombre: 'Admin',
} as RequestConActor['usuario'];

describe('AuditoriaInterceptor', () => {
  it('registra actor, acción, entidad, id, IP y correlación; devuelve la respuesta intacta', async () => {
    const t = preparar({
      usuario: actor,
      params: {},
      headers: {},
      ip: '10.0.0.9',
    });
    const respuesta = {
      id: 12,
      correo: 'x@nomade.cl',
      claveTemporal: 'secreta',
    };
    await expect(t.ejecutar('conRespuesta', respuesta)).resolves.toBe(
      respuesta,
    );
    expect(t.auditoria.registrarSinFallar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 1,
        usuarioCorreo: 'a@nomade.cl',
        accion: 'usuario.crear',
        entidad: 'usuario',
        entidadId: 12,
        despues: respuesta,
        ip: '10.0.0.9',
        idCorrelacion: 'corr-1',
      }),
    );
  });

  it('prefiere antes/después/motivo/id aportados por el servicio', async () => {
    const req: Partial<RequestConActor> = {
      usuario: actor,
      params: { id: '5' },
      headers: {},
      contextoAuditoria: {
        antes: { n: 1 },
        despues: { n: 2 },
        entidadId: 99,
        motivo: 'por X',
      },
    };
    const t = preparar(req);
    await t.ejecutar('conRespuesta', { id: 5 });
    expect(t.auditoria.registrarSinFallar).toHaveBeenCalledWith(
      expect.objectContaining({
        antes: { n: 1 },
        despues: { n: 2 },
        entidadId: 99,
        motivo: 'por X',
      }),
    );
  });

  it('usa el id de la ruta si no hay otro y omite la respuesta con incluirRespuesta=false', async () => {
    const t = preparar({ usuario: actor, params: { id: '5' }, headers: {} });
    await t.ejecutar('sinRespuesta', { id: 5, dato: 'x' });
    const evento = t.auditoria.registrarSinFallar.mock.calls[0][0] as {
      entidadId: unknown;
      despues: unknown;
    };
    expect(evento.entidadId).toBe(5);
    expect(evento.despues).toBeUndefined();
  });

  it('no registra los endpoints sin @Auditar', async () => {
    const t = preparar({ usuario: actor, params: {}, headers: {} });
    await t.ejecutar('sinAuditar', {});
    expect(t.auditoria.registrarSinFallar).not.toHaveBeenCalled();
  });
});
