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
import type {
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
  tocar,
} from './contexto-compras.js';
import type { Cotizacion } from './cotizacion.entity.js';
import type {
  ActualizarCotizacionDto,
  CotizacionDto,
  CrearCotizacionDto,
  ListarCotizacionesDto,
  PaginaCotizacionesDto,
} from './cotizaciones.dto.js';
import { exigirBorrador, exigirTransicion } from './estados.js';

const TIPO = TipoDocumentoCompra.Cotizacion;

const cotizacionNoEncontrada = () =>
  noEncontrado('COTIZACION_NO_ENCONTRADA', 'La cotización no existe.');

/** Cotizaciones de proveedores (P11). Una cotización aprobada habilita crear una OT. */
@Injectable()
export class CotizacionesService {
  constructor(
    private readonly repositorio: ComprasRepositorio,
    private readonly contexto: ContextoCompras,
  ) {}

  // --- Consultas ------------------------------------------------------------

  async listar(filtro: ListarCotizacionesDto): Promise<PaginaCotizacionesDto> {
    const [items, total] = await this.repositorio.listarCotizaciones(filtro);
    return {
      items: await this.aDtos(items),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<CotizacionDto> {
    const cotizacion = await this.repositorio.buscarCotizacion(id);
    if (!cotizacion) throw cotizacionNoEncontrada();
    return (await this.aDtos([cotizacion]))[0];
  }

  // --- Borrador -------------------------------------------------------------

  async crear(
    dto: CrearCotizacionDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    exigirValidez(dto.fecha, dto.validezHasta ?? null);
    const creada = await this.repositorio.enTransaccion(async (tx) => {
      await this.contexto.obraAbierta(dto.obraId, tx);
      await this.contexto.exigirProveedor(dto.proveedorId, tx);
      const categoriaGastoId = await this.contexto.categoriaActiva(
        dto.categoriaGastoId,
        CodigoCategoriaGasto.Subcontratos,
        tx,
      );
      return this.repositorio.crearCotizacion(
        {
          numero: await this.repositorio.siguienteFolio(TIPO, tx),
          obraId: dto.obraId,
          proveedorId: dto.proveedorId,
          referenciaProveedor: dto.referenciaProveedor ?? null,
          fecha: dto.fecha,
          validezHasta: dto.validezHasta ?? null,
          descripcion: dto.descripcion,
          categoriaGastoId,
          montoNeto: dto.montoNeto,
          estado: EstadoDocumentoCompra.Borrador,
          version: 1,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        tx,
      );
    });
    const resultado = await this.obtener(creada.id);
    auditoria.entidadId = creada.id;
    auditoria.despues = resultado;
    return resultado;
  }

  async actualizar(
    id: number,
    dto: ActualizarCotizacionDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    rechazarNulos(dto);
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const actual = await this.repositorio.buscarCotizacion(id, tx);
      if (!actual) throw cotizacionNoEncontrada();
      // Orden de bloqueo: obra(s) por id ascendente → documento.
      for (const obraId of [
        ...new Set([actual.obraId, dto.obraId ?? actual.obraId]),
      ].sort((a, b) => a - b)) {
        await this.contexto.obraAbierta(obraId, tx);
      }
      const cotizacion = await this.bloquear(id, tx);
      exigirVersion(cotizacion, dto.version);
      exigirBorrador(TIPO, cotizacion.estado);
      const antes = (await this.aDtos([cotizacion]))[0];

      if (dto.proveedorId !== undefined) {
        await this.contexto.exigirProveedor(dto.proveedorId, tx);
        cotizacion.proveedorId = dto.proveedorId;
      }
      if (dto.categoriaGastoId !== undefined) {
        cotizacion.categoriaGastoId = await this.contexto.categoriaActiva(
          dto.categoriaGastoId,
          CodigoCategoriaGasto.Subcontratos,
          tx,
        );
      }
      if (dto.obraId !== undefined) cotizacion.obraId = dto.obraId;
      if (dto.referenciaProveedor !== undefined) {
        cotizacion.referenciaProveedor = dto.referenciaProveedor;
      }
      if (dto.fecha !== undefined) cotizacion.fecha = dto.fecha;
      if (dto.validezHasta !== undefined) {
        cotizacion.validezHasta = dto.validezHasta;
      }
      if (dto.descripcion !== undefined) {
        cotizacion.descripcion = dto.descripcion;
      }
      if (dto.montoNeto !== undefined) cotizacion.montoNeto = dto.montoNeto;
      exigirValidez(cotizacion.fecha, cotizacion.validezHasta);
      tocar(cotizacion, actor);
      await this.repositorio.guardarCotizacion(cotizacion, tx);
      return antes;
    });
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.despues = resultado;
    return resultado;
  }

  /** Borrado lógico de un borrador. */
  async eliminar(
    id: number,
    dto: EliminarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const cotizacion = await this.bloquear(id, tx);
      exigirVersion(cotizacion, dto.version);
      exigirBorrador(TIPO, cotizacion.estado);
      await this.contexto.obraAbierta(cotizacion.obraId, tx);
      const antes = (await this.aDtos([cotizacion]))[0];
      marcarEliminado(cotizacion, actor, this.contexto.ahora());
      await this.repositorio.guardarCotizacion(cotizacion, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  // --- Flujo de aprobación --------------------------------------------------

  async enviarARevision(
    id: number,
    dto: EnviarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    await this.transicion(id, dto.version, auditoria, async (c, tx) => {
      exigirTransicion(TIPO, c.estado, EstadoDocumentoCompra.EnRevision);
      await this.contexto.exigirProveedor(c.proveedorId, tx);
      marcarEnviado(c, actor, this.contexto.ahora());
    });
    return this.resultado(id, auditoria);
  }

  /** en revisión → aprobada, con la política de autoaprobación (D-10). */
  async aprobar(
    id: number,
    dto: AprobarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    await this.transicion(id, dto.version, auditoria, (c) => {
      exigirPuedeAprobar(
        actor,
        { creadoPor: c.createdBy },
        'cotizacion.aprobar',
      );
      exigirTransicion(TIPO, c.estado, EstadoDocumentoCompra.Aprobada);
      marcarResuelto(
        c,
        EstadoDocumentoCompra.Aprobada,
        actor,
        this.contexto.ahora(),
        dto.motivo ?? null,
      );
      return Promise.resolve();
    });
    auditoria.motivo = dto.motivo;
    return this.resultado(id, auditoria);
  }

  async rechazar(
    id: number,
    dto: RechazarDocumentoCompraDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    await this.transicion(id, dto.version, auditoria, (c) => {
      exigirPermiso(actor, 'cotizacion.aprobar');
      exigirTransicion(TIPO, c.estado, EstadoDocumentoCompra.Rechazada);
      marcarResuelto(
        c,
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

  // ---------------------------------------------------------------------------

  private async bloquear(id: number, tx: EntityManager): Promise<Cotizacion> {
    const cotizacion = await this.repositorio.buscarCotizacionBloqueando(
      id,
      tx,
    );
    if (!cotizacion) throw cotizacionNoEncontrada();
    return cotizacion;
  }

  /** Bloquea obra → cotización, verifica la versión y aplica el cambio de estado. */
  private async transicion(
    id: number,
    version: number,
    auditoria: ContextoAuditoria,
    cambio: (c: Cotizacion, tx: EntityManager) => Promise<void>,
  ): Promise<void> {
    await this.repositorio.enTransaccion(async (tx) => {
      const previa = await this.repositorio.buscarCotizacion(id, tx);
      if (!previa) throw cotizacionNoEncontrada();
      await this.contexto.obraAbierta(previa.obraId, tx);
      const cotizacion = await this.bloquear(id, tx);
      exigirVersion(cotizacion, version);
      auditoria.antes = { estado: cotizacion.estado };
      await cambio(cotizacion, tx);
      await this.repositorio.guardarCotizacion(cotizacion, tx);
    });
  }

  private async resultado(
    id: number,
    auditoria: ContextoAuditoria,
  ): Promise<CotizacionDto> {
    const resultado = await this.obtener(id);
    auditoria.entidadId = id;
    auditoria.despues = resultado;
    return resultado;
  }

  private async aDtos(cotizaciones: Cotizacion[]): Promise<CotizacionDto[]> {
    const [refs, categorias, ots] = await Promise.all([
      this.repositorio.referencias(idsDeReferencias(cotizaciones)),
      this.contexto.categorias(),
      this.repositorio.otVigentesDeCotizaciones(cotizaciones.map((c) => c.id)),
    ]);
    return cotizaciones.map((c) => {
      const ot = ots.get(c.id);
      return {
        ...aDocumentoBase(TIPO, c, refs, categorias),
        referenciaProveedor: c.referenciaProveedor,
        fecha: c.fecha,
        validezHasta: c.validezHasta,
        montoNeto: c.montoNeto,
        ordenTrabajo: ot
          ? {
              id: ot.id,
              folio: folio(TipoDocumentoCompra.OrdenTrabajo, ot.numero),
              estado: ot.estado,
            }
          : null,
      };
    });
  }
}

function exigirValidez(fecha: string, validezHasta: string | null): void {
  if (validezHasta !== null && validezHasta < fecha) {
    throw errorValidacion(
      'validezHasta',
      'La validez no puede ser anterior a la fecha de la cotización.',
    );
  }
}

/** Los campos obligatorios no se pueden vaciar con `null`. */
function rechazarNulos(dto: ActualizarCotizacionDto): void {
  for (const campo of [
    'obraId',
    'proveedorId',
    'fecha',
    'descripcion',
    'categoriaGastoId',
    'montoNeto',
  ] as const) {
    if ((dto[campo] as unknown) === null) {
      throw errorValidacion(campo, 'Este campo es obligatorio.');
    }
  }
}
