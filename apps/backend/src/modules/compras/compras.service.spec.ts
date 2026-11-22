import { beforeEach, describe, expect, it } from 'vitest';
import {
  ComprasRepositorioFake,
  MovimientosRepositorioFake,
  crearCotizacion,
  crearHito,
  crearOrdenCompra,
  crearOrdenTrabajo,
} from '../../../test/utils/fakes-compras.js';
import {
  CatalogosRepositorioFake,
  ClientesRepositorioFake,
  ObrasRepositorioFake,
  ProveedoresRepositorioFake,
  RelojFijo,
  actorAdmin,
  actorOtroUsuario,
  actorUsuario,
  crearCliente,
  crearItemCatalogo,
  crearObra,
  crearProveedor,
} from '../../../test/utils/fakes-maestros.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import { TipoCatalogo } from '../catalogos/catalogos.tipos.js';
import type { MovimientosRepositorio } from '../movimientos/movimientos.repositorio.js';
import { MovimientosService } from '../movimientos/movimientos.service.js';
import type { ObrasRepositorio } from '../obras/obras.repositorio.js';
import type { ParametrosService } from '../parametros/parametros.service.js';
import type { ProveedoresRepositorio } from '../proveedores/proveedores.repositorio.js';
import type { ComprasRepositorio } from './compras.repositorio.js';
import {
  EstadoDocumentoCompra as E,
  TipoOrdenCompra,
} from './compras.tipos.js';
import { ContextoCompras } from './contexto-compras.js';
import { CotizacionesService } from './cotizaciones.service.js';
import { OrdenesCompraService } from './ordenes-compra.service.js';
import { OrdenesTrabajoService } from './ordenes-trabajo.service.js';

const MATERIALES = 20;
const SUBCONTRATOS = 21;
const INACTIVA = 22;

const item = (id: number, tipo: TipoCatalogo, codigo: string, activo = true) =>
  crearItemCatalogo({ id, tipo, codigo, nombre: codigo, orden: id, activo });

function preparar() {
  const clientes = new ClientesRepositorioFake().semilla(crearCliente());
  const catalogos = new CatalogosRepositorioFake().semilla(
    item(2, TipoCatalogo.EstadoObra, 'activa'),
    item(5, TipoCatalogo.EstadoObra, 'cerrada'),
    item(MATERIALES, TipoCatalogo.CategoriaGasto, 'materiales'),
    item(SUBCONTRATOS, TipoCatalogo.CategoriaGasto, 'subcontratos'),
    item(INACTIVA, TipoCatalogo.CategoriaGasto, 'antigua', false),
  );
  const obras = new ObrasRepositorioFake(
    clientes.filas,
    catalogos.filas,
  ).semilla(
    crearObra({ id: 1, estadoId: 2 }),
    crearObra({ id: 3, codigoCentroCosto: 'CC-003', estadoId: 5 }),
  );
  const proveedores = new ProveedoresRepositorioFake().semilla(
    crearProveedor({ id: 1 }),
    crearProveedor({ id: 9, rut: '22222222-2', eliminadoEn: new Date() }),
  );
  const repo = new ComprasRepositorioFake();
  repo.llamadas = obras.llamadas; // una sola bitácora para verificar el orden de bloqueo
  const libro = new MovimientosRepositorioFake();
  const reloj = new RelojFijo();
  const contexto = new ContextoCompras(
    obras as unknown as ObrasRepositorio,
    proveedores as unknown as ProveedoresRepositorio,
    catalogos as unknown as CatalogosRepositorio,
    reloj,
  );
  const movimientos = new MovimientosService(
    libro as unknown as MovimientosRepositorio,
    obras as unknown as ObrasRepositorio,
    catalogos as unknown as CatalogosRepositorio,
  );
  const parametros = {
    valorNumerico: () => Promise.resolve(19),
  } as unknown as ParametrosService;
  const r = repo as unknown as ComprasRepositorio;
  return {
    repo,
    libro,
    obras,
    movimientos,
    cotizaciones: new CotizacionesService(r, contexto),
    ots: new OrdenesTrabajoService(r, contexto),
    ocs: new OrdenesCompraService(r, contexto, parametros, movimientos),
  };
}

/** Matcher asimétrico de un `ErrorAplicacion` por código (y estado HTTP). */
const error = (codigo: string, status?: number): Error =>
  expect.objectContaining({
    response: expect.objectContaining({ codigo }),
    ...(status ? { status } : {}),
  }) as Error;

describe('compras (fase 4)', () => {
  let t: ReturnType<typeof preparar>;
  let aud: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    aud = {};
  });

  // -------------------------------------------------------------------------
  describe('cotizaciones', () => {
    const datos = {
      obraId: 1,
      proveedorId: 1,
      fecha: '2026-11-18',
      descripcion: 'Instalación eléctrica',
      montoNeto: 10_000_000,
    };

    it('crea un borrador con folio correlativo y la categoría «Subcontratos» por defecto', async () => {
      const a = await t.cotizaciones.crear(datos, actorUsuario, aud);
      const b = await t.cotizaciones.crear(datos, actorUsuario, {});
      expect(a).toMatchObject({
        folio: 'COT-000001',
        estado: E.Borrador,
        categoria: { codigo: 'subcontratos' },
        creadoPor: { id: 2, nombre: 'Camila Rojas' },
        ordenTrabajo: null,
      });
      expect(b.folio).toBe('COT-000002');
      expect(aud.despues).toMatchObject({ folio: 'COT-000001' });
    });

    it('valida obra abierta, proveedor vigente, categoría activa y validez', async () => {
      await expect(
        t.cotizaciones.crear({ ...datos, obraId: 3 }, actorUsuario, aud),
      ).rejects.toThrow(error('OBRA_CERRADA', 422));
      await expect(
        t.cotizaciones.crear({ ...datos, proveedorId: 9 }, actorUsuario, aud),
      ).rejects.toThrow(error('PROVEEDOR_NO_DISPONIBLE', 422));
      await expect(
        t.cotizaciones.crear(
          { ...datos, categoriaGastoId: INACTIVA },
          actorUsuario,
          aud,
        ),
      ).rejects.toThrow(error('CATEGORIA_NO_DISPONIBLE', 422));
      await expect(
        t.cotizaciones.crear(
          { ...datos, validezHasta: '2026-11-01' },
          actorUsuario,
          aud,
        ),
      ).rejects.toThrow(error('VALIDACION', 400));
    });

    it('flujo con no autoaprobación (D-10): el usuario creador no aprueba; otra persona o el admin sí', async () => {
      const c = await t.cotizaciones.crear(datos, actorUsuario, aud);
      const enviada = await t.cotizaciones.enviarARevision(
        c.id,
        { version: c.version },
        actorUsuario,
        {},
      );
      await expect(
        t.cotizaciones.aprobar(
          c.id,
          { version: enviada.version },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('AUTOAPROBACION_NO_PERMITIDA', 403));
      const aprobada = await t.cotizaciones.aprobar(
        c.id,
        { version: enviada.version, motivo: 'Conforme' },
        actorOtroUsuario,
        aud,
      );
      expect(aprobada).toMatchObject({
        estado: E.Aprobada,
        resueltoPor: { id: 3 },
        motivoResolucion: 'Conforme',
      });
      expect(aud.antes).toEqual({ estado: E.EnRevision });

      const propia = await t.cotizaciones.crear(datos, actorAdmin, {});
      const p = await t.cotizaciones.enviarARevision(
        propia.id,
        { version: 1 },
        actorAdmin,
        {},
      );
      await expect(
        t.cotizaciones.aprobar(
          propia.id,
          { version: p.version },
          actorAdmin,
          {},
        ),
      ).resolves.toMatchObject({ estado: E.Aprobada });
    });

    it('lo aprobado no se edita, el rechazo es final y la versión desactualizada da 409', async () => {
      const c = await t.cotizaciones.crear(datos, actorUsuario, aud);
      await expect(
        t.cotizaciones.actualizar(
          c.id,
          { version: 99, montoNeto: 5 },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('CONFLICTO_VERSION', 409));
      const e = await t.cotizaciones.enviarARevision(
        c.id,
        { version: 1 },
        actorUsuario,
        {},
      );
      await expect(
        t.cotizaciones.actualizar(
          c.id,
          { version: e.version, montoNeto: 5 },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('DOCUMENTO_NO_EDITABLE', 422));
      const r = await t.cotizaciones.rechazar(
        c.id,
        { version: e.version, motivo: 'Precio alto' },
        actorUsuario,
        {},
      );
      expect(r.estado).toBe(E.Rechazada);
      await expect(
        t.cotizaciones.enviarARevision(
          c.id,
          { version: r.version },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('TRANSICION_NO_VALIDA', 422));
    });

    it('solo los borradores se eliminan (borrado lógico)', async () => {
      const c = await t.cotizaciones.crear(datos, actorUsuario, aud);
      await t.cotizaciones.eliminar(
        c.id,
        { version: 1, motivo: 'Duplicada' },
        actorUsuario,
        aud,
      );
      expect(t.repo.cotizaciones.get(c.id)?.eliminadoEn).not.toBeNull();
      expect(aud.motivo).toBe('Duplicada');
      await expect(t.cotizaciones.obtener(c.id)).rejects.toThrow(
        error('COTIZACION_NO_ENCONTRADA', 404),
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('órdenes de trabajo', () => {
    beforeEach(() => {
      t.repo.semilla({
        cotizaciones: [
          crearCotizacion({
            id: 1,
            numero: 7,
            estado: E.Aprobada,
            montoNeto: 10_000_000,
          }),
          crearCotizacion({ id: 2, numero: 8, estado: E.EnRevision }),
        ],
      });
    });

    const hitos = [
      { descripcion: 'Anticipo', porcentaje: 33.33 },
      { descripcion: 'Avance', porcentaje: 33.33 },
      { descripcion: 'Entrega', porcentaje: 33.34 },
    ];

    it('nace de una cotización aprobada, con su monto y montos de hitos que suman exacto', async () => {
      const ot = await t.ots.crear(
        { cotizacionId: 1, hitos },
        actorUsuario,
        aud,
      );
      expect(ot).toMatchObject({
        folio: 'OT-000001',
        cotizacion: { folio: 'COT-000007' },
        montoNeto: 10_000_000,
        saldo: 10_000_000,
        descripcion: 'Instalación eléctrica',
      });
      expect(ot.hitos.map((h) => h.montoNeto)).toEqual([
        3_333_000, 3_333_000, 3_334_000,
      ]);
      // Orden de bloqueo: obra → cotización.
      expect(t.repo.llamadas).toEqual(['bloquear:1', 'bloquear-cotizacion:1']);
    });

    it('no nace de una cotización sin aprobar ni duplica la OT vigente de una cotización', async () => {
      await expect(
        t.ots.crear({ cotizacionId: 2 }, actorUsuario, aud),
      ).rejects.toThrow(error('COTIZACION_NO_APROBADA', 422));
      await t.ots.crear({ cotizacionId: 1 }, actorUsuario, aud);
      await expect(
        t.ots.crear({ cotizacionId: 1 }, actorUsuario, aud),
      ).rejects.toThrow(error('COTIZACION_CON_OT', 422));
    });

    it('los hitos deben sumar 100 % para enviar; en borrador no pueden superarlo', async () => {
      const ot = await t.ots.crear(
        { cotizacionId: 1, hitos: hitos.slice(0, 2) },
        actorUsuario,
        aud,
      );
      await expect(
        t.ots.enviarARevision(ot.id, { version: ot.version }, actorUsuario, {}),
      ).rejects.toThrow(error('HITOS_INCOMPLETOS', 422));
      await expect(
        t.ots.actualizar(
          ot.id,
          {
            version: ot.version,
            hitos: [
              { descripcion: 'Todo', porcentaje: 100 },
              { descripcion: 'Más', porcentaje: 1 },
            ],
          },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('VALIDACION', 400));
      const completa = await t.ots.actualizar(
        ot.id,
        { version: ot.version, hitos },
        actorUsuario,
        {},
      );
      const enviada = await t.ots.enviarARevision(
        ot.id,
        { version: completa.version },
        actorUsuario,
        {},
      );
      await expect(
        t.ots.aprobar(ot.id, { version: enviada.version }, actorUsuario, {}),
      ).rejects.toThrow(error('AUTOAPROBACION_NO_PERMITIDA', 403));
      const aprobada = await t.ots.aprobar(
        ot.id,
        { version: enviada.version },
        actorOtroUsuario,
        {},
      );
      expect(aprobada.estado).toBe(E.Aprobada);
      await expect(
        t.ots.actualizar(
          ot.id,
          { version: aprobada.version, hitos },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('DOCUMENTO_NO_EDITABLE', 422));
    });

    it('se anula solo sin OC vigentes, y eso libera la cotización', async () => {
      t.repo.semilla({
        ots: [
          crearOrdenTrabajo({
            id: 5,
            cotizacionId: 1,
            estado: E.Aprobada,
            resueltoPor: 3,
            resueltoEn: new Date(),
          }),
        ],
        hitos: [
          crearHito({
            id: 50,
            ordenTrabajoId: 5,
            porcentaje: 100,
            montoNeto: 10_000_000,
          }),
        ],
        ocs: [
          crearOrdenCompra({
            id: 9,
            tipo: TipoOrdenCompra.ParcialOt,
            ordenTrabajoId: 5,
            hitoId: 50,
            porcentaje: 10,
            montoNeto: 1_000_000,
            estado: E.Borrador,
          }),
        ],
      });
      await expect(
        t.ots.anular(
          5,
          { version: 1, motivo: 'Cambio de contratista' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('OT_CON_OC_VIGENTES', 422));
      t.repo.ocs.get(9)!.estado = E.Rechazada;
      const anulada = await t.ots.anular(
        5,
        { version: 1, motivo: 'Cambio de contratista' },
        actorUsuario,
        aud,
      );
      expect(anulada).toMatchObject({
        estado: E.Anulada,
        motivoAnulacion: 'Cambio de contratista',
        anuladoPor: { id: 2 },
      });
      await expect(
        t.ots.crear({ cotizacionId: 1 }, actorUsuario, {}),
      ).resolves.toMatchObject({ estado: E.Borrador });
    });
  });

  // -------------------------------------------------------------------------
  describe('órdenes de compra', () => {
    const otAprobada = (parcial = {}) =>
      crearOrdenTrabajo({
        id: 5,
        numero: 4,
        estado: E.Aprobada,
        resueltoPor: 3,
        resueltoEn: new Date(),
        ...parcial,
      });

    beforeEach(() => {
      t.repo.semilla({
        ots: [otAprobada()],
        hitos: [
          crearHito({
            id: 50,
            ordenTrabajoId: 5,
            numero: 1,
            porcentaje: 33.33,
            montoNeto: 3_333_000,
          }),
          crearHito({
            id: 51,
            ordenTrabajoId: 5,
            numero: 2,
            porcentaje: 66.67,
            montoNeto: 6_667_000,
          }),
        ],
      });
    });

    const parcial = (porcentaje: number, hitoId = 50) => ({
      tipo: TipoOrdenCompra.ParcialOt,
      ordenTrabajoId: 5,
      hitoId,
      porcentaje,
    });

    it('OC parcial: porcentaje de la OT con IVA, tope en el saldo del hito y la última lo completa exacto', async () => {
      const a = await t.ocs.crear(parcial(20), actorUsuario, aud);
      expect(a.ordenCompra).toMatchObject({
        folio: 'OC-000001',
        tipo: TipoOrdenCompra.ParcialOt,
        ordenTrabajo: { folio: 'OT-000004' },
        hito: { numero: 1 },
        montoNeto: 2_000_000,
        montoIva: 380_000,
        montoTotal: 2_380_000,
        categoria: { codigo: 'subcontratos' },
      });
      expect(a.ordenCompra.descripcion).toBe('Anticipo — 20 % de OT-000004');
      await expect(
        t.ocs.crear(parcial(13.34), actorUsuario, {}),
      ).rejects.toThrow(error('SALDO_OT_INSUFICIENTE', 422));
      const b = await t.ocs.crear(parcial(13.33), actorUsuario, {});
      expect(b.ordenCompra.montoNeto).toBe(1_333_000);
      // Orden de bloqueo: obra → OT.
      expect(t.repo.llamadas.slice(0, 2)).toEqual([
        'bloquear:1',
        'bloquear-ot:5',
      ]);
    });

    it('OC parcial solo de una OT aprobada y sin campos de materiales', async () => {
      t.repo.ots.set(
        5,
        otAprobada({
          estado: E.EnRevision,
          resueltoPor: null,
          resueltoEn: null,
        }),
      );
      await expect(t.ocs.crear(parcial(10), actorUsuario, aud)).rejects.toThrow(
        error('OT_NO_APROBADA', 422),
      );
      t.repo.ots.set(5, otAprobada());
      await expect(
        t.ocs.crear({ ...parcial(10), proveedorId: 1 }, actorUsuario, aud),
      ).rejects.toThrow(error('VALIDACION', 400));
      await expect(
        t.ocs.crear(parcial(10, 999), actorUsuario, aud),
      ).rejects.toThrow(error('HITO_NO_VALIDO', 422));
    });

    it('OC de materiales: neto desde las líneas, categoría «Materiales» y exige líneas para enviar', async () => {
      const vacia = await t.ocs.crear(
        {
          tipo: TipoOrdenCompra.Materiales,
          obraId: 1,
          proveedorId: 1,
          descripcion: 'Cemento',
        },
        actorUsuario,
        aud,
      );
      expect(vacia.ordenCompra).toMatchObject({
        montoNeto: 0,
        categoria: { codigo: 'materiales' },
      });
      await expect(
        t.ocs.enviarARevision(
          vacia.ordenCompra.id,
          { version: 1 },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('OC_SIN_MONTO', 422));
      const con = await t.ocs.actualizar(
        vacia.ordenCompra.id,
        {
          version: 1,
          afectaIva: false,
          lineas: [
            {
              descripcion: 'Cemento',
              unidad: 'saco',
              cantidad: 120,
              precioUnitario: 6500.5,
            },
            {
              descripcion: 'Fierro',
              unidad: 'barra',
              cantidad: 10.5,
              precioUnitario: 8990,
            },
          ],
        },
        actorUsuario,
        {},
      );
      expect(con.ordenCompra).toMatchObject({
        montoNeto: 874_455,
        montoIva: 0,
        montoTotal: 874_455,
      });
      expect(con.ordenCompra.lineas.map((l) => l.total)).toEqual([
        780_060, 94_395,
      ]);
    });

    it('aprobar registra el compromiso (D-10) y una OC aprobada no se edita', async () => {
      const { ordenCompra: oc } = await t.ocs.crear(
        parcial(20),
        actorUsuario,
        aud,
      );
      const enviada = await t.ocs.enviarARevision(
        oc.id,
        { version: oc.version },
        actorUsuario,
        {},
      );
      const v = enviada.ordenCompra.version;
      await expect(
        t.ocs.aprobar(oc.id, { version: v }, actorUsuario, {}),
      ).rejects.toThrow(error('AUTOAPROBACION_NO_PERMITIDA', 403));
      expect(t.libro.filas).toHaveLength(0);
      t.repo.llamadas.length = 0;
      const aprobada = await t.ocs.aprobar(
        oc.id,
        { version: v },
        actorOtroUsuario,
        aud,
      );
      // Orden de bloqueo: obra → OT → OC.
      expect(t.repo.llamadas).toEqual([
        'bloquear:1',
        'bloquear-ot:5',
        'bloquear-oc:' + oc.id,
      ]);
      expect(aprobada.ordenCompra.estado).toBe(E.Aprobada);
      expect(aprobada.movimientos).toEqual([
        expect.objectContaining({
          tipo: 'compromiso',
          montoClp: 2_000_000,
          fecha: '2026-11-19',
          reversaDeId: null,
          descripcion: 'Compromiso OC-000001',
        }),
      ]);
      await expect(t.movimientos.resumenCompromisos(1)).resolves.toMatchObject({
        totalClp: 2_000_000,
        porCategoria: [
          { categoria: { codigo: 'subcontratos' }, totalClp: 2_000_000 },
        ],
      });
      await expect(
        t.ocs.actualizar(
          oc.id,
          { version: aprobada.ordenCompra.version, descripcion: 'x' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('DOCUMENTO_NO_EDITABLE', 422));
    });

    it('anular una OC aprobada registra la reversa, libera el saldo y no se repite', async () => {
      const { ordenCompra: oc } = await t.ocs.crear(
        parcial(33.33),
        actorUsuario,
        aud,
      );
      const e = await t.ocs.enviarARevision(
        oc.id,
        { version: 1 },
        actorUsuario,
        {},
      );
      const a = await t.ocs.aprobar(
        oc.id,
        { version: e.ordenCompra.version },
        actorAdmin,
        {},
      );
      await expect(
        t.ocs.crear(parcial(0.01), actorUsuario, {}),
      ).rejects.toThrow(error('SALDO_OT_INSUFICIENTE', 422));
      const anulada = await t.ocs.anular(
        oc.id,
        { version: a.ordenCompra.version, motivo: 'Hito equivocado' },
        actorUsuario,
        aud,
      );
      expect(anulada.ordenCompra).toMatchObject({
        estado: E.Anulada,
        motivoAnulacion: 'Hito equivocado',
      });
      expect(anulada.movimientos.map((m) => m.montoClp)).toEqual([
        3_333_000, -3_333_000,
      ]);
      expect(anulada.movimientos[1].reversaDeId).toBe(
        anulada.movimientos[0].id,
      );
      await expect(t.movimientos.resumenCompromisos(1)).resolves.toMatchObject({
        totalClp: 0,
        porCategoria: [],
      });
      await expect(
        t.ocs.crear(parcial(33.33), actorUsuario, {}),
      ).resolves.toBeDefined();
      await expect(
        t.ocs.anular(
          oc.id,
          { version: anulada.ordenCompra.version, motivo: 'Otra vez' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('TRANSICION_NO_VALIDA', 422));
    });

    it('recepción: solo de una OC aprobada, sin fechas futuras; una OC recibida no se anula', async () => {
      t.repo.semilla({
        ocs: [
          crearOrdenCompra({
            id: 30,
            estado: E.Aprobada,
            montoNeto: 1000,
            montoTotal: 1000,
            enviadoPor: 2,
            enviadoEn: new Date(),
            resueltoPor: 3,
            resueltoEn: new Date(),
          }),
        ],
      });
      await expect(
        t.ocs.recibir(
          30,
          { version: 1, fechaRecepcion: '2026-11-20' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('VALIDACION', 400));
      const r = await t.ocs.recibir(
        30,
        { version: 1, observacion: 'Conforme' },
        actorUsuario,
        aud,
      );
      expect(r.ordenCompra).toMatchObject({
        estado: E.Recibida,
        fechaRecepcion: '2026-11-19',
        observacionRecepcion: 'Conforme',
        recibidoPor: { id: 2 },
      });
      await expect(
        t.ocs.anular(
          30,
          { version: r.ordenCompra.version, motivo: 'No' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('TRANSICION_NO_VALIDA', 422));
    });

    it('en obras cerradas todo es de solo lectura', async () => {
      t.repo.semilla({ ocs: [crearOrdenCompra({ id: 31, obraId: 3 })] });
      await expect(
        t.ocs.actualizar(
          31,
          { version: 1, descripcion: 'x y' },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('OBRA_CERRADA', 422));
      await expect(
        t.ocs.crear(
          {
            tipo: TipoOrdenCompra.Materiales,
            obraId: 3,
            proveedorId: 1,
            descripcion: 'x y',
          },
          actorUsuario,
          {},
        ),
      ).rejects.toThrow(error('OBRA_CERRADA', 422));
    });
  });
});
