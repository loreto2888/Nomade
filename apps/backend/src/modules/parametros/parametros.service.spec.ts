import { beforeEach, describe, expect, it } from 'vitest';
import {
  ParametrosRepositorioFake,
  RelojFijo,
  actorAdmin,
  crearParametro,
  crearValorParametro,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import { ParametrosService } from './parametros.service.js';
import type { ParametrosRepositorio } from './parametros.repositorio.js';

function preparar() {
  const repo = new ParametrosRepositorioFake()
    .semilla(
      crearParametro(),
      crearValorParametro({
        id: 1,
        valorNumerico: 19,
        vigenteDesde: '2003-01-01',
      }),
    )
    .semilla(
      crearParametro({
        id: 2,
        codigo: 'plazo_pago_proveedores_dias',
        nombre: 'Plazo de pago',
        tipoValor: 'entero' as never,
        unidad: 'días',
      }),
      crearValorParametro({
        id: 2,
        parametroId: 2,
        valorNumerico: 30,
        vigenteDesde: '2003-01-01',
      }),
    );
  return {
    repo,
    servicio: new ParametrosService(
      repo as unknown as ParametrosRepositorio,
      new RelojFijo(),
    ),
  };
}

describe('ParametrosService (versionado con vigencia, P27)', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  it('lista los parámetros con su valor vigente hoy', async () => {
    const lista = await t.servicio.listar();
    const iva = lista.find((p) => p.codigo === 'iva');
    expect(iva?.valorVigente).toMatchObject({
      valor: '19',
      valorNumerico: 19,
      vigenteHasta: null,
    });
    expect(iva?.proximoValor).toBeNull();
  });

  describe('agregarValor', () => {
    it('programa un valor futuro: el vigente se mantiene y cierra su vigencia el día anterior', async () => {
      const r = await t.servicio.agregarValor(
        1,
        {
          version: 1,
          valor: '20',
          vigenteDesde: '2026-12-01',
          motivo: 'Reforma tributaria',
        },
        actorAdmin,
        auditoria,
      );
      expect(r.version).toBe(2);
      expect(r.valorVigente).toMatchObject({
        valor: '19',
        vigenteHasta: '2026-11-30',
      });
      expect(r.proximoValor).toMatchObject({
        valor: '20',
        vigenteDesde: '2026-12-01',
        vigenteHasta: null,
      });
      expect(auditoria).toMatchObject({
        entidadId: 1,
        motivo: 'Reforma tributaria',
      });
      expect(auditoria.antes).toMatchObject({ version: 1 });
      expect(auditoria.despues).toMatchObject({ version: 2 });
    });

    it('un valor que empieza hoy pasa a ser el vigente', async () => {
      const r = await t.servicio.agregarValor(
        1,
        { version: 1, valor: '19.5', vigenteDesde: '2026-11-19' },
        actorAdmin,
        auditoria,
      );
      expect(r.valorVigente).toMatchObject({
        valor: '19.5',
        vigenteDesde: '2026-11-19',
      });
      expect(r.proximoValor).toBeNull();
      expect(
        t.repo.valores.find(
          (v) => v.parametroId === 1 && v.vigenteDesde === '2003-01-01',
        ),
      ).toBeDefined();
    });

    it('guarda el creador del cambio', async () => {
      await t.servicio.agregarValor(
        1,
        { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
        actorAdmin,
        {},
      );
      expect(
        t.repo.valores.find((v) => v.vigenteDesde === '2026-12-01')?.createdBy,
      ).toBe(actorAdmin.id);
    });

    it('rechaza vigencias pasadas y no posteriores a la última versión (422)', async () => {
      await expect(
        t.servicio.agregarValor(
          1,
          { version: 1, valor: '20', vigenteDesde: '2026-11-18' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'VIGENCIA_EN_EL_PASADO' },
      });
      await t.servicio.agregarValor(
        1,
        { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.agregarValor(
          1,
          { version: 2, valor: '21', vigenteDesde: '2026-12-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'VIGENCIA_NO_POSTERIOR' },
      });
    });

    it('valida el valor según el tipo del parámetro (400)', async () => {
      await expect(
        t.servicio.agregarValor(
          1,
          { version: 1, valor: '150', vigenteDesde: '2026-12-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { detalles: [{ campo: 'valor' }] },
      });
      await expect(
        t.servicio.agregarValor(
          2,
          { version: 1, valor: '30.5', vigenteDesde: '2026-12-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('409 CONFLICTO_VERSION si otra persona cambió el parámetro mientras tanto', async () => {
      await t.servicio.agregarValor(
        1,
        { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.agregarValor(
          1,
          { version: 1, valor: '21', vigenteDesde: '2027-01-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          codigo: 'CONFLICTO_VERSION',
          detalles: [{ versionActual: 2 }],
        },
      });
    });

    it('404 si el parámetro no existe', async () => {
      await expect(
        t.servicio.agregarValor(
          99,
          { version: 1, valor: '1', vigenteDesde: '2026-12-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'PARAMETRO_NO_ENCONTRADO' },
      });
    });
  });

  describe('eliminarValor', () => {
    it('elimina un valor programado y devuelve el parámetro actualizado', async () => {
      await t.servicio.agregarValor(
        1,
        { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
        actorAdmin,
        {},
      );
      const programado = t.repo.valores.find(
        (v) => v.vigenteDesde === '2026-12-01',
      )!;
      const r = await t.servicio.eliminarValor(
        1,
        programado.id,
        { version: 2, motivo: 'Error' },
        actorAdmin,
        auditoria,
      );
      expect(r.proximoValor).toBeNull();
      expect(r.valorVigente).toMatchObject({ valor: '19', vigenteHasta: null });
      expect(r.version).toBe(3);
      expect(auditoria.motivo).toBe('Error');
    });

    it('no elimina valores ya vigentes: forman parte del historial (422)', async () => {
      await expect(
        t.servicio.eliminarValor(1, 1, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'VALOR_YA_VIGENTE' },
      });
    });

    it('404 si el valor no pertenece al parámetro', async () => {
      await expect(
        t.servicio.eliminarValor(1, 2, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'PARAMETRO_VALOR_NO_ENCONTRADO' },
      });
    });
  });

  describe('valorNumerico (uso interno, p. ej. IVA)', () => {
    it('resuelve el valor vigente en la fecha pedida', async () => {
      await t.servicio.agregarValor(
        1,
        { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
        actorAdmin,
        {},
      );
      expect(await t.servicio.valorNumerico('iva')).toBe(19);
      expect(await t.servicio.valorNumerico('iva', '2026-11-30')).toBe(19);
      expect(await t.servicio.valorNumerico('iva', '2026-12-01')).toBe(20);
    });

    it('error si el código no existe o no hay valor vigente a esa fecha', async () => {
      await expect(t.servicio.valorNumerico('no_existe')).rejects.toMatchObject(
        { status: 404 },
      );
      await expect(
        t.servicio.valorNumerico('iva', '2000-01-01'),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'PARAMETRO_SIN_VALOR' },
      });
    });
  });

  it('historial devuelve las versiones de la más reciente a la más antigua con su vigencia', async () => {
    await t.servicio.agregarValor(
      1,
      { version: 1, valor: '20', vigenteDesde: '2026-12-01' },
      actorAdmin,
      {},
    );
    const h = await t.servicio.historial(1);
    expect(h.map((v) => [v.valor, v.vigenteDesde, v.vigenteHasta])).toEqual([
      ['20', '2026-12-01', null],
      ['19', '2003-01-01', '2026-11-30'],
    ]);
  });
});
