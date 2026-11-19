import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HashFalso,
  UsuariosRepositorioFake,
  comoRepositorio,
  crearUsuario,
} from '../../../test/utils/fakes.js';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { Rol } from '../../common/permisos/rol.js';
import type { SesionesService } from '../sesiones/sesiones.service.js';
import { UsuariosService } from './usuarios.service.js';

const actor: ActorAutenticado = {
  id: 1,
  correo: 'admin@nomade.cl',
  nombre: 'Admin',
  rol: Rol.Admin,
  debeCambiarClave: false,
  sesionId: 1,
  sesionExpiraEn: new Date(),
};

function preparar(...usuarios: ReturnType<typeof crearUsuario>[]) {
  const repo = new UsuariosRepositorioFake().semilla(
    crearUsuario(),
    ...usuarios,
  );
  const sesiones = { revocarDeUsuario: vi.fn(() => Promise.resolve()) };
  const servicio = new UsuariosService(
    comoRepositorio(repo),
    new HashFalso(),
    sesiones as unknown as SesionesService,
  );
  return { servicio, repo, sesiones };
}

const camila = () =>
  crearUsuario({
    id: 2,
    correo: 'camila@nomade.cl',
    nombre: 'Camila Rojas',
    rol: Rol.Usuario,
  });

describe('UsuariosService', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar(camila());
    auditoria = {};
  });

  describe('crear', () => {
    it('crea la cuenta con clave temporal generada que obliga a cambiarla', async () => {
      const r = await t.servicio.crear(
        {
          correo: 'nuevo@nomade.cl',
          nombre: 'Nuevo Usuario',
          rol: Rol.Usuario,
        },
        actor,
        auditoria,
      );
      expect(r.claveTemporal).toHaveLength(16);
      expect(r.usuario).toMatchObject({
        correo: 'nuevo@nomade.cl',
        rol: 'usuario',
        activo: true,
        debeCambiarClave: true,
        version: 1,
      });
      const guardado = t.repo.usuarios.get(r.usuario.id);
      expect(guardado?.claveHash).toBe(`hash:${r.claveTemporal}`);
      expect(guardado?.createdBy).toBe(1);
      expect(JSON.stringify(r.usuario)).not.toContain('hash');
      expect(auditoria.entidadId).toBe(r.usuario.id);
      expect(JSON.stringify(auditoria)).not.toContain(r.claveTemporal);
    });

    it('rechaza un correo duplicado sin distinguir mayúsculas (409)', async () => {
      await expect(
        t.servicio.crear(
          { correo: 'CAMILA@nomade.cl', nombre: 'Otra', rol: Rol.Usuario },
          actor,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CORREO_DUPLICADO' },
      });
    });

    it('puede crear administradores (D-11)', async () => {
      const r = await t.servicio.crear(
        { correo: 'b@nomade.cl', nombre: 'Otro Admin', rol: Rol.Admin },
        actor,
        auditoria,
      );
      expect(r.usuario.rol).toBe('admin');
    });
  });

  describe('actualizar', () => {
    it('modifica nombre y rol, incrementa la versión y registra antes/después', async () => {
      const r = await t.servicio.actualizar(
        2,
        { version: 1, nombre: 'Camila R.', rol: Rol.Admin },
        actor,
        auditoria,
      );
      expect(r).toMatchObject({
        nombre: 'Camila R.',
        rol: 'admin',
        version: 2,
      });
      expect(t.repo.usuarios.get(2)?.updatedBy).toBe(1);
      expect(auditoria.antes).toMatchObject({
        nombre: 'Camila Rojas',
        rol: 'usuario',
        version: 1,
      });
      expect(auditoria.despues).toMatchObject({
        nombre: 'Camila R.',
        rol: 'admin',
        version: 2,
      });
      expect(auditoria.entidadId).toBe(2);
    });

    it('409 CONFLICTO_VERSION con la versión vigente si el cliente está desactualizado', async () => {
      await t.servicio.actualizar(
        2,
        { version: 1, nombre: 'Primero' },
        actor,
        {},
      );
      await expect(
        t.servicio.actualizar(2, { version: 1, nombre: 'Segundo' }, actor, {}),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          codigo: 'CONFLICTO_VERSION',
          detalles: [{ versionActual: 2 }],
        },
      });
      expect(t.repo.usuarios.get(2)?.nombre).toBe('Primero');
    });

    it('404 si el usuario no existe', async () => {
      await expect(
        t.servicio.actualizar(99, { version: 1, nombre: 'X Y' }, actor, {}),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'USUARIO_NO_ENCONTRADO' },
      });
    });

    it('no permite usar el correo de otro usuario', async () => {
      await expect(
        t.servicio.actualizar(
          2,
          { version: 1, correo: 'ADMIN@nomade.cl' },
          actor,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CORREO_DUPLICADO' },
      });
    });

    it('un admin no puede quitarse el rol', async () => {
      await expect(
        t.servicio.actualizar(1, { version: 1, rol: Rol.Usuario }, actor, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'ADMIN_NO_PUEDE_QUITARSE_ROL' },
      });
      expect(t.repo.usuarios.get(1)?.rol).toBe('admin');
    });

    it('un admin puede degradar a otro mientras quede un admin activo', async () => {
      t = preparar(
        crearUsuario({ id: 3, correo: 'b@nomade.cl', nombre: 'Otro Admin' }),
      );
      await expect(
        t.servicio.actualizar(3, { version: 1, rol: Rol.Usuario }, actor, {}),
      ).resolves.toMatchObject({
        rol: 'usuario',
      });
    });

    it('bloquea primero a los admins y luego al objetivo (sin interbloqueos)', async () => {
      await t.servicio.actualizar(
        2,
        { version: 1, nombre: 'Nuevo Nombre' },
        actor,
        {},
      );
      expect(t.repo.llamadas).toEqual(['bloquear:admins', 'bloquear:2']);
    });
  });

  describe('desactivar / activar', () => {
    it('desactiva (nunca elimina), revoca sus sesiones y registra el motivo', async () => {
      const r = await t.servicio.desactivar(
        2,
        { version: 1, motivo: 'Dejó la empresa' },
        actor,
        auditoria,
      );
      expect(r.activo).toBe(false);
      expect(t.repo.usuarios.has(2)).toBe(true);
      expect(t.sesiones.revocarDeUsuario).toHaveBeenCalledWith(2);
      expect(auditoria.motivo).toBe('Dejó la empresa');
    });

    it('un admin no puede desactivarse a sí mismo', async () => {
      await expect(
        t.servicio.desactivar(1, { version: 1 }, actor, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'ADMIN_NO_PUEDE_DESACTIVARSE' },
      });
      expect(t.sesiones.revocarDeUsuario).not.toHaveBeenCalled();
    });

    it('no se puede desactivar al último admin activo', async () => {
      // El actor es otro admin ya inactivo (caso límite): el único activo es el 3.
      t = preparar(
        crearUsuario({ id: 3, correo: 'b@nomade.cl', nombre: 'Otro Admin' }),
      );
      t.repo.usuarios.set(1, crearUsuario({ activo: false }));
      await expect(
        t.servicio.desactivar(3, { version: 1 }, actor, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'ULTIMO_ADMIN' },
      });
    });

    it('desactivar respeta el control de versión', async () => {
      await expect(
        t.servicio.desactivar(2, { version: 7 }, actor, {}),
      ).rejects.toMatchObject({ status: 409 });
      expect(t.sesiones.revocarDeUsuario).not.toHaveBeenCalled();
    });

    it('reactiva la cuenta y limpia el bloqueo por intentos', async () => {
      t = preparar({
        ...camila(),
        activo: false,
        intentosFallidos: 3,
        bloqueadoHasta: new Date('2030-01-01'),
      });
      const r = await t.servicio.activar(2, { version: 1 }, actor, {});
      expect(r).toMatchObject({
        activo: true,
        bloqueadoHasta: null,
        version: 2,
      });
      expect(t.repo.usuarios.get(2)?.intentosFallidos).toBe(0);
    });
  });

  describe('restablecerClave', () => {
    it('genera una clave temporal, obliga a cambiarla, desbloquea y cierra sesiones', async () => {
      t = preparar({
        ...camila(),
        debeCambiarClave: false,
        intentosFallidos: 2,
        bloqueadoHasta: new Date('2030-01-01'),
      });
      const r = await t.servicio.restablecerClave(
        2,
        { version: 1, motivo: 'Olvidó su clave' },
        actor,
        auditoria,
      );
      expect(r.claveTemporal).toHaveLength(16);
      expect(r.usuario).toMatchObject({
        debeCambiarClave: true,
        bloqueadoHasta: null,
        version: 2,
      });
      const guardado = t.repo.usuarios.get(2);
      expect(guardado?.claveHash).toBe(`hash:${r.claveTemporal}`);
      expect(guardado?.intentosFallidos).toBe(0);
      expect(t.sesiones.revocarDeUsuario).toHaveBeenCalledWith(2);
      expect(JSON.stringify(auditoria)).not.toContain(r.claveTemporal);
    });

    it('409 si la versión está desactualizada', async () => {
      await expect(
        t.servicio.restablecerClave(2, { version: 5 }, actor, {}),
      ).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('listar y obtener', () => {
    it('lista con filtros y paginación', async () => {
      const pagina = await t.servicio.listar({
        pagina: 1,
        tamanio: 1,
        rol: Rol.Usuario,
      });
      expect(pagina).toMatchObject({ total: 1, pagina: 1, tamanio: 1 });
      expect(pagina.items[0]).toMatchObject({ correo: 'camila@nomade.cl' });
      expect(pagina.items[0]).not.toHaveProperty('claveHash');
    });

    it('obtener devuelve 404 si no existe', async () => {
      await expect(t.servicio.obtener(99)).rejects.toMatchObject({
        status: 404,
      });
      await expect(t.servicio.obtener(2)).resolves.toMatchObject({ id: 2 });
    });
  });
});
