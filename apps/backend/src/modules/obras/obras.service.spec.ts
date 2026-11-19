import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogosRepositorioFake,
  ObrasRepositorioFake,
  RelojFijo,
  UfRepositorioFake,
  actorAdmin,
  actorUsuario,
  crearCliente,
  crearItemCatalogo,
  crearValorUf,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import { TipoCatalogo } from '../catalogos/catalogos.tipos.js';
import type { ClientesRepositorio } from '../clientes/clientes.repositorio.js';
import { ClientesRepositorioFake } from '../../../test/utils/fakes-maestros.js';
import { UfService } from '../uf/uf.service.js';
import type { UfRepositorio } from '../uf/uf.repositorio.js';
import { ObrasService, validarFechasObra } from './obras.service.js';
import type { ObrasRepositorio } from './obras.repositorio.js';
import { MonedaContrato } from './obras.tipos.js';

const estado = (id: number, codigo: string, extra: object = {}) =>
  crearItemCatalogo({
    id,
    tipo: TipoCatalogo.EstadoObra,
    codigo,
    nombre: codigo,
    orden: id * 10,
    ...extra,
  });

function preparar() {
  const clientes = new ClientesRepositorioFake().semilla(
    crearCliente(),
    crearCliente({
      id: 2,
      rut: '11111111-1',
      razonSocial: 'Inmobiliaria Central',
    }),
    crearCliente({
      id: 3,
      rut: '10000013-K',
      razonSocial: 'Eliminado',
      eliminadoEn: new Date(),
    }),
  );
  const catalogos = new CatalogosRepositorioFake().semilla(
    estado(1, 'en_preparacion'),
    estado(2, 'activa'),
    estado(3, 'suspendida'),
    estado(4, 'terminada', { activo: false }),
    estado(5, 'cerrada'),
  );
  const uf = new UfRepositorioFake().semilla(
    crearValorUf({ fecha: '2026-11-19', valor: 39284.8712 }),
  );
  const obras = new ObrasRepositorioFake(clientes.filas, catalogos.filas);
  const reloj = new RelojFijo();
  const servicio = new ObrasService(
    obras as unknown as ObrasRepositorio,
    clientes as unknown as ClientesRepositorio,
    catalogos as unknown as CatalogosRepositorio,
    new UfService(uf as unknown as UfRepositorio, reloj),
    reloj,
  );
  return { servicio, obras, clientes, catalogos, uf };
}

const datos = {
  codigoCentroCosto: 'CC-001',
  nombre: 'Local Parque Norte',
  clienteId: 1,
};

describe('ObrasService', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  describe('crear', () => {
    it('crea "en preparación" por defecto, con cliente y estado en la proyección', async () => {
      const r = await t.servicio.crear(datos, actorUsuario, auditoria);
      expect(r).toMatchObject({
        id: 1,
        codigoCentroCosto: 'CC-001',
        cliente: { id: 1, razonSocial: 'Grupo Andino SpA' },
        estado: { id: 1, codigo: 'en_preparacion' },
        monedaContrato: 'CLP',
        montoContrato: null,
        montoContratoClp: null,
        version: 1,
      });
      expect(t.obras.filas.get(1)?.createdBy).toBe(actorUsuario.id);
      expect(auditoria.entidadId).toBe(1);
      expect(auditoria.despues).toMatchObject({ codigoCentroCosto: 'CC-001' });
    });

    it('un contrato en CLP guarda el monto y su equivalente idéntico', async () => {
      const r = await t.servicio.crear(
        { ...datos, montoContrato: 185_000_000 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        monedaContrato: 'CLP',
        montoContrato: 185_000_000,
        montoContratoClp: 185_000_000,
        valorUf: null,
        fechaValorUf: null,
      });
    });

    it('un contrato en UF guarda monto UF, valor y fecha de la UF y el equivalente en CLP', async () => {
      const r = await t.servicio.crear(
        { ...datos, monedaContrato: MonedaContrato.Uf, montoContrato: 4710.5 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        monedaContrato: 'UF',
        montoContrato: 4710.5,
        montoContratoClp: 185_051_386,
        valorUf: 39284.8712,
        fechaValorUf: '2026-11-19',
      });
    });

    it('un contrato en UF usa la UF de la fecha de conversión indicada', async () => {
      t.uf.semilla(crearValorUf({ fecha: '2026-11-10', valor: 39000 }));
      const r = await t.servicio.crear(
        {
          ...datos,
          monedaContrato: MonedaContrato.Uf,
          montoContrato: 100,
          fechaConversionUf: '2026-11-10',
        },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        valorUf: 39000,
        fechaValorUf: '2026-11-10',
        montoContratoClp: 3_900_000,
      });
    });

    it('422 UF_NO_DISPONIBLE si el contrato es en UF y no hay valor cargado', async () => {
      t.uf.valores.clear();
      await expect(
        t.servicio.crear(
          { ...datos, monedaContrato: MonedaContrato.Uf, montoContrato: 10 },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'UF_NO_DISPONIBLE' },
      });
      expect(t.obras.filas.size).toBe(0);
    });

    it('en UF sin monto no necesita el valor de la UF', async () => {
      t.uf.valores.clear();
      const r = await t.servicio.crear(
        { ...datos, monedaContrato: MonedaContrato.Uf },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        monedaContrato: 'UF',
        montoContrato: null,
        montoContratoClp: null,
      });
    });

    it('422 MONTO_INVALIDO con decimales en CLP', async () => {
      await expect(
        t.servicio.crear(
          { ...datos, montoContrato: 100.5 },
          actorAdmin,
          auditoria,
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'MONTO_INVALIDO' },
      });
    });

    it('rechaza un centro de costo repetido entre obras vigentes (409) y permite reutilizar el de una eliminada', async () => {
      await t.servicio.crear(datos, actorAdmin, {});
      await expect(
        t.servicio.crear(datos, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CENTRO_COSTO_DUPLICADO' },
      });
      t.obras.filas.get(1)!.eliminadoEn = new Date();
      await expect(
        t.servicio.crear(datos, actorAdmin, {}),
      ).resolves.toBeDefined();
    });

    it('422 si el cliente no existe o fue eliminado', async () => {
      for (const clienteId of [99, 3]) {
        await expect(
          t.servicio.crear({ ...datos, clienteId }, actorAdmin, {}),
        ).rejects.toMatchObject({
          status: 422,
          response: { codigo: 'CLIENTE_NO_ENCONTRADO' },
        });
      }
    });

    it('valida el estado: debe estar activo y no puede ser "cerrada"', async () => {
      await expect(
        t.servicio.crear({ ...datos, estadoId: 4 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'ESTADO_NO_DISPONIBLE' },
      });
      await expect(
        t.servicio.crear({ ...datos, estadoId: 99 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'ESTADO_NO_DISPONIBLE' },
      });
      await expect(
        t.servicio.crear({ ...datos, estadoId: 5 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'CIERRE_NO_DISPONIBLE' },
      });
      const ok = await t.servicio.crear(
        { ...datos, estadoId: 2 },
        actorAdmin,
        {},
      );
      expect(ok.estado.codigo).toBe('activa');
    });

    it('400 si la fecha de término es anterior a la de inicio', async () => {
      await expect(
        t.servicio.crear(
          { ...datos, fechaInicio: '2026-03-01', fechaTermino: '2026-01-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { detalles: [{ campo: 'fechaTermino' }] },
      });
    });
  });

  describe('actualizar', () => {
    beforeEach(async () => {
      await t.servicio.crear(datos, actorAdmin, {});
    });

    it('modifica los campos enviados, sube la versión y registra antes/después', async () => {
      const r = await t.servicio.actualizar(
        1,
        {
          version: 1,
          nombre: 'Local Parque Norte II',
          responsable: 'Camila Rojas',
          estadoId: 2,
        },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        nombre: 'Local Parque Norte II',
        responsable: 'Camila Rojas',
        estado: { codigo: 'activa' },
        version: 2,
      });
      expect(auditoria.antes).toMatchObject({
        nombre: 'Local Parque Norte',
        version: 1,
      });
      expect(auditoria.despues).toMatchObject({
        nombre: 'Local Parque Norte II',
        version: 2,
      });
      expect(t.obras.filas.get(1)?.updatedBy).toBe(actorUsuario.id);
    });

    it('409 CONFLICTO_VERSION con la versión vigente', async () => {
      await t.servicio.actualizar(
        1,
        { version: 1, nombre: 'Primero' },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.actualizar(
          1,
          { version: 1, nombre: 'Segundo' },
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

    it('el cambio de moneda o monto recalcula la fotografía de UF; sin ese cambio se conserva', async () => {
      await t.servicio.actualizar(
        1,
        { version: 1, monedaContrato: MonedaContrato.Uf, montoContrato: 1000 },
        actorAdmin,
        {},
      );
      t.uf.semilla(crearValorUf({ fecha: '2026-11-19', valor: 40000 }));
      const sinCambioDeMonto = await t.servicio.actualizar(
        1,
        { version: 2, nombre: 'Solo nombre' },
        actorAdmin,
        {},
      );
      expect(sinCambioDeMonto).toMatchObject({
        valorUf: 39284.8712,
        montoContratoClp: 39_284_871,
      });
      const conCambio = await t.servicio.actualizar(
        1,
        { version: 3, montoContrato: 1000.5 },
        actorAdmin,
        {},
      );
      expect(conCambio).toMatchObject({
        valorUf: 40000,
        montoContratoClp: 40_020_000,
      });
    });

    it('pasar de UF a CLP exige un monto entero y borra la fotografía de UF', async () => {
      await t.servicio.actualizar(
        1,
        { version: 1, monedaContrato: MonedaContrato.Uf, montoContrato: 10.5 },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.actualizar(
          1,
          { version: 2, monedaContrato: MonedaContrato.Clp },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'MONTO_INVALIDO' } });
      const r = await t.servicio.actualizar(
        1,
        {
          version: 2,
          monedaContrato: MonedaContrato.Clp,
          montoContrato: 400_000,
        },
        actorAdmin,
        {},
      );
      expect(r).toMatchObject({
        monedaContrato: 'CLP',
        montoContratoClp: 400_000,
        valorUf: null,
        fechaValorUf: null,
      });
    });

    it('montoContrato null borra el monto', async () => {
      await t.servicio.actualizar(
        1,
        { version: 1, montoContrato: 5_000_000 },
        actorAdmin,
        {},
      );
      const r = await t.servicio.actualizar(
        1,
        { version: 2, montoContrato: null },
        actorAdmin,
        {},
      );
      expect(r).toMatchObject({ montoContrato: null, montoContratoClp: null });
    });

    it('no permite vaciar campos obligatorios (400)', async () => {
      for (const campo of [
        'nombre',
        'clienteId',
        'codigoCentroCosto',
        'estadoId',
      ] as const) {
        await expect(
          t.servicio.actualizar(
            1,
            { version: 1, [campo]: null },
            actorAdmin,
            {},
          ),
        ).rejects.toMatchObject({
          status: 400,
          response: { detalles: [{ campo }] },
        });
      }
    });

    it('valida el cliente nuevo y el centro de costo nuevo', async () => {
      await t.servicio.crear(
        { ...datos, codigoCentroCosto: 'CC-002', nombre: 'Otra' },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.actualizar(1, { version: 1, clienteId: 3 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'CLIENTE_NO_ENCONTRADO' },
      });
      await expect(
        t.servicio.actualizar(
          1,
          { version: 1, codigoCentroCosto: 'CC-002' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'CENTRO_COSTO_DUPLICADO' },
      });
      const r = await t.servicio.actualizar(
        1,
        { version: 1, clienteId: 2, codigoCentroCosto: 'CC-001' },
        actorAdmin,
        {},
      );
      expect(r.cliente.id).toBe(2);
    });

    it('no se puede pasar una obra a "cerrada" desde la edición (422)', async () => {
      await expect(
        t.servicio.actualizar(1, { version: 1, estadoId: 5 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'CIERRE_NO_DISPONIBLE' },
      });
    });

    it('una obra cerrada es de solo lectura (422 OBRA_CERRADA)', async () => {
      t.obras.filas.get(1)!.estadoId = 5;
      await expect(
        t.servicio.actualizar(
          1,
          { version: 1, nombre: 'Cambio' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'OBRA_CERRADA' },
      });
      await expect(
        t.servicio.eliminar(1, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'OBRA_NO_ELIMINABLE' },
      });
    });

    it('valida las fechas contra los valores ya guardados', async () => {
      await t.servicio.actualizar(
        1,
        { version: 1, fechaInicio: '2026-03-01' },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.actualizar(
          1,
          { version: 2, fechaTermino: '2026-02-01' },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('404 si la obra no existe', async () => {
      await expect(
        t.servicio.actualizar(99, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'OBRA_NO_ENCONTRADA' },
      });
    });
  });

  describe('eliminar (borrado lógico)', () => {
    it('solo una obra "en preparación" se puede eliminar; se conserva el registro', async () => {
      await t.servicio.crear(datos, actorAdmin, {});
      await t.servicio.eliminar(
        1,
        { version: 1, motivo: 'Creada por error' },
        actorUsuario,
        auditoria,
      );
      const fila = t.obras.filas.get(1);
      expect(fila?.eliminadoEn).toBeInstanceOf(Date);
      expect(fila?.eliminadoPor).toBe(actorUsuario.id);
      expect(auditoria).toMatchObject({
        entidadId: 1,
        motivo: 'Creada por error',
      });
      expect(auditoria.antes).toMatchObject({ codigoCentroCosto: 'CC-001' });
      await expect(t.servicio.obtener(1)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('422 OBRA_NO_ELIMINABLE si ya está en otro estado', async () => {
      await t.servicio.crear({ ...datos, estadoId: 2 }, actorAdmin, {});
      await expect(
        t.servicio.eliminar(1, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'OBRA_NO_ELIMINABLE' },
      });
    });

    it('409 si la versión está desactualizada', async () => {
      await t.servicio.crear(datos, actorAdmin, {});
      await expect(
        t.servicio.eliminar(1, { version: 7 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('resumen (ficha)', () => {
    it('incluye adjuntos y, en UF, el equivalente en CLP al valor de hoy', async () => {
      await t.servicio.crear(
        { ...datos, monedaContrato: MonedaContrato.Uf, montoContrato: 1000 },
        actorAdmin,
        {},
      );
      t.uf.semilla(crearValorUf({ fecha: '2026-11-19', valor: 40000 }));
      t.obras.adjuntos = 3;
      const r = await t.servicio.resumen(1);
      expect(r.cantidadAdjuntos).toBe(3);
      expect(r.valorUfHoy).toEqual({ fecha: '2026-11-19', valor: 40000 });
      expect(r.montoContratoClpHoy).toBe(40_000_000);
      expect(r.obra.montoContratoClp).toBe(39_284_871);
    });

    it('en CLP no calcula equivalente de hoy; sin UF cargada no falla', async () => {
      await t.servicio.crear(
        { ...datos, montoContrato: 5_000_000 },
        actorAdmin,
        {},
      );
      const r = await t.servicio.resumen(1);
      expect(r.montoContratoClpHoy).toBeNull();
      t.uf.valores.clear();
      await t.servicio.actualizar(
        1,
        { version: 1, monedaContrato: MonedaContrato.Uf, montoContrato: null },
        actorAdmin,
        {},
      );
      const sinUf = await t.servicio.resumen(1);
      expect(sinUf.valorUfHoy).toBeNull();
      expect(sinUf.montoContratoClpHoy).toBeNull();
    });
  });

  it('listar filtra por estado y cliente y pagina', async () => {
    await t.servicio.crear(datos, actorAdmin, {});
    await t.servicio.crear(
      {
        ...datos,
        codigoCentroCosto: 'CC-002',
        nombre: 'B',
        clienteId: 2,
        estadoId: 2,
      },
      actorAdmin,
      {},
    );
    expect((await t.servicio.listar({ pagina: 1, tamanio: 10 })).total).toBe(2);
    expect(
      (
        await t.servicio.listar({ pagina: 1, tamanio: 10, estadoId: 2 })
      ).items.map((o) => o.id),
    ).toEqual([2]);
    expect(
      (
        await t.servicio.listar({ pagina: 1, tamanio: 10, clienteId: 1 })
      ).items.map((o) => o.id),
    ).toEqual([1]);
  });

  it('validarFechasObra acepta fechas iguales y valores vacíos', () => {
    expect(() => validarFechasObra('2026-03-01', '2026-03-01')).not.toThrow();
    expect(() => validarFechasObra(null, '2026-03-01')).not.toThrow();
    expect(() => validarFechasObra('2026-03-01', null)).not.toThrow();
  });
});
