import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogosRepositorioFake,
  ClientesRepositorioFake,
  ObrasRepositorioFake,
  RelojFijo,
  UfRepositorioFake,
  actorAdmin,
  crearCliente,
  crearItemCatalogo,
  crearObra,
  crearValorUf,
} from '../../../test/utils/fakes-maestros.js';
import {
  ImportacionesRepositorioFake,
  PresupuestosRepositorioFake,
} from '../../../test/utils/fakes-presupuestos.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { ArchivoSubido } from '../adjuntos/adjuntos.service.js';
import type { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import { TipoCatalogo } from '../catalogos/catalogos.tipos.js';
import type { ObrasRepositorio } from '../obras/obras.repositorio.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import type { PresupuestosRepositorio } from '../presupuestos/presupuestos.repositorio.js';
import { PresupuestosService } from '../presupuestos/presupuestos.service.js';
import type { UfRepositorio } from '../uf/uf.repositorio.js';
import { UfService } from '../uf/uf.service.js';
import type { ImportacionesRepositorio } from './importaciones.repositorio.js';
import { ImportacionesService } from './importaciones.service.js';

const CABECERA = 'Código;Familia;Descripción;Unidad;Cantidad;Precio unitario';

const estadoObra = (id: number, codigo: string) =>
  crearItemCatalogo({
    id,
    tipo: TipoCatalogo.EstadoObra,
    codigo,
    nombre: codigo,
    orden: id,
  });
const familia = (id: number, codigo: string, nombre: string, activo = true) =>
  crearItemCatalogo({
    id,
    tipo: TipoCatalogo.FamiliaPartida,
    codigo,
    nombre,
    orden: id,
    activo,
    protegido: false,
  });

function preparar() {
  const clientes = new ClientesRepositorioFake().semilla(crearCliente());
  const catalogos = new CatalogosRepositorioFake().semilla(
    estadoObra(1, 'en_preparacion'),
    estadoObra(2, 'activa'),
    estadoObra(5, 'cerrada'),
    familia(10, 'obra_gruesa', 'Obra gruesa'),
    familia(11, 'instalaciones', 'Instalaciones'),
    familia(12, 'antigua', 'Antigua', false),
  );
  const obras = new ObrasRepositorioFake(
    clientes.filas,
    catalogos.filas,
  ).semilla(
    crearObra({ id: 1, estadoId: 2 }),
    crearObra({
      id: 2,
      codigoCentroCosto: 'CC-002',
      estadoId: 2,
      monedaContrato: MonedaContrato.Uf,
    }),
    crearObra({ id: 3, codigoCentroCosto: 'CC-003', estadoId: 5 }),
  );
  const uf = new UfRepositorioFake().semilla(
    crearValorUf({ fecha: '2026-11-19', valor: 40_000 }),
  );
  const reloj = new RelojFijo();
  const presupuestosRepo = new PresupuestosRepositorioFake();
  presupuestosRepo.llamadas = obras.llamadas;
  const presupuestos = new PresupuestosService(
    presupuestosRepo as unknown as PresupuestosRepositorio,
    obras as unknown as ObrasRepositorio,
    catalogos as unknown as CatalogosRepositorio,
    new UfService(uf as unknown as UfRepositorio, reloj),
    reloj,
  );
  const repo = new ImportacionesRepositorioFake();
  repo.llamadas = obras.llamadas;
  for (const id of [1, 2, 3]) {
    repo.obras.set(id, { ...obras.filas.get(id)! });
  }
  const servicio = new ImportacionesService(
    repo as unknown as ImportacionesRepositorio,
    obras as unknown as ObrasRepositorio,
    catalogos as unknown as CatalogosRepositorio,
    presupuestos,
    reloj,
  );
  return { servicio, repo, presupuestosRepo, catalogos, obras };
}

const csv = (...filas: string[]): ArchivoSubido => {
  const buffer = Buffer.from([CABECERA, ...filas].join('\n'), 'utf8');
  return { originalname: 'presupuesto.csv', buffer, size: buffer.length };
};

async function excel(filas: unknown[][]): Promise<ArchivoSubido> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Partidas');
  hoja.addRow(CABECERA.split(';'));
  for (const fila of filas) hoja.addRow(fila);
  const buffer = Buffer.from(await libro.xlsx.writeBuffer());
  return { originalname: 'presupuesto.xlsx', buffer, size: buffer.length };
}

const FILAS_OK = [
  '1.1;Obra gruesa;Radier;m2;120,5;18.500',
  '1.2;instalaciones;Cañería;ml;40;7500',
];

describe('ImportacionesService', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  describe('subir (previsualización)', () => {
    it('lee, valida y guarda el lote sin crear nada en el presupuesto', async () => {
      const r = await t.servicio.subirPresupuesto(
        csv(...FILAS_OK),
        { obraId: 1 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        id: 1,
        tipo: 'presupuesto',
        estado: 'previsualizado',
        obra: { id: 1, codigoCentroCosto: 'CC-001' },
        nombreArchivo: 'presupuesto.csv',
        totalFilas: 2,
        filasValidas: 2,
        filasConError: 0,
        montoTotal: 2_229_250 + 300_000,
        moneda: 'CLP',
        presupuestoVersionId: null,
        creadoPor: { id: 1, nombre: 'Administrador' },
        version: 1,
      });
      expect(auditoria.entidadId).toBe(1);
      expect(t.repo.filas).toHaveLength(2);
      expect(t.presupuestosRepo.versiones.size).toBe(0);
    });

    it('con errores: guarda todas las filas, marca las inválidas y cuenta los errores', async () => {
      const r = await t.servicio.subirPresupuesto(
        csv(
          '1.1;Obra gruesa;Radier;m2;10;1000',
          '1.1;Inexistente;;m2;0;1,5',
          '1.3;Obra gruesa;Muro;m2;2;500',
        ),
        { obraId: 1 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        totalFilas: 3,
        filasValidas: 2,
        filasConError: 1,
        montoTotal: 11_000,
      });
      const errores = await t.servicio.listarFilas(1, {
        pagina: 1,
        tamanio: 25,
        soloErrores: true,
      });
      expect(errores.total).toBe(1);
      expect(errores.items[0]).toMatchObject({
        numeroFila: 3,
        valida: false,
        datos: { codigo: '1.1', familia: 'Inexistente', descripcion: null },
      });
      expect(errores.items[0].errores.map((e) => e.campo)).toEqual([
        'codigo',
        'familia',
        'descripcion',
        'cantidad',
        'precioUnitario',
      ]);
      const todas = await t.servicio.listarFilas(1, { pagina: 1, tamanio: 2 });
      expect(todas).toMatchObject({ total: 3, pagina: 1, tamanio: 2 });
      expect(todas.items.map((f) => f.numeroFila)).toEqual([2, 3]);
    });

    it('lee archivos Excel (.xlsx)', async () => {
      const r = await t.servicio.subirPresupuesto(
        await excel([['1.1', 'Obra gruesa', 'Radier', 'm2', 120.5, 18_500]]),
        { obraId: 1 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        totalFilas: 1,
        filasConError: 0,
        montoTotal: 2_229_250,
      });
    });

    it('valida el precio según la moneda de la obra de destino', async () => {
      const clp = await t.servicio.subirPresupuesto(
        csv('1;Obra gruesa;Algo;gl;1;10,5'),
        { obraId: 1 },
        actorAdmin,
        {},
      );
      expect(clp.filasConError).toBe(1);
      const uf = await t.servicio.subirPresupuesto(
        csv('1;Obra gruesa;Algo;gl;1;10,5'),
        { obraId: 2 },
        actorAdmin,
        {},
      );
      expect(uf).toMatchObject({
        filasConError: 0,
        moneda: 'UF',
        montoTotal: 10.5,
      });
    });

    it('rechaza lo que no es .xlsx/.csv, un archivo ausente, una obra inexistente o cerrada', async () => {
      await expect(
        t.servicio.subirPresupuesto(undefined, { obraId: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({ response: { codigo: 'ARCHIVO_REQUERIDO' } });

      const pdf = Buffer.from('%PDF-1.4 contenido');
      await expect(
        t.servicio.subirPresupuesto(
          { originalname: 'a.pdf', buffer: pdf, size: pdf.length },
          { obraId: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        status: 415,
        response: { codigo: 'TIPO_ARCHIVO_NO_PERMITIDO' },
      });

      // Una extensión .xlsx con contenido que no lo es.
      await expect(
        t.servicio.subirPresupuesto(
          { originalname: 'falso.xlsx', buffer: Buffer.from('hola'), size: 4 },
          { obraId: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({
        response: { codigo: 'CONTENIDO_NO_COINCIDE' },
      });

      await expect(
        t.servicio.subirPresupuesto(
          csv(...FILAS_OK),
          { obraId: 99 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        t.servicio.subirPresupuesto(
          csv(...FILAS_OK),
          { obraId: 3 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
      expect(t.repo.lotes.size).toBe(0);
    });

    it('una planilla con estructura inválida no crea lote', async () => {
      await expect(
        t.servicio.subirPresupuesto(
          { originalname: 'x.csv', buffer: Buffer.from('a;b\n1;2'), size: 7 },
          { obraId: 1 },
          actorAdmin,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'PLANTILLA_INVALIDA' } });
      expect(t.repo.lotes.size).toBe(0);
    });
  });

  describe('confirmar', () => {
    const subirOk = () =>
      t.servicio.subirPresupuesto(
        csv(...FILAS_OK),
        { obraId: 1 },
        actorAdmin,
        {},
      );

    it('crea la versión en borrador con las partidas y marca el lote como confirmado', async () => {
      const lote = await subirOk();
      const r = await t.servicio.confirmar(
        lote.id,
        { version: 1 },
        actorAdmin,
        auditoria,
      );
      expect(r).toMatchObject({
        estado: 'confirmado',
        presupuestoVersionId: 1,
        version: 2,
      });
      expect(r.confirmadoEn).toBe('2026-11-19T15:00:00.000Z');
      expect(auditoria.despues).toMatchObject({ estado: 'confirmado' });

      const version = t.presupuestosRepo.versiones.get(1)!;
      expect(version).toMatchObject({
        obraId: 1,
        numero: 1,
        estado: 'borrador',
        vigente: false,
        importacionLoteId: 1,
        descripcion: 'Importada de presupuesto.csv',
        cantidadPartidas: 2,
        total: 2_529_250,
        totalClp: 2_529_250,
        createdBy: actorAdmin.id,
      });
      const partidas = await t.presupuestosRepo.listarPartidas(1);
      expect(
        partidas.map((p) => [p.codigo, p.orden, p.familiaId, p.total]),
      ).toEqual([
        ['1.1', 1, 10, 2_229_250],
        ['1.2', 2, 11, 300_000],
      ]);
    });

    it('bloquea el lote antes que la obra (sin interbloqueos) y no permite confirmar dos veces', async () => {
      const lote = await subirOk();
      await t.servicio.confirmar(lote.id, { version: 1 }, actorAdmin, {});
      expect(t.obras.llamadas.slice(0, 2)).toEqual([
        'bloquear-lote:1',
        'bloquear:1',
      ]);
      await expect(
        t.servicio.confirmar(lote.id, { version: 2 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: {
          codigo: 'IMPORTACION_NO_PENDIENTE',
          mensaje: 'El lote ya fue confirmado.',
        },
      });
      expect(t.presupuestosRepo.versiones.size).toBe(1);
    });

    it('un lote con errores no se puede confirmar', async () => {
      const lote = await t.servicio.subirPresupuesto(
        csv('1.1;Obra gruesa;Radier;m2;10;1000', '1.2;Nada;Algo;m2;1;1'),
        { obraId: 1 },
        actorAdmin,
        {},
      );
      await expect(
        t.servicio.confirmar(lote.id, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { codigo: 'IMPORTACION_CON_ERRORES' },
      });
      expect(t.presupuestosRepo.versiones.size).toBe(0);
    });

    it('409 si el lote cambió; 404 si no existe', async () => {
      const lote = await subirOk();
      await expect(
        t.servicio.confirmar(lote.id, { version: 5 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        status: 409,
        response: { detalles: [{ versionActual: 1 }] },
      });
      await expect(
        t.servicio.confirmar(99, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'IMPORTACION_NO_ENCONTRADA' },
      });
    });

    it('vuelve a validar al confirmar: si una familia se desactivó, el lote queda desactualizado', async () => {
      const lote = await subirOk();
      const gruesa = t.catalogos.filas.get(10)!;
      t.catalogos.filas.set(10, { ...gruesa, activo: false });
      await expect(
        t.servicio.confirmar(lote.id, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'IMPORTACION_DESACTUALIZADA' },
      });
      expect(t.presupuestosRepo.versiones.size).toBe(0);
    });

    it('si la obra se cerró entre la vista previa y la confirmación, 422', async () => {
      const lote = await subirOk();
      t.obras.filas.set(1, { ...t.obras.filas.get(1)!, estadoId: 5 });
      await expect(
        t.servicio.confirmar(lote.id, { version: 1 }, actorAdmin, {}),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
    });

    it('en una obra en UF la versión importada se valoriza con la UF de hoy', async () => {
      const lote = await t.servicio.subirPresupuesto(
        csv('1;Obra gruesa;Global;gl;2;1,5'),
        { obraId: 2 },
        actorAdmin,
        {},
      );
      await t.servicio.confirmar(lote.id, { version: 1 }, actorAdmin, {});
      expect(t.presupuestosRepo.versiones.get(1)).toMatchObject({
        moneda: 'UF',
        valorUf: 40_000,
        total: 3,
        totalClp: 120_000,
      });
    });

    it('el número de versión sigue el correlativo de la obra', async () => {
      const a = await subirOk();
      await t.servicio.confirmar(a.id, { version: 1 }, actorAdmin, {});
      const b = await subirOk();
      await t.servicio.confirmar(b.id, { version: 1 }, actorAdmin, {});
      expect(
        [...t.presupuestosRepo.versiones.values()].map((v) => v.numero),
      ).toEqual([1, 2]);
    });
  });

  describe('descartar y consultar', () => {
    it('descarta un lote pendiente; después no se puede confirmar ni descartar', async () => {
      const lote = await t.servicio.subirPresupuesto(
        csv(...FILAS_OK),
        { obraId: 1 },
        actorAdmin,
        {},
      );
      const r = await t.servicio.descartar(
        lote.id,
        { version: 1, motivo: 'Archivo equivocado' },
        actorAdmin,
        auditoria,
      );
      expect(r.estado).toBe('descartado');
      expect(auditoria.motivo).toBe('Archivo equivocado');
      await expect(
        t.servicio.confirmar(lote.id, { version: 2 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: {
          codigo: 'IMPORTACION_NO_PENDIENTE',
          mensaje: 'El lote fue descartado.',
        },
      });
      await expect(
        t.servicio.descartar(lote.id, { version: 2 }, actorAdmin, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'IMPORTACION_NO_PENDIENTE' },
      });
      await expect(
        t.servicio.descartar(lote.id, { version: 99 }, actorAdmin, {}),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('lista los lotes (más recientes primero) con filtros y pagina', async () => {
      for (let i = 0; i < 3; i++) {
        await t.servicio.subirPresupuesto(
          csv(...FILAS_OK),
          { obraId: i === 2 ? 2 : 1 },
          actorAdmin,
          {},
        );
      }
      await t.servicio.descartar(1, { version: 1 }, actorAdmin, {});
      const todos = await t.servicio.listar({ pagina: 1, tamanio: 2 });
      expect(todos).toMatchObject({ total: 3, pagina: 1, tamanio: 2 });
      expect(todos.items.map((l) => l.id)).toEqual([3, 2]);
      expect(
        (await t.servicio.listar({ pagina: 1, tamanio: 25, obraId: 1 })).total,
      ).toBe(2);
      expect(
        (
          await t.servicio.listar({
            pagina: 1,
            tamanio: 25,
            estado: 'descartado' as never,
          })
        ).items.map((l) => l.id),
      ).toEqual([1]);
    });

    it('obtener y listarFilas dan 404 si el lote no existe', async () => {
      await expect(t.servicio.obtener(9)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        t.servicio.listarFilas(9, { pagina: 1, tamanio: 25 }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  it('la plantilla se genera con las familias activas del catálogo', async () => {
    const plantilla = await t.servicio.plantillaPresupuesto();
    expect(plantilla.nombre).toBe('plantilla-presupuesto.xlsx');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(plantilla.contenido as unknown as ExcelJS.Buffer);
    const nombres = libro.getWorksheet('Familias')!.getColumn(2)
      .values as string[];
    expect(nombres.slice(2)).toEqual(['Obra gruesa', 'Instalaciones']);
  });
});
