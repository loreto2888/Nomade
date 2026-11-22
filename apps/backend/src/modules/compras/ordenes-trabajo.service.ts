import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { sumar } from '../../common/dinero/decimal.js';
import {
  exigirPermiso,
  exigirPuedeAprobar,
} from '../../common/permisos/autoaprobacion.js';
import { aUsuarioResumen } from '../presupuestos/presupuestos.mapper.js';
import {
  DECIMALES_PORCENTAJE,
  errorDeHitos,
  montosDeHitos,
  sumarPorcentajes,
} from './calculo.js';
import type {
  AnularDocumentoCompraDto,
  AprobarDocumentoCompraDto,
  EliminarDocumentoCompraDto,
  EnviarDocumentoCompraDto,
  RechazarDocumentoCompraDto,
} from './compras.dto.js';
import { aDocumentoBase, idsDeReferencias } from './compras.mapper.js';
import { ComprasRepositorio } from './compras.repositorio.js';
import {
  EstadoDocumentoCompra,
  TipoDocumentoCompra,
  folio,
} from './compras.tipos.js';
import {
  ContextoCompras,
  errorValidacion,
  exigirVersion,
  marcarEliminado,
  marcarEnviado,
  marcarResuelto,
  noEncontrado,
  regla,
  tocar,
} from './contexto-compras.js';
import { exigirBorrador, exigirTransicion } from './estados.js';
import type { OrdenTrabajo, OrdenTrabajoHito } from './orden-trabajo.entity.js';
import type {
  ActualizarOrdenTrabajoDto,
  CrearOrdenTrabajoDto,
  DatosHitoDto,
  HitoDto,
  ListarOrdenesTrabajoDto,
  OrdenTrabajoDto,
  PaginaOrdenesTrabajoDto,
} from './ordenes-trabajo.dto.js';

const TIPO = TipoDocumentoCompra.OrdenTrabajo;
const RESTRICCION_OT_COTIZACION = 'ux_orden_trabajo_cotizacion';

const otNoEncontrada = () =>
  noEncontrado('ORDEN_TRABAJO_NO_ENCONTRADA', 'La orden de trabajo no existe.');

const cotizacionConOt = () =>
  regla(
    'COTIZACION_CON_OT',
    'La cotización ya tiene una OT vigente. Anúlala o recházala antes de crear otra.',
  );

/**
 * Órdenes de trabajo (P11): nacen de una cotización aprobada, con hitos porcentuales que suman
 * 100 %. Supuesto H5: los hitos se fijan en el borrador y no cambian tras aprobar la OT.
 */
@Injectable()
export class OrdenesTrabajoService {
  constructor(
    private readonly repositorio: ComprasRepositorio,
    private readonly contexto: ContextoCompras,
  ) {}

  // --- Consultas ------------------------------------------------------------

  async listar(
    filtro: ListarOrdenesTrabajoDto,
  ): Promise<PaginaOrdenesTrabajoDto> {
    const [items, total] = await this.repositorio.listarOrdenesTrabajo(filtro);
    return {
      items: await this.aDtos(items),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<OrdenTrabajoDto> {
    const ot = await this.repositorio.buscarOrdenTrabajo(id);
    if (!ot) throw otNoEncontrada();
    return (await this.aDtos([ot]))[0];
  }

  // --- Borrador -------------------------------------------------------------

  /** Crea la OT en borrador desde una cotización aprobada sin otra OT vigente. */
  async crear(
    dto: CrearOrdenTrabajoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    exigirFechas(dto.fechaInicio ?? null, dto.fechaTermino ?? null);
    const hitos = dto.hitos ?? [];
    exigirHitos(hitos, false);
    try {
      const creada = await this.repositorio.enTransaccion(async (tx) => {
        const previa = await this.repositorio.buscarCotizacion(
          dto.cotizacionId,
          tx,
        );
        if (!previa) throw cotizacionNoDisponible();
        // Orden de bloqueo: obra → cotización → OT.
        await this.contexto.obraAbierta(previa.obraId, tx);
        const cotizacion = await this.repositorio.buscarCotizacionBloqueando(
          dto.cotizacionId,
          tx,
        );
        if (!cotizacion) throw cotizacionNoDisponible();
        if (cotizacion.estado !== EstadoDocumentoCompra.Aprobada) {
          throw regla(
            'COTIZACION_NO_APROBADA',
            'Solo se puede crear una OT desde una cotización aprobada.',
          );
        }
        const vigentes = await this.repositorio.otVigentesDeCotizaciones(
          [cotizacion.id],
          tx,
        );
        if (vigentes.size > 0) throw cotizacionConOt();
        await this.contexto.exigirProveedor(cotizacion.proveedorId, tx);

        const ot = await this.repositorio.crearOrdenTrabajo(
          {
            numero: await this.repositorio.siguienteFolio(TIPO, tx),
            obraId: cotizacion.obraId,
            proveedorId: cotizacion.proveedorId,
            cotizacionId: cotizacion.id,
            descripcion: dto.descripcion ?? cotizacion.descripcion,
            categoriaGastoId: cotizacion.categoriaGastoId,
            montoNeto: cotizacion.montoNeto,
            fechaInicio: dto.fechaInicio ?? null,
            fechaTermino: dto.fechaTermino ?? null,
            estado: EstadoDocumentoCompra.Borrador,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
        await this.guardarHitos(ot, hitos, actor, tx);
        return ot;
      });
      const resultado = await this.obtener(creada.id);
      auditoria.entidadId = creada.id;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_OT_COTIZACION)) {
        throw cotizacionConOt();
      }
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: ActualizarOrdenTrabajoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    if (dto.hitos !== undefined) exigirHitos(dto.hitos, false);
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const ot = await this.bloquearConObra(id, tx);
      exigirVersion(ot, dto.version);
      exigirBorrador(TIPO, ot.estado);
      const antes = (await this.aDtos([ot], tx))[0];
      if (dto.descripcion !== undefined) ot.descripcion = dto.descripcion;
      if (dto.fechaInicio !== undefined) ot.fechaInicio = dto.fechaInicio;
      if (dto.fechaTermino !== undefined) ot.fechaTermino = dto.fechaTermino;
      exigirFechas(ot.fechaInicio, ot.fechaTermino);
      tocar(ot, actor);
      await this.repositorio.guardarOrdenTrabajo(ot, tx);
      if (dto.hitos !== undefined) {
        await this.guardarHitos(ot, dto.hitos, actor, tx);
      }
      return antes;
    });
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.despues = resultado;
    return resultado;
  }

  async eliminar(
    id: number,
    dto: EliminarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const ot = await this.bloquearConObra(id, tx);
      exigirVersion(ot, dto.version);
      exigirBorrador(TIPO, ot.estado);
      const antes = (await this.aDtos([ot], tx))[0];
      marcarEliminado(ot, actor, this.contexto.ahora());
      await this.repositorio.guardarOrdenTrabajo(ot, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  // --- Flujo de aprobación --------------------------------------------------

  /** borrador → en revisión: los hitos deben sumar exactamente 100 %. */
  async enviarARevision(
    id: number,
    dto: EnviarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    await this.transicion(id, dto.version, auditoria, async (ot, tx) => {
      exigirTransicion(TIPO, ot.estado, EstadoDocumentoCompra.EnRevision);
      await this.exigirHitosCompletos(ot, tx);
      await this.contexto.exigirProveedor(ot.proveedorId, tx);
      marcarEnviado(ot, actor, this.contexto.ahora());
    });
    return this.resultado(id, auditoria);
  }

  /** en revisión → aprobada, con la política de autoaprobación (D-10). */
  async aprobar(
    id: number,
    dto: AprobarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    await this.transicion(id, dto.version, auditoria, async (ot, tx) => {
      exigirPuedeAprobar(actor, { creadoPor: ot.createdBy }, 'ot.aprobar');
      exigirTransicion(TIPO, ot.estado, EstadoDocumentoCompra.Aprobada);
      await this.exigirHitosCompletos(ot, tx);
      marcarResuelto(
        ot,
        EstadoDocumentoCompra.Aprobada,
        actor,
        this.contexto.ahora(),
        dto.motivo ?? null,
      );
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  async rechazar(
    id: number,
    dto: RechazarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    await this.transicion(id, dto.version, auditoria, (ot) => {
      exigirPermiso(actor, 'ot.aprobar');
      exigirTransicion(TIPO, ot.estado, EstadoDocumentoCompra.Rechazada);
      marcarResuelto(
        ot,
        EstadoDocumentoCompra.Rechazada,
        actor,
        this.contexto.ahora(),
        dto.motivo,
      );
      return Promise.resolve();
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  /**
   * aprobada → anulada (supuesto H5): solo si la OT no tiene OC parciales vigentes. Libera la
   * cotización para crear otra OT.
   */
  async anular(
    id: number,
    dto: AnularDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    await this.transicion(id, dto.version, auditoria, async (ot, tx) => {
      exigirPermiso(actor, 'ot.anular');
      exigirTransicion(TIPO, ot.estado, EstadoDocumentoCompra.Anulada);
      const vigentes = await this.repositorio.contarOcVigentesDeOrdenTrabajo(
        ot.id,
        tx,
      );
      if (vigentes > 0) {
        throw regla(
          'OT_CON_OC_VIGENTES',
          `La OT tiene ${vigentes} OC vigente(s): anúlalas o elimínalas antes de anular la OT.`,
        );
      }
      ot.estado = EstadoDocumentoCompra.Anulada;
      ot.anuladoEn = this.contexto.ahora();
      ot.anuladoPor = actor.id;
      ot.motivoAnulacion = dto.motivo;
      tocar(ot, actor);
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  // ---------------------------------------------------------------------------

  /** Bloquea obra → OT (orden fijo) y exige que la obra esté abierta. */
  private async bloquearConObra(
    id: number,
    tx: EntityManager,
  ): Promise<OrdenTrabajo> {
    const previa = await this.repositorio.buscarOrdenTrabajo(id, tx);
    if (!previa) throw otNoEncontrada();
    await this.contexto.obraAbierta(previa.obraId, tx);
    const ot = await this.repositorio.buscarOrdenTrabajoBloqueando(id, tx);
    if (!ot) throw otNoEncontrada();
    return ot;
  }

  private async transicion(
    id: number,
    version: number,
    auditoria: ContextoAuditoria,
    cambio: (ot: OrdenTrabajo, tx: EntityManager) => Promise<void>,
  ): Promise<void> {
    await this.repositorio.enTransaccion(async (tx) => {
      const ot = await this.bloquearConObra(id, tx);
      exigirVersion(ot, version);
      auditoria.antes = { estado: ot.estado };
      await cambio(ot, tx);
      await this.repositorio.guardarOrdenTrabajo(ot, tx);
    });
  }

  private async resultado(
    id: number,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenTrabajoDto> {
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.despues = resultado;
    return resultado;
  }

  private async exigirHitosCompletos(
    ot: OrdenTrabajo,
    tx: EntityManager,
  ): Promise<void> {
    const hitos = await this.repositorio.listarHitos([ot.id], tx);
    const error = errorDeHitos(
      hitos.map((h) => h.porcentaje),
      true,
    );
    if (error) throw regla('HITOS_INCOMPLETOS', error);
  }

  /** Reemplaza los hitos del borrador, con su monto calculado sobre el monto de la OT. */
  private async guardarHitos(
    ot: OrdenTrabajo,
    hitos: readonly DatosHitoDto[],
    actor: ActorAutenticado,
    tx: EntityManager,
  ): Promise<void> {
    const montos = montosDeHitos(
      ot.montoNeto,
      hitos.map((h) => h.porcentaje),
    );
    await this.repositorio.reemplazarHitos(
      ot.id,
      hitos.map((h, i) => ({
        ordenTrabajoId: ot.id,
        numero: i + 1,
        descripcion: h.descripcion,
        porcentaje: h.porcentaje,
        montoNeto: montos[i],
        fechaEstimada: h.fechaEstimada ?? null,
        createdBy: actor.id,
      })),
      tx,
    );
  }

  private async aDtos(
    ots: OrdenTrabajo[],
    tx?: EntityManager,
  ): Promise<OrdenTrabajoDto[]> {
    const ids = ots.map((o) => o.id);
    const [refs, categorias, hitos, ocupacion, cotizaciones] =
      await Promise.all([
        this.repositorio.referencias(idsDeReferencias(ots)),
        this.contexto.categorias(),
        this.repositorio.listarHitos(ids, tx),
        this.repositorio.ocupacionDeHitos(ids, tx),
        this.repositorio.cotizacionesPorIds(ots.map((o) => o.cotizacionId)),
      ]);
    const porCotizacion = new Map(cotizaciones.map((c) => [c.id, c]));
    const ocupadoPorHito = new Map(ocupacion.map((o) => [o.hitoId, o]));
    return ots.map((ot) => {
      const propios = hitos
        .filter((h) => h.ordenTrabajoId === ot.id)
        .map((h) => aHitoDto(h, ocupadoPorHito.get(h.id)));
      const montoOrdenado = propios.reduce((s, h) => s + h.montoOrdenado, 0);
      const cotizacion = porCotizacion.get(ot.cotizacionId);
      return {
        ...aDocumentoBase(TIPO, ot, refs, categorias),
        cotizacion: {
          id: ot.cotizacionId,
          folio: folio(
            TipoDocumentoCompra.Cotizacion,
            cotizacion?.numero ?? ot.cotizacionId,
          ),
          estado: cotizacion?.estado ?? EstadoDocumentoCompra.Aprobada,
        },
        montoNeto: ot.montoNeto,
        fechaInicio: ot.fechaInicio,
        fechaTermino: ot.fechaTermino,
        hitos: propios,
        montoOrdenado,
        porcentajeOrdenado: sumarPorcentajes(
          propios.map((h) => h.porcentajeOrdenado),
        ),
        saldo: ot.montoNeto - montoOrdenado,
        anuladoEn: ot.anuladoEn?.toISOString() ?? null,
        anuladoPor: aUsuarioResumen(ot.anuladoPor, refs.usuarios),
        motivoAnulacion: ot.motivoAnulacion,
      };
    });
  }
}

function aHitoDto(
  h: OrdenTrabajoHito,
  ocupado: { porcentaje: number; monto: number } | undefined,
): HitoDto {
  const porcentajeOrdenado = ocupado?.porcentaje ?? 0;
  const montoOrdenado = ocupado?.monto ?? 0;
  return {
    id: h.id,
    numero: h.numero,
    descripcion: h.descripcion,
    porcentaje: h.porcentaje,
    montoNeto: h.montoNeto,
    fechaEstimada: h.fechaEstimada,
    porcentajeOrdenado,
    montoOrdenado,
    porcentajeDisponible: sumar(
      [h.porcentaje, -porcentajeOrdenado],
      DECIMALES_PORCENTAJE,
    ),
    montoDisponible: h.montoNeto - montoOrdenado,
  };
}

const cotizacionNoDisponible = () =>
  regla(
    'COTIZACION_NO_DISPONIBLE',
    'La cotización no existe o fue eliminada.',
    [
      {
        campo: 'cotizacionId',
        errores: ['La cotización no existe o fue eliminada.'],
      },
    ],
  );

function exigirHitos(
  hitos: readonly DatosHitoDto[],
  exigirCien: boolean,
): void {
  const error = errorDeHitos(
    hitos.map((h) => h.porcentaje),
    exigirCien,
  );
  if (error) throw errorValidacion('hitos', error);
}

function exigirFechas(inicio: string | null, termino: string | null): void {
  if (inicio !== null && termino !== null && termino < inicio) {
    throw errorValidacion(
      'fechaTermino',
      'La fecha de término no puede ser anterior a la de inicio.',
    );
  }
}
