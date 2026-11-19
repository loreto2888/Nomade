import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HashFalso,
  UsuariosRepositorioFake,
  comoRepositorio,
  crearUsuario,
} from '../../../test/utils/fakes.js';
import type { ActorAutenticado } from '../../common/auth/actor.js';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { SesionesService } from '../sesiones/sesiones.service.js';
import { AuthService } from './auth.service.js';
import { MAX_INTENTOS_FALLIDOS } from './politica-login.js';

const ahora = new Date('2026-11-19T10:00:00.000Z');
const contexto = {
  ip: '10.0.0.1',
  agenteUsuario: 'UA',
  idCorrelacion: 'req-1',
};
const CLAVE = 'clave-correcta-123';

function preparar(
  usuarios: ReturnType<typeof crearUsuario>[] = [crearUsuario()],
) {
  const repo = new UsuariosRepositorioFake().semilla(...usuarios);
  const sesiones = {
    crear: vi.fn((usuarioId: number, _c: unknown, a: Date) =>
      Promise.resolve({
        token: 'token-opaco',
        sesion: {
          id: 77,
          usuarioId,
          expiraEn: new Date(a.getTime() + 8 * 3_600_000),
        },
      }),
    ),
    revocar: vi.fn(() => Promise.resolve()),
    revocarDeUsuario: vi.fn(() => Promise.resolve()),
  };
  const auditoria = { registrarSinFallar: vi.fn(() => Promise.resolve()) };
  const servicio = new AuthService(
    comoRepositorio(repo),
    new HashFalso(),
    sesiones as unknown as SesionesService,
    auditoria as unknown as AuditoriaService,
  );
  return { servicio, repo, sesiones, auditoria };
}

const acciones = (a: { registrarSinFallar: ReturnType<typeof vi.fn> }) =>
  a.registrarSinFallar.mock.calls.map(
    ([e]) => (e as { accion: string }).accion,
  );

describe('AuthService.iniciarSesion', () => {
  let t: ReturnType<typeof preparar>;
  beforeEach(() => {
    t = preparar();
  });

  it('inicia sesión con correo y contraseña correctos', async () => {
    const r = await t.servicio.iniciarSesion(
      { correo: 'admin@nomade.cl', clave: CLAVE },
      contexto,
      ahora,
    );
    expect(r.token).toBe('token-opaco');
    expect(r.sesion.usuario).toMatchObject({
      id: 1,
      rol: 'admin',
      debeCambiarClave: false,
    });
    expect(r.sesion.permisos).toContain('usuarios.crear');
    expect(JSON.stringify(r)).not.toContain('hash:');
    expect(t.repo.usuarios.get(1)).toMatchObject({
      ultimoAccesoEn: ahora,
      intentosFallidos: 0,
    });
    expect(acciones(t.auditoria)).toEqual(['auth.login']);
  });

  it('el correo no distingue mayúsculas (citext en la BD)', async () => {
    const r = await t.servicio.iniciarSesion(
      { correo: 'ADMIN@Nomade.cl', clave: CLAVE },
      contexto,
      ahora,
    );
    expect(r.sesion.usuario.id).toBe(1);
  });

  it('rechaza una contraseña incorrecta con mensaje genérico y cuenta el intento', async () => {
    await expect(
      t.servicio.iniciarSesion(
        { correo: 'admin@nomade.cl', clave: 'mala' },
        contexto,
        ahora,
      ),
    ).rejects.toMatchObject({
      status: 401,
      response: { codigo: 'CREDENCIALES_INVALIDAS' },
    });
    expect(t.repo.usuarios.get(1)?.intentosFallidos).toBe(1);
    expect(acciones(t.auditoria)).toEqual(['auth.login_fallido']);
    expect(t.sesiones.crear).not.toHaveBeenCalled();
  });

  it('un correo inexistente responde igual que una clave incorrecta', async () => {
    await expect(
      t.servicio.iniciarSesion(
        { correo: 'nadie@nomade.cl', clave: 'x' },
        contexto,
        ahora,
      ),
    ).rejects.toMatchObject({
      status: 401,
      response: {
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Correo o contraseña incorrectos.',
      },
    });
    expect(acciones(t.auditoria)).toEqual(['auth.login_fallido']);
  });

  it('bloquea la cuenta tras 5 intentos fallidos y luego responde 423', async () => {
    for (let i = 0; i < MAX_INTENTOS_FALLIDOS; i++) {
      await expect(
        t.servicio.iniciarSesion(
          { correo: 'admin@nomade.cl', clave: 'mala' },
          contexto,
          ahora,
        ),
      ).rejects.toMatchObject({ status: 401 });
    }
    expect(acciones(t.auditoria)).toContain('auth.cuenta_bloqueada');
    expect(t.repo.usuarios.get(1)?.bloqueadoHasta).toEqual(
      new Date(ahora.getTime() + 15 * 60_000),
    );

    // Aun con la clave correcta, mientras dura el bloqueo no entra.
    await expect(
      t.servicio.iniciarSesion(
        { correo: 'admin@nomade.cl', clave: CLAVE },
        contexto,
        ahora,
      ),
    ).rejects.toMatchObject({
      status: 423,
      response: { codigo: 'CUENTA_BLOQUEADA' },
    });
    expect(t.sesiones.crear).not.toHaveBeenCalled();
  });

  it('el bloqueo termina a los 15 minutos y el acceso exitoso limpia el contador', async () => {
    t = preparar([
      crearUsuario({
        intentosFallidos: 0,
        bloqueadoHasta: new Date(ahora.getTime() + 60_000),
      }),
    ]);
    const despuesDelBloqueo = new Date(ahora.getTime() + 61_000);
    const r = await t.servicio.iniciarSesion(
      { correo: 'admin@nomade.cl', clave: CLAVE },
      contexto,
      despuesDelBloqueo,
    );
    expect(r.token).toBe('token-opaco');
    expect(t.repo.usuarios.get(1)).toMatchObject({
      bloqueadoHasta: null,
      intentosFallidos: 0,
    });
  });

  it('un acceso exitoso reinicia los intentos fallidos acumulados', async () => {
    t = preparar([crearUsuario({ intentosFallidos: 3 })]);
    await t.servicio.iniciarSesion(
      { correo: 'admin@nomade.cl', clave: CLAVE },
      contexto,
      ahora,
    );
    expect(t.repo.usuarios.get(1)?.intentosFallidos).toBe(0);
  });

  it('una cuenta desactivada no inicia sesión (403) aunque la clave sea correcta', async () => {
    t = preparar([crearUsuario({ activo: false })]);
    await expect(
      t.servicio.iniciarSesion(
        { correo: 'admin@nomade.cl', clave: CLAVE },
        contexto,
        ahora,
      ),
    ).rejects.toMatchObject({
      status: 403,
      response: { codigo: 'CUENTA_DESACTIVADA' },
    });
    expect(t.sesiones.crear).not.toHaveBeenCalled();
  });

  it('informa debeCambiarClave cuando la contraseña es temporal', async () => {
    t = preparar([crearUsuario({ debeCambiarClave: true })]);
    const r = await t.servicio.iniciarSesion(
      { correo: 'admin@nomade.cl', clave: CLAVE },
      contexto,
      ahora,
    );
    expect(r.sesion.usuario.debeCambiarClave).toBe(true);
  });
});

describe('AuthService.cambiarClave', () => {
  const actor: ActorAutenticado = {
    id: 1,
    correo: 'admin@nomade.cl',
    nombre: 'Admin',
    rol: 'admin' as ActorAutenticado['rol'],
    debeCambiarClave: true,
    sesionId: 77,
    sesionExpiraEn: new Date('2026-11-19T18:00:00.000Z'),
  };
  let t: ReturnType<typeof preparar>;
  beforeEach(() => {
    t = preparar([crearUsuario({ debeCambiarClave: true })]);
  });

  it('cambia la clave, desbloquea el acceso y cierra las demás sesiones', async () => {
    const auditoria = {};
    const r = await t.servicio.cambiarClave(
      actor,
      { claveActual: CLAVE, claveNueva: 'una-clave-nueva-123' },
      auditoria,
      ahora,
    );
    expect(r.usuario.debeCambiarClave).toBe(false);
    const guardado = t.repo.usuarios.get(1);
    expect(guardado?.claveHash).toBe('hash:una-clave-nueva-123');
    expect(guardado?.debeCambiarClave).toBe(false);
    expect(guardado?.claveCambiadaEn).toEqual(ahora);
    expect(guardado?.version).toBe(2);
    expect(t.sesiones.revocarDeUsuario).toHaveBeenCalledWith(1, {
      excepto: 77,
      ahora,
    });
  });

  it('exige la contraseña actual correcta', async () => {
    await expect(
      t.servicio.cambiarClave(
        actor,
        { claveActual: 'otra', claveNueva: 'una-clave-nueva-123' },
        {},
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { codigo: 'CLAVE_ACTUAL_INCORRECTA' },
    });
    expect(t.repo.usuarios.get(1)?.claveHash).toBe('hash:clave-correcta-123');
  });

  it('exige mínimo 12 caracteres', async () => {
    await expect(
      t.servicio.cambiarClave(
        actor,
        { claveActual: CLAVE, claveNueva: 'corta-11-ch' },
        {},
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { codigo: 'CLAVE_INVALIDA' },
    });
  });

  it('la nueva contraseña debe ser distinta de la actual', async () => {
    await expect(
      t.servicio.cambiarClave(
        actor,
        { claveActual: CLAVE, claveNueva: CLAVE },
        {},
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { codigo: 'CLAVE_IGUAL_A_LA_ACTUAL' },
    });
  });
});

describe('AuthService.actualizarTema y cerrarSesion', () => {
  it('guarda el tema del usuario sin tocar la versión', async () => {
    const t = preparar();
    const actor = {
      id: 1,
      correo: 'admin@nomade.cl',
      nombre: 'Admin',
      rol: 'admin',
      debeCambiarClave: false,
      sesionId: 5,
      sesionExpiraEn: ahora,
    } as ActorAutenticado;
    const r = await t.servicio.actualizarTema(actor, 'oscuro' as never);
    expect(r.usuario.tema).toBe('oscuro');
    expect(t.repo.usuarios.get(1)?.version).toBe(1);
  });

  it('cerrar sesión revoca la sesión actual', async () => {
    const t = preparar();
    await t.servicio.cerrarSesion({ sesionId: 9 } as ActorAutenticado);
    expect(t.sesiones.revocar).toHaveBeenCalledWith(9);
  });
});
