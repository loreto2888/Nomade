import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UsuariosRepositorioFake,
  comoRepositorio,
  crearUsuario,
} from '../../../test/utils/fakes.js';
import { crearContexto } from '../../../test/utils/contexto.js';
import { COOKIE_SESION } from '../../app.constantes.js';
import type { RequestConActor } from '../../common/auth/actor.js';
import {
  PermitirConCambioClave,
  Publico,
} from '../../common/permisos/decoradores.js';
import type { SesionesService } from '../sesiones/sesiones.service.js';
import { SessionGuard } from './session.guard.js';

class Controlador {
  protegido(): void {}

  @Publico()
  publico(): void {}

  @PermitirConCambioClave()
  permiteCambio(): void {}
}

const vigente = {
  id: 10,
  usuarioId: 1,
  expiraEn: new Date('2026-11-19T18:00:00.000Z'),
};

function preparar(estadoSesion: string = 'valida', usuarioParcial = {}) {
  const repo = new UsuariosRepositorioFake().semilla(
    crearUsuario(usuarioParcial),
  );
  const sesiones = {
    validar: vi.fn(() =>
      Promise.resolve(
        estadoSesion === 'valida'
          ? { estado: 'valida', sesion: vigente }
          : { estado: estadoSesion },
      ),
    ),
  };
  const guard = new SessionGuard(
    new Reflector(),
    sesiones as unknown as SesionesService,
    comoRepositorio(repo),
  );
  const pedir = (metodo: string, cookie?: string) => {
    const req = { headers: { cookie } } as unknown as RequestConActor;
    return {
      req,
      resultado: guard.canActivate(crearContexto(Controlador, metodo, req)),
    };
  };
  return { pedir, sesiones };
}

const conCookie = (valor: string) => `${COOKIE_SESION}=${valor}`;

describe('SessionGuard', () => {
  let t: ReturnType<typeof preparar>;
  beforeEach(() => {
    t = preparar();
  });

  it('los endpoints públicos no exigen sesión', async () => {
    await expect(t.pedir('publico').resultado).resolves.toBe(true);
    expect(t.sesiones.validar).not.toHaveBeenCalled();
  });

  it('sin cookie responde 401 NO_AUTENTICADO', async () => {
    await expect(t.pedir('protegido').resultado).rejects.toMatchObject({
      status: 401,
      response: { codigo: 'NO_AUTENTICADO' },
    });
  });

  it('con sesión válida adjunta el actor al request', async () => {
    const { req, resultado } = t.pedir('protegido', conCookie('abc'));
    await expect(resultado).resolves.toBe(true);
    expect(t.sesiones.validar).toHaveBeenCalledWith('abc');
    expect(req.usuario).toMatchObject({
      id: 1,
      rol: 'admin',
      sesionId: 10,
      debeCambiarClave: false,
    });
  });

  it.each(['expirada', 'inactiva', 'revocada'])(
    'sesión %s → 401 SESION_EXPIRADA',
    async (estado) => {
      const t2 = preparar(estado);
      await expect(
        t2.pedir('protegido', conCookie('abc')).resultado,
      ).rejects.toMatchObject({
        status: 401,
        response: { codigo: 'SESION_EXPIRADA' },
      });
    },
  );

  it('token desconocido → 401 NO_AUTENTICADO', async () => {
    const t2 = preparar('inexistente');
    await expect(
      t2.pedir('protegido', conCookie('abc')).resultado,
    ).rejects.toMatchObject({
      status: 401,
      response: { codigo: 'NO_AUTENTICADO' },
    });
  });

  it('una cuenta desactivada pierde el acceso aunque la sesión exista', async () => {
    const t2 = preparar('valida', { activo: false });
    await expect(
      t2.pedir('protegido', conCookie('abc')).resultado,
    ).rejects.toMatchObject({ status: 401 });
  });

  it('con contraseña temporal bloquea todo salvo los endpoints permitidos', async () => {
    const t2 = preparar('valida', { debeCambiarClave: true });
    await expect(
      t2.pedir('protegido', conCookie('abc')).resultado,
    ).rejects.toMatchObject({
      status: 403,
      response: { codigo: 'CAMBIO_CLAVE_REQUERIDO' },
    });
    await expect(
      t2.pedir('permiteCambio', conCookie('abc')).resultado,
    ).resolves.toBe(true);
  });
});
