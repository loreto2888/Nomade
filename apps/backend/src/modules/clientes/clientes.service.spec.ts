import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClientesRepositorioFake,
  actorAdmin,
  actorUsuario,
  crearCliente,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { ClientesRepositorio } from './clientes.repositorio.js';
import { ClientesService } from './clientes.service.js';

function preparar(...clientes: ReturnType<typeof crearCliente>[]) {
  const repo = new ClientesRepositorioFake().semilla(...clientes);
  const servicio = new ClientesService(repo as unknown as ClientesRepositorio);
  return { repo, servicio };
}

describe('ClientesService (reglas comunes de maestros)', () => {
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    auditoria = {};
  });

  describe('crear', () => {
    it('crea con versión 1, autor y campos opcionales en null, y informa la auditoría', async () => {
      const { servicio, repo } = preparar();
      const r = await servicio.crear(
        {
          rut: '76086428-5',
          razonSocial: 'Grupo Andino SpA',
          correo: 'a@b.cl',
        },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        id: 1,
        rut: '76086428-5',
        razonSocial: 'Grupo Andino SpA',
        correo: 'a@b.cl',
        giro: null,
        telefono: null,
        version: 1,
      });
      expect(repo.filas.get(1)?.createdBy).toBe(actorUsuario.id);
      expect(auditoria.entidadId).toBe(1);
      expect(auditoria.despues).toMatchObject({ rut: '76086428-5' });
    });

    it('rechaza un RUT que ya existe entre los clientes vigentes (409)', async () => {
      const { servicio } = preparar(crearCliente());
      await expect(
        servicio.crear(
          { rut: '76086428-5', razonSocial: 'Otro' },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'RUT_DUPLICADO' },
      });
    });

    it('un cliente eliminado libera su RUT', async () => {
      const { servicio } = preparar(crearCliente({ eliminadoEn: new Date() }));
      const r = await servicio.crear(
        { rut: '76086428-5', razonSocial: 'Nuevo' },
        actorAdmin,
        auditoria,
      );
      expect(r.id).toBe(2);
    });
  });

  describe('actualizar', () => {
    it('modifica solo los campos enviados, sube la versión y registra antes/después', async () => {
      const { servicio, repo } = preparar(
        crearCliente({ giro: 'Inmobiliario' }),
      );
      const r = await servicio.actualizar(
        1,
        {
          version: 1,
          razonSocial: 'Andino Holding SpA',
          telefono: '+56 2 2345 6789',
        },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        razonSocial: 'Andino Holding SpA',
        telefono: '+56 2 2345 6789',
        giro: 'Inmobiliario',
        version: 2,
      });
      expect(repo.filas.get(1)?.updatedBy).toBe(actorUsuario.id);
      expect(auditoria.antes).toMatchObject({
        razonSocial: 'Grupo Andino SpA',
        version: 1,
      });
      expect(auditoria.despues).toMatchObject({
        razonSocial: 'Andino Holding SpA',
        version: 2,
      });
      expect(repo.llamadas).toContain('bloquear:1');
    });

    it('null borra un campo opcional', async () => {
      const { servicio } = preparar(crearCliente({ giro: 'Inmobiliario' }));
      const r = await servicio.actualizar(
        1,
        { version: 1, giro: null },
        actorAdmin,
        auditoria,
      );
      expect(r.giro).toBeNull();
    });

    it('no permite vaciar el RUT ni la razón social (400)', async () => {
      const { servicio } = preparar(crearCliente());
      await expect(
        servicio.actualizar(
          1,
          { version: 1, razonSocial: null as unknown as string },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { codigo: 'VALIDACION' },
      });
    });

    it('409 CONFLICTO_VERSION con la versión vigente si el cliente está desactualizado', async () => {
      const { servicio } = preparar(crearCliente({ version: 4 }));
      await expect(
        servicio.actualizar(
          1,
          { version: 3, giro: 'X' },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          codigo: 'CONFLICTO_VERSION',
          detalles: [{ versionActual: 4 }],
        },
      });
    });

    it('rechaza cambiar el RUT a uno de otro cliente (409) pero permite repetir el propio', async () => {
      const { servicio } = preparar(
        crearCliente(),
        crearCliente({ id: 2, rut: '11111111-1', razonSocial: 'Otro' }),
      );
      await expect(
        servicio.actualizar(
          2,
          { version: 1, rut: '76086428-5' },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({ response: { codigo: 'RUT_DUPLICADO' } });
      const r = await servicio.actualizar(
        2,
        { version: 1, rut: '11111111-1' },
        actorAdmin,
        {},
      );
      expect(r.version).toBe(2);
    });

    it('404 si no existe o está eliminado', async () => {
      const { servicio } = preparar(crearCliente({ eliminadoEn: new Date() }));
      await expect(
        servicio.actualizar(1, { version: 1 }, actorAdmin, auditoria),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'CLIENTE_NO_ENCONTRADO' },
      });
    });
  });

  describe('eliminar (borrado lógico, D-13)', () => {
    it('marca eliminadoEn/eliminadoPor y conserva el registro', async () => {
      const { servicio, repo } = preparar(crearCliente());
      await servicio.eliminar(
        1,
        { version: 1, motivo: 'Duplicado' },
        actorUsuario,
        auditoria,
      );
      const fila = repo.filas.get(1);
      expect(fila?.eliminadoEn).toBeInstanceOf(Date);
      expect(fila?.eliminadoPor).toBe(actorUsuario.id);
      expect(fila?.version).toBe(2);
      expect(auditoria).toMatchObject({ entidadId: 1, motivo: 'Duplicado' });
      expect(auditoria.antes).toMatchObject({ rut: '76086428-5' });
      await expect(servicio.obtener(1)).rejects.toMatchObject({ status: 404 });
    });

    it('422 si el cliente tiene obras vigentes', async () => {
      const { servicio, repo } = preparar(crearCliente());
      repo.obrasPorCliente.set(1, 2);
      await expect(
        servicio.eliminar(1, { version: 1 }, actorAdmin, auditoria),
      ).rejects.toMatchObject({
        status: 422,
        response: {
          codigo: 'CLIENTE_CON_OBRAS',
          mensaje: expect.stringContaining('2 obras vigentes'),
        },
      });
      expect(repo.filas.get(1)?.eliminadoEn).toBeNull();
    });

    it('409 si la versión está desactualizada', async () => {
      const { servicio } = preparar(crearCliente({ version: 2 }));
      await expect(
        servicio.eliminar(1, { version: 1 }, actorAdmin, auditoria),
      ).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  it('listar pagina y filtra por texto', async () => {
    const { servicio } = preparar(
      crearCliente(),
      crearCliente({
        id: 2,
        rut: '11111111-1',
        razonSocial: 'Inmobiliaria Central',
      }),
      crearCliente({
        id: 3,
        rut: '10000013-K',
        razonSocial: 'Comercial Austral',
        eliminadoEn: new Date(),
      }),
    );
    const todos = await servicio.listar({ pagina: 1, tamanio: 10 });
    expect(todos.total).toBe(2);
    const filtrados = await servicio.listar({
      pagina: 1,
      tamanio: 10,
      q: 'central',
    });
    expect(filtrados.items.map((c) => c.id)).toEqual([2]);
    expect(filtrados).toMatchObject({ pagina: 1, tamanio: 10 });
  });
});
