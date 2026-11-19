import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogosRepositorioFake,
  ClientesRepositorioFake,
  ObrasRepositorioFake,
  RelojFijo,
  UfRepositorioFake,
  actorAdmin,
  actorOtroUsuario,
  actorUsuario,
  crearCliente,
  crearItemCatalogo,
  crearObra,
  crearValorUf,
} from '../../../test/utils/fakes-maestros.js';
import {
  PresupuestosRepositorioFake,
  crearPartida,
  crearVersionPresupuesto,
} from '../../../test/utils/fakes-presupuestos.js';
import type { ContextoAuditoria } from '../../common/auth/actor.js';
import type { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import { TipoCatalogo } from '../catalogos/catalogos.tipos.js';
import type { ObrasRepositorio } from '../obras/obras.repositorio.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import type { UfRepositorio } from '../uf/uf.repositorio.js';
import { UfService } from '../uf/uf.service.js';
import type { PresupuestosRepositorio } from './presupuestos.repositorio.js';
import { PresupuestosService } from './presupuestos.service.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';

const estadoObra = (id: number, codigo: string) =>
  crearItemCatalogo({
    id,
    tipo: TipoCatalogo.EstadoObra,
    codigo,
    nombre: codigo,
    orden: id,
  });
const familia = (id: number, codigo: string, orden: number, activo = true) =>
  crearItemCatalogo({
    id,
    tipo: TipoCatalogo.FamiliaPartida,
    codigo,
    nombre: codigo.replace('_', ' '),
    orden,
    activo,
    protegido: false,
  });

const FAMILIA_GRUESA = 10;
const FAMILIA_INSTALACIONES = 11;
const FAMILIA_INACTIVA = 12;

function preparar() {
  const clientes = new ClientesRepositorioFake().semilla(crearCliente());
  const catalogos = new CatalogosRepositorioFake().semilla(
    estadoObra(1, 'en_preparacion'),
    estadoObra(2, 'activa'),
    estadoObra(5, 'cerrada'),
    familia(FAMILIA_GRUESA, 'obra_gruesa', 20),
    familia(FAMILIA_INSTALACIONES, 'instalaciones', 30),
    familia(FAMILIA_INACTIVA, 'antigua', 40, false),
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
  const repo = new PresupuestosRepositorioFake();
  // Una sola bitácora de bloqueos para verificar el orden obra → versión.
  repo.llamadas = obras.llamadas;
  const servicio = new PresupuestosService(
    repo as unknown as PresupuestosRepositorio,
    obras as unknown as ObrasRepositorio,
    catalogos as unknown as CatalogosRepositorio,
    new UfService(uf as unknown as UfRepositorio, reloj),
    reloj,
  );
  return { servicio, repo, obras, catalogos, uf };
}

const datosPartida = (parcial: object = {}) => ({
  codigo: '1.1',
  familiaId: FAMILIA_GRUESA,
  descripcion: 'Radier de hormigón',
  unidad: 'm2',
  cantidad: 10,
  precioUnitario: 1000,
  ...parcial,
});

describe('PresupuestosService', () => {
  let t: ReturnType<typeof preparar>;
  let auditoria: ContextoAuditoria;
  beforeEach(() => {
    t = preparar();
    auditoria = {};
  });

  /** Versión borrador con dos partidas ya calculadas (total 10.000 + 5.000). */
  const semillaBorrador = (parcial: object = {}, id = 1) => {
    t.repo.semillaVersion(
      crearVersionPresupuesto({
        id,
        total: 15_000,
        totalClp: 15_000,
        cantidadPartidas: 2,
        ...parcial,
      }),
    );
    t.repo.semillaPartida(
      crearPartida({ id: id * 10 + 1, versionId: id, orden: 1, codigo: '1.1' }),
      crearPartida({
        id: id * 10 + 2,
        versionId: id,
        orden: 2,
        codigo: '1.2',
        familiaId: FAMILIA_INSTALACIONES,
        cantidad: 5,
        total: 5_000,
        totalClp: 5_000,
      }),
    );
  };

  const enEstado = (estado: EstadoPresupuesto, extra: object = {}) =>
    semillaBorrador({
      estado,
      enviadoEn: new Date(),
      enviadoPor: 2,
      ...(estado === EstadoPresupuesto.Aprobado ||
      estado === EstadoPresupuesto.Rechazado
        ? { resueltoEn: new Date(), resueltoPor: 3, motivoResolucion: 'x' }
        : {}),
      ...extra,
    });

  describe('crear', () => {
    it('crea un borrador vacío con el correlativo siguiente de la obra', async () => {
      const r = await t.servicio.crear(1, {}, actorUsuario, auditoria);
      expect(r).toMatchObject({
        id: 1,
        obraId: 1,
        numero: 1,
        estado: 'borrador',
        vigente: false,
        moneda: 'CLP',
        total: 0,
        totalClp: 0,
        cantidadPartidas: 0,
        copiadaDeId: null,
        creadoPor: { id: 2, nombre: 'Camila Rojas' },
        version: 1,
      });
      expect(auditoria.entidadId).toBe(1);

      const segunda = await t.servicio.crear(
        1,
        { descripcion: 'Adicionales' },
        actorUsuario,
        {},
      );
      expect(segunda).toMatchObject({ numero: 2, descripcion: 'Adicionales' });
      // El correlativo es por obra.
      const otraObra = await t.servicio.crear(2, {}, actorUsuario, {});
      expect(otraObra.numero).toBe(1);
    });

    it('la obra debe existir y no estar cerrada', async () => {
      await expect(
        t.servicio.crear(99, {}, actorUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_NO_ENCONTRADA' } });
      await expect(
        t.servicio.crear(3, {}, actorUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
    });

    it('bloquea la obra para numerar sin carreras', async () => {
      await t.servicio.crear(1, {}, actorUsuario, {});
      expect(t.obras.llamadas).toEqual(['bloquear:1']);
    });

    it('copia las partidas de otra versión de la misma obra sin tocar el original', async () => {
      enEstado(EstadoPresupuesto.Aprobado, { vigente: true });
      const r = await t.servicio.crear(
        1,
        { copiarDeId: 1 },
        actorOtroUsuario,
        {},
      );
      expect(r).toMatchObject({
        numero: 2,
        estado: 'borrador',
        vigente: false,
        copiadaDeId: 1,
        copiadaDeNumero: 1,
        total: 15_000,
        cantidadPartidas: 2,
        creadoPor: { id: 3 },
      });
      const copiadas = await t.repo.listarPartidas(r.id);
      expect(copiadas.map((p) => [p.codigo, p.orden, p.total])).toEqual([
        ['1.1', 1, 10_000],
        ['1.2', 2, 5_000],
      ]);
      // El original sigue igual y vigente.
      expect((await t.repo.buscarVersion(1))!.vigente).toBe(true);
      expect(await t.repo.listarPartidas(1)).toHaveLength(2);
    });

    it('no copia desde una versión de otra obra ni inexistente', async () => {
      enEstado(EstadoPresupuesto.Aprobado);
      await expect(
        t.servicio.crear(2, { copiarDeId: 1 }, actorUsuario, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'VERSION_ORIGEN_NO_VALIDA' },
      });
      await expect(
        t.servicio.crear(1, { copiarDeId: 77 }, actorUsuario, {}),
      ).rejects.toMatchObject({
        response: { codigo: 'VERSION_ORIGEN_NO_VALIDA' },
      });
    });

    it('una obra en UF crea la versión en UF con el valor de la UF de hoy', async () => {
      const r = await t.servicio.crear(2, {}, actorUsuario, {});
      expect(r).toMatchObject({
        moneda: 'UF',
        valorUf: 40_000,
        fechaValorUf: '2026-11-19',
      });
    });

    it('si falta el valor de la UF, 422 UF_NO_DISPONIBLE', async () => {
      t.uf.valores.clear();
      await expect(
        t.servicio.crear(2, {}, actorUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'UF_NO_DISPONIBLE' } });
    });

    it('al copiar una versión en UF se revalúa al valor de la UF de hoy', async () => {
      semillaBorrador({
        obraId: 2,
        estado: EstadoPresupuesto.Aprobado,
        moneda: MonedaContrato.Uf,
        valorUf: 30_000,
        fechaValorUf: '2026-10-01',
        total: 20,
        totalClp: 600_000,
      });
      t.repo.partidas.clear();
      t.repo.semillaPartida(
        crearPartida({
          id: 1,
          versionId: 1,
          cantidad: 4,
          precioUnitario: 5,
          total: 20,
          totalClp: 600_000,
        }),
      );
      const r = await t.servicio.crear(2, { copiarDeId: 1 }, actorUsuario, {});
      expect(r).toMatchObject({ moneda: 'UF', valorUf: 40_000, total: 20 });
      expect(r.totalClp).toBe(800_000);
    });
  });

  describe('partidas', () => {
    beforeEach(() => semillaBorrador());

    it('crea una partida con el total calculado y actualiza los totales de la versión', async () => {
      const r = await t.servicio.crearPartida(
        1,
        datosPartida({
          codigo: '2.1',
          cantidad: 120.5,
          precioUnitario: 18_500,
        }),
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        codigo: '2.1',
        orden: 3,
        familia: { id: FAMILIA_GRUESA, codigo: 'obra_gruesa' },
        total: 2_229_250,
        totalClp: 2_229_250,
        version: 1,
      });
      expect(auditoria.entidadId).toBe(r.id);
      const version = (await t.repo.buscarVersion(1))!;
      expect(version).toMatchObject({
        total: 2_244_250,
        totalClp: 2_244_250,
        cantidadPartidas: 3,
        version: 2,
        updatedBy: actorUsuario.id,
      });
    });

    it('un código repetido en la versión es 409 PARTIDA_DUPLICADA', async () => {
      await expect(
        t.servicio.crearPartida(1, datosPartida(), actorUsuario, {}),
      ).rejects.toMatchObject({
        status: 409,
        response: { codigo: 'PARTIDA_DUPLICADA' },
      });
    });

    it('la familia debe existir en el catálogo y estar activa', async () => {
      for (const familiaId of [FAMILIA_INACTIVA, 999]) {
        await expect(
          t.servicio.crearPartida(
            1,
            datosPartida({ codigo: '9', familiaId }),
            actorUsuario,
            {},
          ),
        ).rejects.toMatchObject({
          response: { codigo: 'FAMILIA_NO_DISPONIBLE' },
        });
      }
    });

    it('rechaza cantidad y precio inválidos según la moneda (400)', async () => {
      await expect(
        t.servicio.crearPartida(
          1,
          datosPartida({ codigo: '9', precioUnitario: 10.5 }),
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: {
          detalles: [
            { campo: 'precioUnitario', errores: [expect.any(String)] },
          ],
        },
      });
      await expect(
        t.servicio.crearPartida(
          1,
          datosPartida({ codigo: '9', cantidad: 0 }),
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({
        response: { detalles: [{ campo: 'cantidad' }] },
      });
    });

    it('en una versión en UF acepta decimales y calcula el equivalente en pesos', async () => {
      const uf = await t.servicio.crear(2, {}, actorUsuario, {});
      const r = await t.servicio.crearPartida(
        uf.id,
        datosPartida({ cantidad: 2.5, precioUnitario: 120.1234 }),
        actorUsuario,
        {},
      );
      expect(r.total).toBe(300.3085);
      expect(r.totalClp).toBe(12_012_340);
      const version = (await t.repo.buscarVersion(uf.id))!;
      expect(version).toMatchObject({ total: 300.3085, totalClp: 12_012_340 });
    });

    it('modifica una partida, recalcula y sube su versión y la de la versión', async () => {
      const r = await t.servicio.actualizarPartida(
        1,
        11,
        { cantidad: 20, version: 1 },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({ cantidad: 20, total: 20_000, version: 2 });
      expect(auditoria.antes).toMatchObject({ cantidad: 10, total: 10_000 });
      expect(auditoria.despues).toMatchObject({ cantidad: 20 });
      expect(await t.repo.buscarVersion(1)).toMatchObject({
        total: 25_000,
        totalClp: 25_000,
        version: 2,
      });
    });

    it('puede cambiar la familia y el código; no a uno ya usado', async () => {
      const r = await t.servicio.actualizarPartida(
        1,
        11,
        { familiaId: FAMILIA_INSTALACIONES, codigo: '1.9', version: 1 },
        actorUsuario,
        {},
      );
      expect(r).toMatchObject({
        codigo: '1.9',
        familia: { id: FAMILIA_INSTALACIONES },
      });
      await expect(
        t.servicio.actualizarPartida(
          1,
          11,
          { codigo: '1.2', version: 2 },
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'PARTIDA_DUPLICADA' } });
    });

    it('409 con la versión vigente si la partida cambió (control optimista)', async () => {
      await t.servicio.actualizarPartida(
        1,
        11,
        { cantidad: 11, version: 1 },
        actorUsuario,
        {},
      );
      await expect(
        t.servicio.actualizarPartida(
          1,
          11,
          { cantidad: 12, version: 1 },
          actorUsuario,
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

    it('los campos obligatorios no se vacían con null; la partida debe existir', async () => {
      await expect(
        t.servicio.actualizarPartida(
          1,
          11,
          { descripcion: null, version: 1 } as never,
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({
        response: { detalles: [{ campo: 'descripcion' }] },
      });
      await expect(
        t.servicio.actualizarPartida(
          1,
          99,
          { cantidad: 2, version: 1 },
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({
        response: { codigo: 'PARTIDA_NO_ENCONTRADA' },
      });
      // Una partida de otra versión tampoco se puede tocar desde esta.
      semillaBorrador({}, 2);
      await expect(
        t.servicio.actualizarPartida(
          1,
          21,
          { cantidad: 2, version: 1 },
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({
        response: { codigo: 'PARTIDA_NO_ENCONTRADA' },
      });
    });

    it('elimina una partida y recalcula los totales', async () => {
      await t.servicio.eliminarPartida(
        1,
        12,
        { version: 1 },
        actorUsuario,
        auditoria,
      );
      expect(auditoria.antes).toMatchObject({ codigo: '1.2' });
      expect(await t.repo.listarPartidas(1)).toHaveLength(1);
      expect(await t.repo.buscarVersion(1)).toMatchObject({
        total: 10_000,
        cantidadPartidas: 1,
      });
      await expect(
        t.servicio.eliminarPartida(1, 11, { version: 5 }, actorUsuario, {}),
      ).rejects.toMatchObject({ status: 409 });
    });

    it.each([
      EstadoPresupuesto.EnRevision,
      EstadoPresupuesto.Aprobado,
      EstadoPresupuesto.Rechazado,
    ])(
      'una versión %s es inmutable: no admite cambios en sus partidas',
      async (estado) => {
        t = preparar();
        enEstado(estado, { vigente: estado === EstadoPresupuesto.Aprobado });
        const esperado = { response: { codigo: 'VERSION_NO_EDITABLE' } };
        await expect(
          t.servicio.crearPartida(
            1,
            datosPartida({ codigo: '9' }),
            actorUsuario,
            {},
          ),
        ).rejects.toMatchObject(esperado);
        await expect(
          t.servicio.actualizarPartida(
            1,
            11,
            { cantidad: 2, version: 1 },
            actorUsuario,
            {},
          ),
        ).rejects.toMatchObject(esperado);
        await expect(
          t.servicio.eliminarPartida(1, 11, { version: 1 }, actorUsuario, {}),
        ).rejects.toMatchObject(esperado);
        await expect(
          t.servicio.actualizar(
            1,
            { version: 1, descripcion: 'x' },
            actorUsuario,
            {},
          ),
        ).rejects.toMatchObject(esperado);
        await expect(
          t.servicio.eliminar(1, { version: 1 }, actorUsuario, {}),
        ).rejects.toMatchObject(esperado);
        // Nada cambió.
        expect(await t.repo.listarPartidas(1)).toHaveLength(2);
        expect((await t.repo.buscarVersion(1))!.version).toBe(1);
      },
    );

    it('una obra cerrada es de solo lectura', async () => {
      t = preparar();
      semillaBorrador({ obraId: 3 });
      await expect(
        t.servicio.crearPartida(
          1,
          datosPartida({ codigo: '9' }),
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
    });

    it('la versión debe existir', async () => {
      await expect(
        t.servicio.crearPartida(77, datosPartida(), actorUsuario, {}),
      ).rejects.toMatchObject({
        status: 404,
        response: { codigo: 'PRESUPUESTO_NO_ENCONTRADO' },
      });
    });
  });

  describe('versión: datos y borrado', () => {
    it('modifica la descripción de un borrador con control de versión', async () => {
      semillaBorrador();
      const r = await t.servicio.actualizar(
        1,
        { version: 1, descripcion: 'Con adicionales' },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({ descripcion: 'Con adicionales', version: 2 });
      expect(auditoria.antes).toEqual({ descripcion: null });
      await expect(
        t.servicio.actualizar(
          1,
          { version: 1, descripcion: 'otra' },
          actorUsuario,
          {},
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('elimina lógicamente un borrador: deja de listarse y de consultarse', async () => {
      semillaBorrador();
      await t.servicio.eliminar(
        1,
        { version: 1, motivo: 'Duplicado' },
        actorUsuario,
        auditoria,
      );
      expect(auditoria.motivo).toBe('Duplicado');
      expect(auditoria.antes).toMatchObject({ id: 1, estado: 'borrador' });
      expect(t.repo.versiones.get(1)!.eliminadoEn).not.toBeNull();
      expect(await t.servicio.listarVersiones(1)).toEqual([]);
      await expect(t.servicio.obtener(1)).rejects.toMatchObject({
        status: 404,
      });
      // El número no se reutiliza.
      const nueva = await t.servicio.crear(1, {}, actorUsuario, {});
      expect(nueva.numero).toBe(2);
    });
  });

  describe('flujo de aprobación', () => {
    it('envía un borrador a revisión y registra quién y cuándo', async () => {
      semillaBorrador();
      const r = await t.servicio.enviarARevision(
        1,
        { version: 1 },
        actorUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        estado: 'en_revision',
        enviadoPor: { id: 2 },
        version: 2,
      });
      expect(r.enviadoEn).toBe('2026-11-19T15:00:00.000Z');
      expect(auditoria.antes).toEqual({ estado: 'borrador' });
    });

    it('no envía una versión sin partidas, ni con versión desactualizada, ni dos veces', async () => {
      t.repo.semillaVersion(crearVersionPresupuesto({ id: 5 }));
      await expect(
        t.servicio.enviarARevision(5, { version: 1 }, actorUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'PRESUPUESTO_VACIO' } });

      semillaBorrador();
      await expect(
        t.servicio.enviarARevision(1, { version: 9 }, actorUsuario, {}),
      ).rejects.toMatchObject({
        status: 409,
        response: { detalles: [{ versionActual: 1 }] },
      });
      await t.servicio.enviarARevision(1, { version: 1 }, actorUsuario, {});
      await expect(
        t.servicio.enviarARevision(1, { version: 2 }, actorUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
    });

    it('aprueba otra persona: queda aprobada, vigente y con quién/cuándo/comentario', async () => {
      enEstado(EstadoPresupuesto.EnRevision);
      const r = await t.servicio.aprobar(
        1,
        { version: 1, motivo: 'Conforme' },
        actorOtroUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        estado: 'aprobado',
        vigente: true,
        resueltoPor: { id: 3, nombre: 'Tomás Silva' },
        motivoResolucion: 'Conforme',
        version: 2,
      });
      expect(r.resueltoEn).toBe('2026-11-19T15:00:00.000Z');
      expect(auditoria.motivo).toBe('Conforme');
      expect(auditoria.despues).toMatchObject({ reemplazaVersionId: null });
    });

    it('D-10: un usuario no puede aprobar lo que él creó', async () => {
      enEstado(EstadoPresupuesto.EnRevision, { createdBy: actorUsuario.id });
      await expect(
        t.servicio.aprobar(1, { version: 1 }, actorUsuario, {}),
      ).rejects.toMatchObject({
        status: 403,
        response: { codigo: 'AUTOAPROBACION_NO_PERMITIDA' },
      });
      expect((await t.repo.buscarVersion(1))!.estado).toBe('en_revision');
    });

    it('D-10: el admin sí puede aprobar lo que creó', async () => {
      enEstado(EstadoPresupuesto.EnRevision, { createdBy: actorAdmin.id });
      const r = await t.servicio.aprobar(1, { version: 1 }, actorAdmin, {});
      expect(r).toMatchObject({ estado: 'aprobado', vigente: true });
    });

    it('solo se aprueba una versión en revisión', async () => {
      semillaBorrador();
      await expect(
        t.servicio.aprobar(1, { version: 1 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
      await expect(
        t.servicio.aprobar(99, { version: 1 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('409 si la versión cambió desde que el aprobador la vio', async () => {
      enEstado(EstadoPresupuesto.EnRevision);
      await expect(
        t.servicio.aprobar(1, { version: 7 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('no se aprueba dos veces la misma versión', async () => {
      enEstado(EstadoPresupuesto.EnRevision);
      await t.servicio.aprobar(1, { version: 1 }, actorOtroUsuario, {});
      await expect(
        t.servicio.aprobar(1, { version: 2 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
    });

    it('una sola versión vigente por obra: aprobar otra reemplaza a la anterior', async () => {
      enEstado(EstadoPresupuesto.Aprobado, { vigente: true, numero: 1 });
      semillaBorrador(
        {
          estado: EstadoPresupuesto.EnRevision,
          numero: 2,
          enviadoEn: new Date(),
          enviadoPor: 2,
        },
        2,
      );
      const r = await t.servicio.aprobar(
        2,
        { version: 1 },
        actorOtroUsuario,
        auditoria,
      );
      expect(r).toMatchObject({ numero: 2, estado: 'aprobado', vigente: true });
      expect(auditoria.despues).toMatchObject({ reemplazaVersionId: 1 });

      const anterior = (await t.repo.buscarVersion(1))!;
      expect(anterior).toMatchObject({
        estado: 'aprobado',
        vigente: false,
        version: 2,
      });
      const vigentes = [...t.repo.versiones.values()].filter((v) => v.vigente);
      expect(vigentes.map((v) => v.id)).toEqual([2]);
    });

    it('otra obra mantiene su propia versión vigente', async () => {
      enEstado(EstadoPresupuesto.Aprobado, { vigente: true });
      semillaBorrador(
        {
          obraId: 2,
          estado: EstadoPresupuesto.EnRevision,
          enviadoEn: new Date(),
          enviadoPor: 2,
        },
        2,
      );
      await t.servicio.aprobar(2, { version: 1 }, actorOtroUsuario, {});
      expect((await t.repo.buscarVersion(1))!.vigente).toBe(true);
      expect((await t.repo.buscarVersion(2))!.vigente).toBe(true);
    });

    it('la aprobación bloquea primero la obra y luego la versión (FOR UPDATE, sin interbloqueos)', async () => {
      enEstado(EstadoPresupuesto.EnRevision);
      await t.servicio.aprobar(1, { version: 1 }, actorOtroUsuario, {});
      expect(t.obras.llamadas).toEqual(['bloquear:1', 'bloquear-version:1']);
    });

    it('una obra cerrada no admite aprobar, enviar ni rechazar', async () => {
      enEstado(EstadoPresupuesto.EnRevision, { obraId: 3 });
      await expect(
        t.servicio.aprobar(1, { version: 1 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
      await expect(
        t.servicio.rechazar(
          1,
          { version: 1, motivo: 'No' },
          actorOtroUsuario,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'OBRA_CERRADA' } });
    });

    it('rechaza con motivo: queda rechazada, sin vigencia y es final', async () => {
      enEstado(EstadoPresupuesto.EnRevision);
      const r = await t.servicio.rechazar(
        1,
        { version: 1, motivo: 'Faltan partidas de instalaciones' },
        actorOtroUsuario,
        auditoria,
      );
      expect(r).toMatchObject({
        estado: 'rechazado',
        vigente: false,
        resueltoPor: { id: 3 },
        motivoResolucion: 'Faltan partidas de instalaciones',
      });
      expect(auditoria.motivo).toBe('Faltan partidas de instalaciones');
      await expect(
        t.servicio.aprobar(1, { version: 2 }, actorOtroUsuario, {}),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
      await expect(
        t.servicio.rechazar(
          1,
          { version: 2, motivo: 'otra vez' },
          actorOtroUsuario,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
    });

    it('quien creó la versión sí puede rechazarla (retirarla)', async () => {
      enEstado(EstadoPresupuesto.EnRevision, { createdBy: actorUsuario.id });
      const r = await t.servicio.rechazar(
        1,
        { version: 1, motivo: 'Me equivoqué de obra' },
        actorUsuario,
        {},
      );
      expect(r.estado).toBe('rechazado');
    });

    it('no se rechaza un borrador', async () => {
      semillaBorrador();
      await expect(
        t.servicio.rechazar(
          1,
          { version: 1, motivo: 'No' },
          actorOtroUsuario,
          {},
        ),
      ).rejects.toMatchObject({ response: { codigo: 'TRANSICION_NO_VALIDA' } });
    });

    it('una versión rechazada se corrige copiándola en un borrador nuevo', async () => {
      enEstado(EstadoPresupuesto.Rechazado);
      const r = await t.servicio.crear(1, { copiarDeId: 1 }, actorUsuario, {});
      expect(r).toMatchObject({
        estado: 'borrador',
        copiadaDeId: 1,
        cantidadPartidas: 2,
      });
    });
  });

  describe('consultas', () => {
    it('lista las versiones de una obra de la más reciente a la más antigua', async () => {
      semillaBorrador({ numero: 1 }, 1);
      semillaBorrador({ numero: 2, copiadaDeId: 1 }, 2);
      semillaBorrador({ obraId: 2, numero: 1 }, 3);
      const lista = await t.servicio.listarVersiones(1);
      expect(lista.map((v) => v.numero)).toEqual([2, 1]);
      expect(lista[0]).toMatchObject({
        copiadaDeNumero: 1,
        creadoPor: { nombre: 'Camila Rojas' },
      });
      await expect(t.servicio.listarVersiones(99)).rejects.toMatchObject({
        response: { codigo: 'OBRA_NO_ENCONTRADA' },
      });
    });

    it('el detalle incluye partidas y totales por familia en el orden del catálogo', async () => {
      semillaBorrador();
      const d = await t.servicio.obtener(1);
      expect(d.version).toMatchObject({ id: 1, total: 15_000 });
      expect(d.partidas.map((p) => p.codigo)).toEqual(['1.1', '1.2']);
      expect(d.totalesPorFamilia).toEqual([
        {
          familia: {
            id: FAMILIA_GRUESA,
            codigo: 'obra_gruesa',
            nombre: 'obra gruesa',
          },
          cantidadPartidas: 1,
          total: 10_000,
          totalClp: 10_000,
        },
        {
          familia: {
            id: FAMILIA_INSTALACIONES,
            codigo: 'instalaciones',
            nombre: 'instalaciones',
          },
          cantidadPartidas: 1,
          total: 5_000,
          totalClp: 5_000,
        },
      ]);
    });

    describe('comparación', () => {
      beforeEach(() => {
        enEstado(EstadoPresupuesto.Aprobado, { vigente: true });
        semillaBorrador({ numero: 2 }, 2);
        t.repo.partidas.get(21)!.cantidad = 30;
        t.repo.partidas.get(21)!.total = 30_000;
        t.repo.partidas.get(21)!.totalClp = 30_000;
        t.repo.partidas.delete(22);
        t.repo.semillaPartida(
          crearPartida({
            id: 23,
            versionId: 2,
            orden: 3,
            codigo: '3.1',
            total: 7_000,
            totalClp: 7_000,
          }),
        );
      });

      it('compara contra la versión vigente por defecto', async () => {
        const c = await t.servicio.comparar(2, undefined);
        expect(c.base.id).toBe(1);
        expect(c.nueva.id).toBe(2);
        expect(
          c.filas.map((f) => [f.codigo, f.cambio, f.diferenciaClp]),
        ).toEqual([
          ['1.1', 'modificada', 20_000],
          ['3.1', 'nueva', 7_000],
          ['1.2', 'eliminada', -5_000],
        ]);
        expect(c).toMatchObject({
          totalBaseClp: 15_000,
          totalNuevoClp: 37_000,
          diferenciaClp: 22_000,
          nuevas: 1,
          eliminadas: 1,
          modificadas: 1,
          sinCambios: 0,
        });
        expect(c.filas[2].descripcion).toBe('Radier');
        expect(c.filas[2].nueva).toBeNull();
      });

      it('sin versión vigente ni base explícita, 422 SIN_VERSION_BASE', async () => {
        t.repo.versiones.get(1)!.vigente = false;
        await expect(t.servicio.comparar(2, undefined)).rejects.toMatchObject({
          response: { codigo: 'SIN_VERSION_BASE' },
        });
        // Con una base explícita sí se puede.
        expect((await t.servicio.comparar(2, 1)).base.id).toBe(1);
      });

      it('no compara consigo misma, con versiones de otra obra ni con una inexistente', async () => {
        await expect(t.servicio.comparar(1, 1)).rejects.toMatchObject({
          response: { codigo: 'COMPARACION_CONSIGO_MISMA' },
        });
        semillaBorrador({ obraId: 2 }, 3);
        await expect(t.servicio.comparar(2, 3)).rejects.toMatchObject({
          response: { codigo: 'VERSIONES_DE_OBRAS_DISTINTAS' },
        });
        await expect(t.servicio.comparar(2, 99)).rejects.toMatchObject({
          status: 404,
        });
        await expect(t.servicio.comparar(99, undefined)).rejects.toMatchObject({
          status: 404,
        });
      });
    });

    it('exporta una versión a Excel con nombre seguro', async () => {
      semillaBorrador();
      const archivo = await t.servicio.exportar(1);
      expect(archivo.nombre).toBe('presupuesto-CC-001-v1.xlsx');
      expect(archivo.contenido.subarray(0, 2).toString()).toBe('PK');
      await expect(t.servicio.exportar(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
