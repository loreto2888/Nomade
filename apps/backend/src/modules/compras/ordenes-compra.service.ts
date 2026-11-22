import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import {
  exigirPermiso,
  exigirPuedeAprobar,
} from '../../common/permisos/autoaprobacion.js';
import { MovimientosService } from '../movimientos/movimientos.service.js';
import {
  OrigenMovimiento,
  TipoMovimiento,
} from '../movimientos/movimientos.tipos.js';
import { ParametrosService } from '../parametros/parametros.service.js';
import { aUsuarioResumen } from '../presupuestos/presupuestos.mapper.js';
import {
  formatearPorcentaje,
  montoParcial,
  montosDeOc,
  porcentajeMayor,
  sumarPorcentajes,
  totalDeLinea,
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
  CodigoCategoriaGasto,
  EstadoDocumentoCompra,
  TipoDocumentoCompra,
  TipoOrdenCompra,
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
import type { OrdenCompra, OrdenCompraLinea } from './orden-compra.entity.js';
import type { OrdenTrabajo } from './orden-trabajo.entity.js';
import type {
  ActualizarOrdenCompraDto,
  CrearOrdenCompraDto,
  DatosLineaDto,
  ListarOrdenesCompraDto,
  OrdenCompraDetalleDto,
  OrdenCompraDto,
  PaginaOrdenesCompraDto,
  RecibirOrdenCompraDto,
} from './ordenes-compra.dto.js';

const TIPO = TipoDocumentoCompra.OrdenCompra;
const CODIGO_IVA = 'iva';

const ocNoEncontrada = () =>
  noEncontrado('ORDEN_COMPRA_NO_ENCONTRADA', 'La orden de compra no existe.');

/** Campos que solo admite un tipo de OC. */
const SOLO_MATERIALES = ['obraId', 'proveedorId', 'lineas'] as const;
const SOLO_PARCIAL = ['ordenTrabajoId', 'hitoId', 'porcentaje'] as const;

/**
 * Órdenes de compra (P10) y su bandeja de aprobación (P30). Una OC de materiales detalla líneas; una
 * OC parcial ordena un porcentaje de una OT aprobada, con tope en el saldo del hito. Al aprobarse
 * registra el compromiso en el libro de movimientos; al anularse, su reversa. Supuesto H5: una OC
 * aprobada no se edita.
 */
@Injectable()
export class OrdenesCompraService {
  constructor(
    private readonly repositorio: ComprasRepositorio,
    private readonly contexto: ContextoCompras,
    private readonly parametros: ParametrosService,
    private readonly movimientos: MovimientosService,
  ) {}

  // --- Consultas ------------------------------------------------------------

  async listar(
    filtro: ListarOrdenesCompraDto,
  ): Promise<PaginaOrdenesCompraDto> {
    const [items, total] = await this.repositorio.listarOrdenesCompra(filtro);
    return {
      items: await this.aDtos(items),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<OrdenCompraDetalleDto> {
    const oc = await this.repositorio.buscarOrdenCompra(id);
    if (!oc) throw ocNoEncontrada();
    const [dto, movimientos] = await Promise.all([
      this.aDtos([oc]),
      this.movimientos.listarDeOrigen(OrigenMovimiento.OrdenCompra, id),
    ]);
    return { ordenCompra: dto[0], movimientos };
  }

  // --- Borrador -------------------------------------------------------------

  async crear(
    dto: CrearOrdenCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    const fecha = dto.fecha ?? this.contexto.hoy();
    exigirEntrega(fecha, dto.fechaEntrega ?? null);
    const creada = await this.repositorio.enTransaccion((tx) =>
      dto.tipo === TipoOrdenCompra.Materiales
        ? this.crearMateriales(dto, fecha, actor, tx)
        : this.crearParcial(dto, fecha, actor, tx),
    );
    const resultado = await this.obtener(creada.id);
    auditoria.entidadId = creada.id;
    auditoria.despues = resultado.ordenCompra;
    return resultado;
  }

  private async crearMateriales(
    dto: CrearOrdenCompraDto,
    fecha: string,
    actor: ActorAutenticado,
    tx: EntityManager,
  ): Promise<OrdenCompra> {
    prohibirCampos(dto, SOLO_PARCIAL, 'una OC de materiales');
    if (dto.obraId === undefined) {
      throw errorValidacion('obraId', 'Selecciona una obra.');
    }
    if (dto.proveedorId === undefined) {
      throw errorValidacion('proveedorId', 'Selecciona un proveedor.');
    }
    if (dto.descripcion === undefined) {
      throw errorValidacion('descripcion', 'Describe la compra.');
    }
    await this.contexto.obraAbierta(dto.obraId, tx);
    await this.contexto.exigirProveedor(dto.proveedorId, tx);
    const categoriaGastoId = await this.contexto.categoriaActiva(
      dto.categoriaGastoId,
      CodigoCategoriaGasto.Materiales,
      tx,
    );
    const lineas = dto.lineas ?? [];
    const afectaIva = dto.afectaIva ?? true;
    const tasaIva = await this.tasaIva(fecha);
    const oc = await this.repositorio.crearOrdenCompra(
      {
        numero: await this.repositorio.siguienteFolio(TIPO, tx),
        tipo: TipoOrdenCompra.Materiales,
        obraId: dto.obraId,
        proveedorId: dto.proveedorId,
        ordenTrabajoId: null,
        hitoId: null,
        porcentaje: null,
        categoriaGastoId,
        fecha,
        fechaEntrega: dto.fechaEntrega ?? null,
        descripcion: dto.descripcion,
        afectaIva,
        tasaIva,
        ...montosDeOc(netoDeLineas(lineas), tasaIva, afectaIva),
        estado: EstadoDocumentoCompra.Borrador,
        version: 1,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      tx,
    );
    await this.guardarLineas(oc.id, lineas, actor, tx);
    return oc;
  }

  private async crearParcial(
    dto: CrearOrdenCompraDto,
    fecha: string,
    actor: ActorAutenticado,
    tx: EntityManager,
  ): Promise<OrdenCompra> {
    prohibirCampos(dto, SOLO_MATERIALES, 'una OC parcial de OT');
    if (dto.ordenTrabajoId === undefined) {
      throw errorValidacion('ordenTrabajoId', 'Selecciona una OT.');
    }
    if (dto.hitoId === undefined) {
      throw errorValidacion('hitoId', 'Selecciona un hito.');
    }
    if (dto.porcentaje === undefined) {
      throw errorValidacion('porcentaje', 'Indica el porcentaje de la OT.');
    }
    const ot = await this.bloquearOtAprobada(dto.ordenTrabajoId, tx);
    const hito = await this.hitoDeOt(ot, dto.hitoId, tx);
    const montoNeto = await this.montoParcial(ot, hito.id, dto.porcentaje, tx);
    const categoriaGastoId =
      dto.categoriaGastoId === undefined
        ? ot.categoriaGastoId
        : await this.contexto.categoriaActiva(
            dto.categoriaGastoId,
            CodigoCategoriaGasto.Subcontratos,
            tx,
          );
    await this.contexto.exigirProveedor(ot.proveedorId, tx);
    const afectaIva = dto.afectaIva ?? true;
    const tasaIva = await this.tasaIva(fecha);
    return this.repositorio.crearOrdenCompra(
      {
        numero: await this.repositorio.siguienteFolio(TIPO, tx),
        tipo: TipoOrdenCompra.ParcialOt,
        obraId: ot.obraId,
        proveedorId: ot.proveedorId,
        ordenTrabajoId: ot.id,
        hitoId: hito.id,
        porcentaje: dto.porcentaje,
        categoriaGastoId,
        fecha,
        fechaEntrega: dto.fechaEntrega ?? null,
        descripcion:
          dto.descripcion ??
          `${hito.descripcion} — ${formatearPorcentaje(dto.porcentaje)} de ${folio(TipoDocumentoCompra.OrdenTrabajo, ot.numero)}`,
        afectaIva,
        tasaIva,
        ...montosDeOc(montoNeto, tasaIva, afectaIva),
        estado: EstadoDocumentoCompra.Borrador,
        version: 1,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      tx,
    );
  }

  async actualizar(
    id: number,
    dto: ActualizarOrdenCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    rechazarNulos(dto);
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const { oc, ot } = await this.bloquear(id, tx);
      exigirVersion(oc, dto.version);
      exigirBorrador(TIPO, oc.estado);
      const antes = (await this.aDtos([oc], tx))[0];

      if (dto.fecha !== undefined) oc.fecha = dto.fecha;
      if (dto.fechaEntrega !== undefined) oc.fechaEntrega = dto.fechaEntrega;
      exigirEntrega(oc.fecha, oc.fechaEntrega);
      if (dto.descripcion !== undefined) oc.descripcion = dto.descripcion;
      if (dto.afectaIva !== undefined) oc.afectaIva = dto.afectaIva;
      if (dto.categoriaGastoId !== undefined) {
        oc.categoriaGastoId = await this.contexto.categoriaActiva(
          dto.categoriaGastoId,
          CodigoCategoriaGasto.Materiales,
          tx,
        );
      }

      let montoNeto: number;
      if (oc.tipo === TipoOrdenCompra.Materiales) {
        prohibirCampos(dto, ['hitoId', 'porcentaje'], 'una OC de materiales');
        if (dto.proveedorId !== undefined) {
          await this.contexto.exigirProveedor(dto.proveedorId, tx);
          oc.proveedorId = dto.proveedorId;
        }
        if (dto.lineas !== undefined) {
          await this.guardarLineas(oc.id, dto.lineas, actor, tx);
          montoNeto = netoDeLineas(dto.lineas);
        } else {
          montoNeto = oc.montoNeto;
        }
      } else {
        prohibirCampos(dto, ['proveedorId', 'lineas'], 'una OC parcial de OT');
        if (dto.hitoId !== undefined) {
          oc.hitoId = (await this.hitoDeOt(ot!, dto.hitoId, tx)).id;
        }
        if (dto.porcentaje !== undefined) oc.porcentaje = dto.porcentaje;
        montoNeto = await this.montoParcial(
          ot!,
          oc.hitoId!,
          oc.porcentaje!,
          tx,
          oc.id,
        );
      }
      oc.tasaIva = await this.tasaIva(oc.fecha);
      Object.assign(oc, montosDeOc(montoNeto, oc.tasaIva, oc.afectaIva));
      tocar(oc, actor);
      await this.repositorio.guardarOrdenCompra(oc, tx);
      return antes;
    });
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.despues = resultado.ordenCompra;
    return resultado;
  }

  async eliminar(
    id: number,
    dto: EliminarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const { oc } = await this.bloquear(id, tx);
      exigirVersion(oc, dto.version);
      exigirBorrador(TIPO, oc.estado);
      const antes = (await this.aDtos([oc], tx))[0];
      marcarEliminado(oc, actor, this.contexto.ahora());
      await this.repositorio.guardarOrdenCompra(oc, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  // --- Flujo de aprobación --------------------------------------------------

  /** borrador → en revisión: con monto (y líneas, si es de materiales) y saldo de la OT. */
  async enviarARevision(
    id: number,
    dto: EnviarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    await this.transicion(id, dto.version, auditoria, async (oc, ot, tx) => {
      exigirTransicion(TIPO, oc.estado, EstadoDocumentoCompra.EnRevision);
      await this.exigirCompleta(oc, ot, tx);
      await this.contexto.exigirProveedor(oc.proveedorId, tx);
      marcarEnviado(oc, actor, this.contexto.ahora());
    });
    return this.resultado(id, auditoria);
  }

  /**
   * en revisión → aprobada (D-10: el `usuario` no aprueba lo que creó). Registra el compromiso
   * (CLP neto) en el libro de movimientos dentro de la misma transacción.
   */
  async aprobar(
    id: number,
    dto: AprobarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    await this.transicion(id, dto.version, auditoria, async (oc, ot, tx) => {
      exigirPuedeAprobar(actor, { creadoPor: oc.createdBy }, 'oc.aprobar');
      exigirTransicion(TIPO, oc.estado, EstadoDocumentoCompra.Aprobada);
      await this.exigirCompleta(oc, ot, tx);
      marcarResuelto(
        oc,
        EstadoDocumentoCompra.Aprobada,
        actor,
        this.contexto.ahora(),
        dto.motivo ?? null,
      );
      await this.movimientos.registrarCompromiso(tx, {
        fecha: this.contexto.hoy(),
        obraId: oc.obraId,
        proveedorId: oc.proveedorId,
        categoriaGastoId: oc.categoriaGastoId,
        origenTipo: OrigenMovimiento.OrdenCompra,
        origenId: oc.id,
        montoClp: oc.montoNeto,
        descripcion: `Compromiso ${folio(TIPO, oc.numero)}`,
        actorId: actor.id,
      });
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  async rechazar(
    id: number,
    dto: RechazarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    await this.transicion(id, dto.version, auditoria, (oc) => {
      exigirPermiso(actor, 'oc.aprobar');
      exigirTransicion(TIPO, oc.estado, EstadoDocumentoCompra.Rechazada);
      marcarResuelto(
        oc,
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

  /** aprobada → recibida (supuesto: recepción total, una sola vez). El compromiso se mantiene. */
  async recibir(
    id: number,
    dto: RecibirOrdenCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    const hoy = this.contexto.hoy();
    const fechaRecepcion = dto.fechaRecepcion ?? hoy;
    if (fechaRecepcion > hoy) {
      throw errorValidacion(
        'fechaRecepcion',
        'La fecha de recepción no puede ser futura.',
      );
    }
    await this.transicion(id, dto.version, auditoria, (oc) => {
      exigirTransicion(TIPO, oc.estado, EstadoDocumentoCompra.Recibida);
      if (fechaRecepcion < oc.fecha) {
        throw errorValidacion(
          'fechaRecepcion',
          'La fecha de recepción no puede ser anterior a la fecha de la OC.',
        );
      }
      oc.estado = EstadoDocumentoCompra.Recibida;
      oc.recibidoEn = this.contexto.ahora();
      oc.recibidoPor = actor.id;
      oc.fechaRecepcion = fechaRecepcion;
      oc.observacionRecepcion = dto.observacion ?? null;
      tocar(oc, actor);
      return Promise.resolve();
    });
    return this.resultado(id, auditoria);
  }

  /**
   * aprobada → anulada, con motivo (supuesto H5: una OC aprobada no se edita, se anula). Registra
   * la reversa del compromiso y libera el saldo de la OT.
   */
  async anular(
    id: number,
    dto: AnularDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    await this.transicion(id, dto.version, auditoria, async (oc, _ot, tx) => {
      exigirPermiso(actor, 'oc.anular');
      exigirTransicion(TIPO, oc.estado, EstadoDocumentoCompra.Anulada);
      oc.estado = EstadoDocumentoCompra.Anulada;
      oc.anuladoEn = this.contexto.ahora();
      oc.anuladoPor = actor.id;
      oc.motivoAnulacion = dto.motivo;
      tocar(oc, actor);
      await this.movimientos.revertir(tx, {
        tipo: TipoMovimiento.Compromiso,
        origenTipo: OrigenMovimiento.OrdenCompra,
        origenId: oc.id,
        fecha: this.contexto.hoy(),
        descripcion: `Reversa por anulación ${folio(TIPO, oc.numero)}`,
        actorId: actor.id,
      });
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  // ---------------------------------------------------------------------------

  /** Bloquea en orden obra → OT (si es parcial) → OC, y exige que la obra esté abierta. */
  private async bloquear(
    id: number,
    tx: EntityManager,
  ): Promise<{ oc: OrdenCompra; ot: OrdenTrabajo | null }> {
    const previa = await this.repositorio.buscarOrdenCompra(id, tx);
    if (!previa) throw ocNoEncontrada();
    await this.contexto.obraAbierta(previa.obraId, tx);
    const ot =
      previa.ordenTrabajoId === null
        ? null
        : await this.repositorio.buscarOrdenTrabajoBloqueando(
            previa.ordenTrabajoId,
            tx,
          );
    const oc = await this.repositorio.buscarOrdenCompraBloqueando(id, tx);
    if (!oc) throw ocNoEncontrada();
    return { oc, ot };
  }

  private async transicion(
    id: number,
    version: number,
    auditoria: ContextoAuditoria,
    cambio: (
      oc: OrdenCompra,
      ot: OrdenTrabajo | null,
      tx: EntityManager,
    ) => Promise<void>,
  ): Promise<void> {
    await this.repositorio.enTransaccion(async (tx) => {
      const { oc, ot } = await this.bloquear(id, tx);
      exigirVersion(oc, version);
      auditoria.antes = { estado: oc.estado };
      await cambio(oc, ot, tx);
      await this.repositorio.guardarOrdenCompra(oc, tx);
    });
  }

  private async resultado(
    id: number,
    auditoria: ContextoAuditoria,
  ): Promise<OrdenCompraDetalleDto> {
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.despues = resultado.ordenCompra;
    return resultado;
  }

  /** OT bloqueada (obra → OT) que debe estar aprobada para admitir OC parciales. */
  private async bloquearOtAprobada(
    ordenTrabajoId: number,
    tx: EntityManager,
  ): Promise<OrdenTrabajo> {
    const previa = await this.repositorio.buscarOrdenTrabajo(
      ordenTrabajoId,
      tx,
    );
    if (!previa) throw otNoDisponible();
    await this.contexto.obraAbierta(previa.obraId, tx);
    const ot = await this.repositorio.buscarOrdenTrabajoBloqueando(
      ordenTrabajoId,
      tx,
    );
    if (!ot) throw otNoDisponible();
    exigirOtAprobada(ot);
    return ot;
  }

  private async hitoDeOt(ot: OrdenTrabajo, hitoId: number, tx: EntityManager) {
    const hito = await this.repositorio.buscarHito(hitoId, tx);
    if (!hito || hito.ordenTrabajoId !== ot.id) {
      throw regla('HITO_NO_VALIDO', 'El hito no pertenece a la OT.', [
        { campo: 'hitoId', errores: ['El hito no pertenece a la OT.'] },
      ]);
    }
    return hito;
  }

  /** Monto de la OC parcial con tope en el saldo del hito (422 `SALDO_OT_INSUFICIENTE`). */
  private async montoParcial(
    ot: OrdenTrabajo,
    hitoId: number,
    porcentaje: number,
    tx: EntityManager,
    excluirOcId?: number,
  ): Promise<number> {
    const hito = await this.hitoDeOt(ot, hitoId, tx);
    const ocupacion = await this.repositorio.ocupacionDeHitos(
      [ot.id],
      tx,
      excluirOcId,
    );
    const ocupado = ocupacion.find((o) => o.hitoId === hito.id);
    const resultado = montoParcial(
      ot.montoNeto,
      {
        porcentaje: hito.porcentaje,
        montoNeto: hito.montoNeto,
        porcentajeOcupado: ocupado?.porcentaje ?? 0,
        montoOcupado: ocupado?.monto ?? 0,
      },
      porcentaje,
    );
    if (!resultado.ok) {
      const mensaje = `El hito ${hito.numero} tiene disponible ${formatearPorcentaje(resultado.porcentajeDisponible)} de la OT: no se puede ordenar ${formatearPorcentaje(porcentaje)}.`;
      throw regla('SALDO_OT_INSUFICIENTE', mensaje, [
        { campo: 'porcentaje', errores: [mensaje] },
      ]);
    }
    return resultado.montoNeto;
  }

  /** Requisitos para enviar o aprobar: monto, líneas (materiales) o saldo de la OT (parcial). */
  private async exigirCompleta(
    oc: OrdenCompra,
    ot: OrdenTrabajo | null,
    tx: EntityManager,
  ): Promise<void> {
    if (oc.tipo === TipoOrdenCompra.Materiales) {
      const lineas = await this.repositorio.listarLineas([oc.id], tx);
      if (lineas.length === 0 || oc.montoNeto <= 0) {
        throw regla(
          'OC_SIN_MONTO',
          'Agrega al menos una línea con monto para continuar.',
        );
      }
      return;
    }
    exigirOtAprobada(ot!);
    // La OC ya reservó su parte del hito al guardarse; se verifica que siga cabiendo en el saldo.
    const hito = await this.hitoDeOt(ot!, oc.hitoId!, tx);
    const ocupado = (
      await this.repositorio.ocupacionDeHitos([ot!.id], tx, oc.id)
    ).find((o) => o.hitoId === hito.id);
    const porcentajeDisponible = sumarPorcentajes([
      hito.porcentaje,
      -(ocupado?.porcentaje ?? 0),
    ]);
    const montoDisponible = hito.montoNeto - (ocupado?.monto ?? 0);
    if (
      porcentajeMayor(oc.porcentaje!, porcentajeDisponible) ||
      oc.montoNeto > montoDisponible
    ) {
      throw regla(
        'SALDO_OT_INSUFICIENTE',
        `El hito ${hito.numero} ya no tiene saldo para esta OC (disponible: ${formatearPorcentaje(porcentajeDisponible)}).`,
      );
    }
  }

  private async tasaIva(fecha: string): Promise<number> {
    return this.parametros.valorNumerico(CODIGO_IVA, fecha);
  }

  private async guardarLineas(
    ordenCompraId: number,
    lineas: readonly DatosLineaDto[],
    actor: ActorAutenticado,
    tx: EntityManager,
  ): Promise<void> {
    await this.repositorio.reemplazarLineas(
      ordenCompraId,
      lineas.map((l, i) => ({
        ordenCompraId,
        numero: i + 1,
        descripcion: l.descripcion,
        unidad: l.unidad,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        total: totalDeLinea(l.cantidad, l.precioUnitario),
        createdBy: actor.id,
      })),
      tx,
    );
  }

  private async aDtos(
    ocs: OrdenCompra[],
    tx?: EntityManager,
  ): Promise<OrdenCompraDto[]> {
    const [refs, categorias, lineas, ots, hitos] = await Promise.all([
      this.repositorio.referencias(idsDeReferencias(ocs)),
      this.contexto.categorias(),
      this.repositorio.listarLineas(
        ocs.map((o) => o.id),
        tx,
      ),
      this.repositorio.ordenesTrabajoPorIds(
        ocs.flatMap((o) =>
          o.ordenTrabajoId === null ? [] : [o.ordenTrabajoId],
        ),
      ),
      this.repositorio.hitosPorIds(
        ocs.flatMap((o) => (o.hitoId === null ? [] : [o.hitoId])),
      ),
    ]);
    const otPorId = new Map(ots.map((o) => [o.id, o]));
    const hitoPorId = new Map(hitos.map((h) => [h.id, h]));
    return ocs.map((oc) => {
      const ot =
        oc.ordenTrabajoId === null ? undefined : otPorId.get(oc.ordenTrabajoId);
      const hito = oc.hitoId === null ? undefined : hitoPorId.get(oc.hitoId);
      return {
        ...aDocumentoBase(TIPO, oc, refs, categorias),
        tipo: oc.tipo,
        ordenTrabajo: ot
          ? {
              id: ot.id,
              folio: folio(TipoDocumentoCompra.OrdenTrabajo, ot.numero),
              estado: ot.estado,
            }
          : null,
        hito: hito
          ? {
              id: hito.id,
              numero: hito.numero,
              descripcion: hito.descripcion,
              porcentaje: hito.porcentaje,
            }
          : null,
        porcentaje: oc.porcentaje,
        fecha: oc.fecha,
        fechaEntrega: oc.fechaEntrega,
        afectaIva: oc.afectaIva,
        tasaIva: oc.tasaIva,
        montoNeto: oc.montoNeto,
        montoIva: oc.montoIva,
        montoTotal: oc.montoTotal,
        lineas: lineas.filter((l) => l.ordenCompraId === oc.id).map(aLineaDto),
        recibidoEn: oc.recibidoEn?.toISOString() ?? null,
        recibidoPor: aUsuarioResumen(oc.recibidoPor, refs.usuarios),
        fechaRecepcion: oc.fechaRecepcion,
        observacionRecepcion: oc.observacionRecepcion,
        anuladoEn: oc.anuladoEn?.toISOString() ?? null,
        anuladoPor: aUsuarioResumen(oc.anuladoPor, refs.usuarios),
        motivoAnulacion: oc.motivoAnulacion,
      };
    });
  }
}

const aLineaDto = (l: OrdenCompraLinea) => ({
  id: l.id,
  numero: l.numero,
  descripcion: l.descripcion,
  unidad: l.unidad,
  cantidad: l.cantidad,
  precioUnitario: l.precioUnitario,
  total: l.total,
});

const netoDeLineas = (lineas: readonly DatosLineaDto[]): number =>
  lineas.reduce((s, l) => s + totalDeLinea(l.cantidad, l.precioUnitario), 0);

const otNoDisponible = () =>
  regla('OT_NO_DISPONIBLE', 'La OT no existe o fue eliminada.', [
    { campo: 'ordenTrabajoId', errores: ['La OT no existe o fue eliminada.'] },
  ]);

function exigirOtAprobada(ot: OrdenTrabajo): void {
  if (ot.estado !== EstadoDocumentoCompra.Aprobada) {
    throw regla(
      'OT_NO_APROBADA',
      'Solo se pueden ordenar parciales de una OT aprobada.',
    );
  }
}

function exigirEntrega(fecha: string, entrega: string | null): void {
  if (entrega !== null && entrega < fecha) {
    throw errorValidacion(
      'fechaEntrega',
      'La fecha de entrega no puede ser anterior a la fecha de la OC.',
    );
  }
}

/** 400 si se envían campos que no corresponden al tipo de OC. */
function prohibirCampos(
  dto: object,
  campos: readonly string[],
  tipo: string,
): void {
  for (const campo of campos) {
    if ((dto as Record<string, unknown>)[campo] !== undefined) {
      throw errorValidacion(campo, `Este campo no corresponde a ${tipo}.`);
    }
  }
}

function rechazarNulos(dto: ActualizarOrdenCompraDto): void {
  for (const campo of [
    'categoriaGastoId',
    'fecha',
    'descripcion',
    'afectaIva',
    'proveedorId',
    'hitoId',
    'porcentaje',
    'lineas',
  ] as const) {
    if ((dto[campo] as unknown) === null) {
      throw errorValidacion(campo, 'Este campo no puede quedar vacío.');
    }
  }
}
