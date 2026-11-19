import { beforeEach, describe, expect, it } from 'vitest';
import {
  CuentasRepositorioFake,
  ProveedoresRepositorioFake,
  actorAdmin,
  crearCuenta,
  crearProveedor,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import { CuentasBancariasService } from './cuentas-bancarias.service.js';
import type {
  CuentasBancariasRepositorio,
  ProveedoresRepositorio,
} from './proveedores.repositorio.js';
import { TipoCuentaBancaria } from './proveedores.tipos.js';

const datosCuenta = {
  banco: 'Banco Estado',
  tipoCuenta: TipoCuentaBancaria.Vista,
  numeroCuenta: '98765432',
  titular: 'Materiales Cordillera SpA',
  titularRut: '11111111-1',
};

function preparar() {
  const proveedores = new ProveedoresRepositorioFake().semilla(
    crearProveedor(),
    crearProveedor({ id: 2, rut: '76086428-5', razonSocial: 'Otro proveedor' }),
  );
  const cuentas = new CuentasRepositorioFake();
  const servicio = new CuentasBancariasService(
    proveedores as unknown as ProveedoresRepositorio,
    cuentas as unknown as CuentasBancariasRepositorio,
  );
  return { servicio, proveedores, cuentas };
}

describe('CuentasBancariasService (datos sensibles, D-17)', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  describe('consulta auditada', () => {
    it('informa a la auditoría qué proveedor se consultó y cuántas cuentas se vieron', async () => {
      t.cuentas.semilla(
        crearCuenta(),
        crearCuenta({ id: 2, numeroCuenta: '555555', principal: false }),
      );
      const r = await t.servicio.listar(1, auditoria);
      expect(r.map((c) => c.id)).toEqual([1, 2]);
      expect(auditoria.entidadId).toBe(1);
      expect(auditoria.despues).toEqual({ cuentasConsultadas: 2 });
    });

    it('la bitácora de consulta no incluye los números de cuenta', async () => {
      t.cuentas.semilla(crearCuenta());
      await t.servicio.listar(1, auditoria);
      expect(JSON.stringify(auditoria)).not.toContain('0012345678');
    });

    it('404 si el proveedor no existe o fue eliminado', async () => {
      await expect(t.servicio.listar(99, auditoria)).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'PROVEEDOR_NO_ENCONTRADO' },
      });
      t.proveedores.filas.get(1)!.eliminadoEn = new Date();
      await expect(t.servicio.listar(1, auditoria)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('solo lista las cuentas de ese proveedor y no las eliminadas', async () => {
      t.cuentas.semilla(
        crearCuenta(),
        crearCuenta({ id: 2, proveedorId: 2, numeroCuenta: '777777' }),
        crearCuenta({
          id: 3,
          numeroCuenta: '888888',
          eliminadoEn: new Date(),
          principal: false,
        }),
      );
      expect((await t.servicio.listar(1, auditoria)).map((c) => c.id)).toEqual([
        1,
      ]);
    });
  });

  describe('crear', () => {
    it('la primera cuenta queda como principal aunque no se indique', async () => {
      const r = await t.servicio.crear(1, datosCuenta, actorAdmin, auditoria);
      expect(r).toMatchObject({
        principal: true,
        version: 1,
        proveedorId: 1,
        banco: 'Banco Estado',
      });
      expect(auditoria.entidadId).toBe(r.id);
      expect(auditoria.despues).toMatchObject({ numeroCuenta: '98765432' });
    });

    it('una cuenta adicional no es principal salvo que se pida; al pedirlo quita la marca a la anterior', async () => {
      const a = await t.servicio.crear(1, datosCuenta, actorAdmin, {});
      const b = await t.servicio.crear(
        1,
        { ...datosCuenta, numeroCuenta: '11112222' },
        actorAdmin,
        {},
      );
      expect(b.principal).toBe(false);
      const c = await t.servicio.crear(
        1,
        { ...datosCuenta, numeroCuenta: '33334444', principal: true },
        actorAdmin,
        {},
      );
      expect(c.principal).toBe(true);
      expect(t.cuentas.filas.get(a.id)?.principal).toBe(false);
      expect(t.cuentas.vigentes().filter((x) => x.principal)).toHaveLength(1);
    });

    it('rechaza la misma cuenta (banco + número, sin distinguir mayúsculas) del mismo proveedor (409)', async () => {
      await t.servicio.crear(1, datosCuenta, actorAdmin, {});
      await expect(
        t.servicio.crear(
          1,
          { ...datosCuenta, banco: 'BANCO ESTADO' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CUENTA_BANCARIA_DUPLICADA' },
      });
      // otro proveedor sí puede tener el mismo banco y número
      await expect(
        t.servicio.crear(2, datosCuenta, actorAdmin, {}),
      ).resolves.toBeDefined();
    });

    it('bloquea el proveedor antes de crear (serializa los cambios de principal)', async () => {
      await t.servicio.crear(1, datosCuenta, actorAdmin, {});
      expect(t.proveedores.llamadas).toEqual(['bloquear:1']);
    });

    it('404 si el proveedor no existe', async () => {
      await expect(
        t.servicio.crear(99, datosCuenta, actorAdmin, auditoria),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('actualizar', () => {
    beforeEach(() => {
      t.cuentas.semilla(
        crearCuenta(),
        crearCuenta({ id: 2, numeroCuenta: '555555', principal: false }),
      );
    });

    it('modifica datos, sube la versión y registra antes/después con el número de cuenta', async () => {
      const r = await t.servicio.actualizar(
        1,
        1,
        { version: 1, titular: 'Nuevo Titular', numeroCuenta: '123456' },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        titular: 'Nuevo Titular',
        numeroCuenta: '123456',
        version: 2,
      });
      expect(auditoria.antes).toMatchObject({
        numeroCuenta: '0012345678',
        version: 1,
      });
      expect(auditoria.despues).toMatchObject({
        numeroCuenta: '123456',
        version: 2,
      });
    });

    it('marcar otra como principal desmarca la anterior', async () => {
      await t.servicio.actualizar(
        1,
        2,
        { version: 1, principal: true },
        actorAdmin,
        {},
      );
      expect(t.cuentas.filas.get(1)?.principal).toBe(false);
      expect(t.cuentas.filas.get(2)?.principal).toBe(true);
    });

    it('no permite quitar la marca de principal directamente (422)', async () => {
      await expect(
        t.servicio.actualizar(
          1,
          1,
          { version: 1, principal: false },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'CUENTA_PRINCIPAL_REQUERIDA' },
      });
    });

    it('409 por versión desactualizada y por duplicar otra cuenta del proveedor', async () => {
      await expect(
        t.servicio.actualizar(
          1,
          1,
          { version: 9, titular: 'X Y' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CONFLICTO_VERSION' },
      });
      await expect(
        t.servicio.actualizar(
          1,
          2,
          { version: 1, numeroCuenta: '0012345678' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CUENTA_BANCARIA_DUPLICADA' },
      });
    });

    it('404 si la cuenta pertenece a otro proveedor', async () => {
      await expect(
        t.servicio.actualizar(
          2,
          1,
          { version: 1, titular: 'X Y' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'CUENTA_BANCARIA_NO_ENCONTRADA' },
      });
    });
  });

  describe('eliminar (borrado lógico)', () => {
    it('conserva el registro; si era la principal, la siguiente cuenta pasa a serlo', async () => {
      t.cuentas.semilla(
        crearCuenta(),
        crearCuenta({ id: 2, numeroCuenta: '555555', principal: false }),
      );
      await t.servicio.eliminar(
        1,
        1,
        { version: 1, motivo: 'Cuenta cerrada' },
        actorAdmin,
        auditoria,
      );
      expect(t.cuentas.filas.get(1)?.eliminadoEn).toBeInstanceOf(Date);
      expect(t.cuentas.filas.get(1)?.eliminadoPor).toBe(actorAdmin.id);
      expect(t.cuentas.filas.get(2)?.principal).toBe(true);
      expect(auditoria).toMatchObject({
        entidadId: 1,
        motivo: 'Cuenta cerrada',
      });
      expect(auditoria.antes).toMatchObject({ numeroCuenta: '0012345678' });
    });

    it('409 si la versión está desactualizada y 404 si no existe', async () => {
      t.cuentas.semilla(crearCuenta({ version: 3 }));
      await expect(
        t.servicio.eliminar(1, 1, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        t.servicio.eliminar(1, 99, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
