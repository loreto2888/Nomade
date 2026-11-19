import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import {
  exigirPermiso,
  exigirPuedeAprobar,
} from '../../common/permisos/autoaprobacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import type { Catalogo } from '../catalogos/catalogo.entity.js';
import { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import {
  CodigoEstadoObra,
  TipoCatalogo,
} from '../catalogos/catalogos.tipos.js';
import type { Obra } from '../obras/obra.entity.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { ObrasRepositorio } from '../obras/obras.repositorio.js';
import { UfService } from '../uf/uf.service.js';
import {
  errorDeCantidad,
  errorDePrecio,
  totalesDePartida,
  totalizar,
  type ContextoMoneda,
} from './calculo.js';
import { compararPartidas, type PartidaComparable } from './comparacion.js';
import { exigirEditable, exigirTransicion } from './estados.js';
import {
  generarExcelPresupuesto,
  nombreArchivoPresupuesto,
} from './exportacion-excel.js';
import type { Partida } from './partida.entity.js';
import type { PresupuestoVersion } from './presupuesto-version.entity.js';
import type {
  ActualizarPartidaDto,
  ActualizarPresupuestoDto,
  AprobarPresupuestoDto,
  ComparacionPresupuestoDto,
  CrearPartidaDto,
  CrearPresupuestoDto,
  EliminarPartidaDto,
  EliminarPresupuestoDto,
  EnviarPresupuestoDto,
  PartidaDto,
  PresupuestoDetalleDto,
  PresupuestoVersionDto,
  RechazarPresupuestoDto,
} from './presupuestos.dto.js';
import {
  aPartidaDto,
  aTotalesFamiliaDto,
  aVersionDto,
  idsDeUsuarios,
} from './presupuestos.mapper.js';
import { PresupuestosRepositorio } from './presupuestos.repositorio.js';
import {
  EstadoPresupuesto,
  MAX_PARTIDAS_POR_VERSION,
} from './presupuestos.tipos.js';

const RESTRICCION_CODIGO_PARTIDA = 'ux_partida_version_codigo';

const versionNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'PRESUPUESTO_NO_ENCONTRADO',
    'La versión de presupuesto no existe.',
  );

const partidaNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'PARTIDA_NO_ENCONTRADA',
    'La partida no existe.',
  );

const obraNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'OBRA_NO_ENCONTRADA',
    'La obra no existe.',
  );

const codigoDuplicado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'PARTIDA_DUPLICADA',
    'Ya existe una partida con ese código en esta versión.',
    [
      {
        campo: 'codigo',
        errores: ['Ya existe una partida con ese código en esta versión.'],
      },
    ],
  );

const errorValidacion = (campo: string, mensaje: string): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.BAD_REQUEST,
    'VALIDACION',
    'Los datos enviados no son válidos.',
    [{ campo, errores: [mensaje] }],
  );

/** Datos de una partida a insertar (sin totales: los calcula el servidor). */
export interface PartidaNueva {
  codigo: string;
  familiaId: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

export interface EntradaCrearVersion {
  obraId: number;
  copiarDeId?: number;
  descripcion?: string | null;
  /** Partidas de la versión nueva cuando no se copia (importación). */
  partidas?: PartidaNueva[];
  importacionLoteId?: number;
  actor: ActorAutenticado;
}

export interface ArchivoExportado {
  nombre: string;
  contenido: Buffer;
}

@Injectable()
export class PresupuestosService {
  constructor(
    private readonly repositorio: PresupuestosRepositorio,
    private readonly obras: ObrasRepositorio,
    private readonly catalogos: CatalogosRepositorio,
    private readonly uf: UfService,
    private readonly reloj: Reloj,
  ) {}

  // --- Consultas ------------------------------------------------------------

  async listarVersiones(obraId: number): Promise<PresupuestoVersionDto[]> {
    if (!(await this.obras.buscarPorId(obraId))) throw obraNoEncontrada();
    const versiones = await this.repositorio.listarVersionesDeObra(obraId);
    const nombres = await this.repositorio.nombresDeUsuarios(
      idsDeUsuarios(versiones),
    );
    const numeros = new Map(versiones.map((v) => [v.id, v.numero]));
    return versiones.map((v) =>
      aVersionDto(v, nombres, (id) => numeros.get(id) ?? null),
    );
  }

  async obtener(id: number): Promise<PresupuestoDetalleDto> {
    const version = await this.repositorio.buscarVersion(id);
    if (!version) throw versionNoEncontrada();
    return this.armarDetalle(version);
  }

  /** Compara la versión `id` con la base indicada (por defecto, la vigente de la obra). */
  async comparar(
    id: number,
    baseId: number | undefined,
  ): Promise<ComparacionPresupuestoDto> {
    const nueva = await this.repositorio.buscarVersion(id);
    if (!nueva) throw versionNoEncontrada();
    const base =
      baseId === undefined
        ? await this.repositorio.buscarVigenteDeObra(nueva.obraId)
        : await this.repositorio.buscarVersion(baseId);
    if (!base) {
      if (baseId !== undefined) throw versionNoEncontrada();
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'SIN_VERSION_BASE',
        'La obra no tiene una versión aprobada vigente con la cual comparar.',
      );
    }
    if (base.obraId !== nueva.obraId) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'VERSIONES_DE_OBRAS_DISTINTAS',
        'Solo se pueden comparar versiones de la misma obra.',
      );
    }
    if (base.id === nueva.id) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'COMPARACION_CONSIGO_MISMA',
        'Elige dos versiones distintas para compararlas.',
      );
    }
    const [partidasBase, partidasNueva, familias, versiones] =
      await Promise.all([
        this.repositorio.listarPartidas(base.id),
        this.repositorio.listarPartidas(nueva.id),
        this.familias(),
        this.repositorio.listarVersionesDeObra(nueva.obraId),
      ]);
    const resultado = compararPartidas(
      partidasBase.map(aComparable),
      partidasNueva.map(aComparable),
      base.moneda === nueva.moneda,
    );
    const nombres = await this.repositorio.nombresDeUsuarios(
      idsDeUsuarios([base, nueva]),
    );
    const numeros = new Map(versiones.map((v) => [v.id, v.numero]));
    const aDto = (v: PresupuestoVersion) =>
      aVersionDto(v, nombres, (x) => numeros.get(x) ?? null);
    const porCodigoBase = new Map(partidasBase.map((p) => [p.codigo, p]));
    const porCodigoNueva = new Map(partidasNueva.map((p) => [p.codigo, p]));
    return {
      base: aDto(base),
      nueva: aDto(nueva),
      filas: resultado.filas.map((f) => {
        const pb = porCodigoBase.get(f.codigo);
        const pn = porCodigoNueva.get(f.codigo);
        return {
          codigo: f.codigo,
          cambio: f.cambio,
          descripcion: (pn ?? pb)!.descripcion,
          base: pb ? aPartidaDto(pb, familias) : null,
          nueva: pn ? aPartidaDto(pn, familias) : null,
          diferenciaClp: f.diferenciaClp,
        };
      }),
      totalBaseClp: resultado.totalBaseClp,
      totalNuevoClp: resultado.totalNuevoClp,
      diferenciaClp: resultado.diferenciaClp,
      nuevas: resultado.nuevas,
      eliminadas: resultado.eliminadas,
      modificadas: resultado.modificadas,
      sinCambios: resultado.sinCambios,
    };
  }

  /** Excel de una versión (partidas y resumen). */
  async exportar(id: number): Promise<ArchivoExportado> {
    const version = await this.repositorio.buscarVersion(id);
    if (!version) throw versionNoEncontrada();
    const obra = await this.obras.buscarConRelaciones(version.obraId);
    if (!obra) throw obraNoEncontrada();
    const detalle = await this.armarDetalle(version);
    return {
      nombre: nombreArchivoPresupuesto(obra.codigoCentroCosto, version.numero),
      contenido: await generarExcelPresupuesto({
        obra: {
          codigoCentroCosto: obra.codigoCentroCosto,
          nombre: obra.nombre,
          cliente: obra.cliente?.razonSocial ?? '',
        },
        detalle,
      }),
    };
  }

  // --- Versiones ------------------------------------------------------------

  /**
   * Crea una versión en borrador: vacía o copiada de otra versión de la misma obra. Las versiones
   * en UF se valorizan al valor de la UF de hoy (también al copiar).
   */
  async crear(
    obraId: number,
    dto: CrearPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    const creada = await this.repositorio.enTransaccion((tx) =>
      this.crearEnTransaccion(tx, {
        obraId,
        copiarDeId: dto.copiarDeId,
        descripcion: dto.descripcion ?? null,
        actor,
      }),
    );
    const resultado = await this.dtoDeVersion(creada);
    auditoria.entidadId = creada.id;
    auditoria.despues = resultado;
    return resultado;
  }

  /**
   * Núcleo de la creación de una versión; también lo usa la confirmación de una importación
   * dentro de su propia transacción. Bloquea la obra (numeración y vigencia seriales).
   */
  async crearEnTransaccion(
    tx: EntityManager,
    entrada: EntradaCrearVersion,
  ): Promise<PresupuestoVersion> {
    if (!(await this.obras.buscarPorIdBloqueando(entrada.obraId, tx))) {
      throw obraNoEncontrada();
    }
    const obra = (await this.obras.buscarConRelaciones(entrada.obraId, tx))!;
    exigirObraAbierta(obra);

    let origen: PresupuestoVersion | null = null;
    if (entrada.copiarDeId !== undefined) {
      origen = await this.repositorio.buscarVersion(entrada.copiarDeId, tx);
      if (!origen || origen.obraId !== entrada.obraId) {
        throw new ErrorAplicacion(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'VERSION_ORIGEN_NO_VALIDA',
          'La versión que se quiere copiar no existe en esta obra.',
        );
      }
    }
    const moneda = origen?.moneda ?? obra.monedaContrato;
    const valorUf =
      moneda === MonedaContrato.Uf
        ? await this.uf.exigirValorParaFecha(this.reloj.hoy())
        : null;
    const contexto: ContextoMoneda = {
      moneda,
      valorUf: valorUf?.valor ?? null,
    };

    const filas: PartidaNueva[] = origen
      ? (await this.repositorio.listarPartidas(origen.id, tx)).map(aNueva)
      : (entrada.partidas ?? []);
    if (filas.length > MAX_PARTIDAS_POR_VERSION) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'DEMASIADAS_PARTIDAS',
        `Una versión admite hasta ${MAX_PARTIDAS_POR_VERSION} partidas.`,
      );
    }
    const calculadas = filas.map((fila, indice) => ({
      ...fila,
      orden: indice + 1,
      ...totalesDePartida(fila.cantidad, fila.precioUnitario, contexto),
    }));
    const totales = totalizar(calculadas, moneda);

    const version = await this.repositorio.crearVersion(
      {
        obraId: entrada.obraId,
        numero: await this.repositorio.siguienteNumero(entrada.obraId, tx),
        estado: EstadoPresupuesto.Borrador,
        vigente: false,
        descripcion: entrada.descripcion ?? null,
        moneda,
        valorUf: valorUf?.valor ?? null,
        fechaValorUf: valorUf?.fecha ?? null,
        total: totales.total,
        totalClp: totales.totalClp,
        cantidadPartidas: totales.cantidadPartidas,
        copiadaDeId: origen?.id ?? null,
        importacionLoteId: entrada.importacionLoteId ?? null,
        version: 1,
        createdBy: entrada.actor.id,
        updatedBy: entrada.actor.id,
      },
      tx,
    );
    await this.repositorio.insertarPartidas(
      calculadas.map((c) => ({
        versionId: version.id,
        orden: c.orden,
        codigo: c.codigo,
        familiaId: c.familiaId,
        descripcion: c.descripcion,
        unidad: c.unidad,
        cantidad: c.cantidad,
        precioUnitario: c.precioUnitario,
        total: c.total,
        totalClp: c.totalClp,
        version: 1,
        createdBy: entrada.actor.id,
        updatedBy: entrada.actor.id,
      })),
      tx,
    );
    return version;
  }

  async actualizar(
    id: number,
    dto: ActualizarPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    const { antes, version } = await this.repositorio.enTransaccion(
      async (tx) => {
        const version = await this.versionEditable(id, tx);
        if (version.version !== dto.version) {
          throw conflictoVersion(version.version);
        }
        const antes = { descripcion: version.descripcion };
        if (dto.descripcion !== undefined)
          version.descripcion = dto.descripcion;
        version.version += 1;
        version.updatedBy = actor.id;
        await this.repositorio.guardarVersion(version, tx);
        return { antes, version };
      },
    );
    const resultado = await this.dtoDeVersion(version);
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.despues = { descripcion: resultado.descripcion };
    return resultado;
  }

  /** Borrado lógico de un borrador (las versiones en otro estado nunca se eliminan). */
  async eliminar(
    id: number,
    dto: EliminarPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const version = await this.versionEditable(id, tx);
      if (version.version !== dto.version) {
        throw conflictoVersion(version.version);
      }
      const antes = await this.dtoDeVersion(version, tx);
      version.eliminadoEn = this.reloj.ahora();
      version.eliminadoPor = actor.id;
      version.updatedBy = actor.id;
      version.version += 1;
      await this.repositorio.guardarVersion(version, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }

  // --- Flujo de aprobación --------------------------------------------------

  /** borrador → en revisión. La versión debe tener al menos una partida. */
  async enviarARevision(
    id: number,
    dto: EnviarPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    const version = await this.repositorio.enTransaccion(async (tx) => {
      const version = await this.cargarBloqueando(id, tx);
      if (version.version !== dto.version) {
        throw conflictoVersion(version.version);
      }
      exigirTransicion(version.estado, EstadoPresupuesto.EnRevision);
      await this.exigirObraAbierta(version.obraId, tx);
      exigirConPartidas(version);
      version.estado = EstadoPresupuesto.EnRevision;
      version.enviadoEn = this.reloj.ahora();
      version.enviadoPor = actor.id;
      version.version += 1;
      version.updatedBy = actor.id;
      return this.repositorio.guardarVersion(version, tx);
    });
    const resultado = await this.dtoDeVersion(version);
    auditoria.entidadId = id;
    auditoria.antes = { estado: EstadoPresupuesto.Borrador };
    auditoria.despues = resultado;
    return resultado;
  }

  /**
   * en revisión → aprobado. Aplica la política de autoaprobación (D-10) y deja esta versión como
   * la única vigente de la obra; la vigente anterior queda en el historial. Serializa por obra
   * (`FOR UPDATE` sobre la obra y la versión) para que dos aprobaciones simultáneas no choquen.
   */
  async aprobar(
    id: number,
    dto: AprobarPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    const { version, reemplazada } = await this.repositorio.enTransaccion(
      async (tx) => {
        const previa = await this.repositorio.buscarVersion(id, tx);
        if (!previa) throw versionNoEncontrada();
        // Orden de bloqueo: obra → versión (igual que al crear una versión).
        if (!(await this.obras.buscarPorIdBloqueando(previa.obraId, tx))) {
          throw obraNoEncontrada();
        }
        const version = await this.cargarBloqueando(id, tx);
        exigirPuedeAprobar(
          actor,
          { creadoPor: version.createdBy },
          'presupuesto.aprobar',
        );
        if (version.version !== dto.version) {
          throw conflictoVersion(version.version);
        }
        exigirTransicion(version.estado, EstadoPresupuesto.Aprobado);
        await this.exigirObraAbierta(version.obraId, tx);
        exigirConPartidas(version);

        const anterior = await this.repositorio.buscarVigenteDeObra(
          version.obraId,
          tx,
        );
        if (anterior) {
          anterior.vigente = false;
          anterior.version += 1;
          anterior.updatedBy = actor.id;
          await this.repositorio.guardarVersion(anterior, tx);
        }
        version.estado = EstadoPresupuesto.Aprobado;
        version.vigente = true;
        version.resueltoEn = this.reloj.ahora();
        version.resueltoPor = actor.id;
        version.motivoResolucion = dto.motivo ?? null;
        version.version += 1;
        version.updatedBy = actor.id;
        await this.repositorio.guardarVersion(version, tx);
        return { version, reemplazada: anterior };
      },
    );
    const resultado = await this.dtoDeVersion(version);
    auditoria.entidadId = id;
    auditoria.antes = { estado: EstadoPresupuesto.EnRevision };
    auditoria.despues = {
      ...resultado,
      reemplazaVersionId: reemplazada?.id ?? null,
    };
    auditoria.motivo = dto.motivo;
    return resultado;
  }

  /** en revisión → rechazado, con motivo obligatorio. */
  async rechazar(
    id: number,
    dto: RechazarPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PresupuestoVersionDto> {
    const version = await this.repositorio.enTransaccion(async (tx) => {
      const version = await this.cargarBloqueando(id, tx);
      exigirPermiso(actor, 'presupuesto.aprobar');
      if (version.version !== dto.version) {
        throw conflictoVersion(version.version);
      }
      exigirTransicion(version.estado, EstadoPresupuesto.Rechazado);
      await this.exigirObraAbierta(version.obraId, tx);
      version.estado = EstadoPresupuesto.Rechazado;
      version.resueltoEn = this.reloj.ahora();
      version.resueltoPor = actor.id;
      version.motivoResolucion = dto.motivo;
      version.version += 1;
      version.updatedBy = actor.id;
      return this.repositorio.guardarVersion(version, tx);
    });
    const resultado = await this.dtoDeVersion(version);
    auditoria.entidadId = id;
    auditoria.antes = { estado: EstadoPresupuesto.EnRevision };
    auditoria.despues = resultado;
    auditoria.motivo = dto.motivo;
    return resultado;
  }

  // --- Partidas -------------------------------------------------------------

  async crearPartida(
    versionId: number,
    dto: CrearPartidaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PartidaDto> {
    try {
      const partida = await this.repositorio.enTransaccion(async (tx) => {
        const version = await this.versionEditable(versionId, tx);
        if (version.cantidadPartidas >= MAX_PARTIDAS_POR_VERSION) {
          throw new ErrorAplicacion(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'DEMASIADAS_PARTIDAS',
            `Una versión admite hasta ${MAX_PARTIDAS_POR_VERSION} partidas.`,
          );
        }
        await this.exigirFamiliaActiva(dto.familiaId, tx);
        const totales = this.calcular(
          version,
          dto.cantidad,
          dto.precioUnitario,
        );
        const creada = await this.repositorio.crearPartida(
          {
            versionId,
            orden: (await this.repositorio.maxOrden(versionId, tx)) + 1,
            codigo: dto.codigo,
            familiaId: dto.familiaId,
            descripcion: dto.descripcion,
            unidad: dto.unidad,
            cantidad: dto.cantidad,
            precioUnitario: dto.precioUnitario,
            ...totales,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
        await this.recalcular(version, actor, tx);
        return creada;
      });
      const resultado = aPartidaDto(partida, await this.familias());
      auditoria.entidadId = partida.id;
      auditoria.despues = { ...resultado, versionId };
      return resultado;
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CODIGO_PARTIDA)) {
        throw codigoDuplicado();
      }
      throw error;
    }
  }

  async actualizarPartida(
    versionId: number,
    id: number,
    dto: ActualizarPartidaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<PartidaDto> {
    try {
      const { antes, partida } = await this.repositorio.enTransaccion(
        async (tx) => {
          const version = await this.versionEditable(versionId, tx);
          const partida = await this.repositorio.buscarPartida(
            versionId,
            id,
            tx,
          );
          if (!partida) throw partidaNoEncontrada();
          if (partida.version !== dto.version) {
            throw conflictoVersion(partida.version);
          }
          const familias = await this.familias();
          const antes = aPartidaDto(partida, familias);

          this.rechazarNulos(dto);
          if (dto.codigo !== undefined) partida.codigo = dto.codigo;
          if (
            dto.familiaId !== undefined &&
            dto.familiaId !== partida.familiaId
          ) {
            await this.exigirFamiliaActiva(dto.familiaId, tx);
            partida.familiaId = dto.familiaId;
          }
          if (dto.descripcion !== undefined) {
            partida.descripcion = dto.descripcion;
          }
          if (dto.unidad !== undefined) partida.unidad = dto.unidad;
          if (dto.cantidad !== undefined) partida.cantidad = dto.cantidad;
          if (dto.precioUnitario !== undefined) {
            partida.precioUnitario = dto.precioUnitario;
          }
          Object.assign(
            partida,
            this.calcular(version, partida.cantidad, partida.precioUnitario),
          );
          partida.version += 1;
          partida.updatedBy = actor.id;
          await this.repositorio.guardarPartida(partida, tx);
          await this.recalcular(version, actor, tx);
          return { antes, partida };
        },
      );
      const resultado = aPartidaDto(partida, await this.familias());
      auditoria.entidadId = id;
      auditoria.antes = antes;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_CODIGO_PARTIDA)) {
        throw codigoDuplicado();
      }
      throw error;
    }
  }

  async eliminarPartida(
    versionId: number,
    id: number,
    dto: EliminarPartidaDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const version = await this.versionEditable(versionId, tx);
      const partida = await this.repositorio.buscarPartida(versionId, id, tx);
      if (!partida) throw partidaNoEncontrada();
      if (partida.version !== dto.version) {
        throw conflictoVersion(partida.version);
      }
      const antes = aPartidaDto(partida, await this.familias());
      await this.repositorio.eliminarPartida(partida, tx);
      await this.recalcular(version, actor, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
  }

  // ---------------------------------------------------------------------------

  /** Versión bloqueada (`FOR UPDATE`) o 404. */
  private async cargarBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<PresupuestoVersion> {
    const version = await this.repositorio.buscarVersionBloqueando(id, tx);
    if (!version) throw versionNoEncontrada();
    return version;
  }

  /** Versión bloqueada que además debe ser un borrador de una obra no cerrada. */
  private async versionEditable(
    id: number,
    tx: EntityManager,
  ): Promise<PresupuestoVersion> {
    const version = await this.cargarBloqueando(id, tx);
    exigirEditable(version.estado);
    await this.exigirObraAbierta(version.obraId, tx);
    return version;
  }

  private async exigirObraAbierta(
    obraId: number,
    tx: EntityManager,
  ): Promise<void> {
    const obra = await this.obras.buscarConRelaciones(obraId, tx);
    if (!obra) throw obraNoEncontrada();
    exigirObraAbierta(obra);
  }

  /** Totales de una partida según la moneda de la versión (400 si precio o cantidad no valen). */
  private calcular(
    version: PresupuestoVersion,
    cantidad: number,
    precioUnitario: number,
  ) {
    const errorCantidad = errorDeCantidad(cantidad);
    if (errorCantidad) throw errorValidacion('cantidad', errorCantidad);
    const errorPrecio = errorDePrecio(precioUnitario, version.moneda);
    if (errorPrecio) throw errorValidacion('precioUnitario', errorPrecio);
    return totalesDePartida(cantidad, precioUnitario, {
      moneda: version.moneda,
      valorUf: version.valorUf,
    });
  }

  /** Recalcula los totales de la versión desde sus partidas y sube su `version`. */
  private async recalcular(
    version: PresupuestoVersion,
    actor: ActorAutenticado,
    tx: EntityManager,
  ): Promise<void> {
    const partidas = await this.repositorio.listarPartidas(version.id, tx);
    const totales = totalizar(partidas, version.moneda);
    version.total = totales.total;
    version.totalClp = totales.totalClp;
    version.cantidadPartidas = totales.cantidadPartidas;
    version.version += 1;
    version.updatedBy = actor.id;
    await this.repositorio.guardarVersion(version, tx);
  }

  /** Los campos obligatorios no se pueden vaciar con `null`. */
  private rechazarNulos(dto: ActualizarPartidaDto): void {
    for (const campo of [
      'codigo',
      'familiaId',
      'descripcion',
      'unidad',
      'cantidad',
      'precioUnitario',
    ] as const) {
      if ((dto[campo] as unknown) === null) {
        throw errorValidacion(campo, 'Este campo es obligatorio.');
      }
    }
  }

  private async exigirFamiliaActiva(
    familiaId: number,
    tx: EntityManager,
  ): Promise<void> {
    const familia = await this.catalogos.buscarPorId(
      TipoCatalogo.FamiliaPartida,
      familiaId,
      tx,
    );
    if (!familia?.activo) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'FAMILIA_NO_DISPONIBLE',
        'La familia seleccionada no existe o está inactiva.',
        [
          {
            campo: 'familiaId',
            errores: ['La familia seleccionada no existe o está inactiva.'],
          },
        ],
      );
    }
  }

  /** Todas las familias del catálogo (incluso inactivas, para mostrar partidas antiguas). */
  private async familias(): Promise<Map<number, Catalogo>> {
    const items = await this.catalogos.listar(
      TipoCatalogo.FamiliaPartida,
      true,
    );
    return new Map(items.map((i) => [i.id, i]));
  }

  private async armarDetalle(
    version: PresupuestoVersion,
  ): Promise<PresupuestoDetalleDto> {
    const [partidas, familias, dto] = await Promise.all([
      this.repositorio.listarPartidas(version.id),
      this.familias(),
      this.dtoDeVersion(version),
    ]);
    return {
      version: dto,
      partidas: partidas.map((p) => aPartidaDto(p, familias)),
      totalesPorFamilia: aTotalesFamiliaDto(
        totalizar(partidas, version.moneda).porFamilia,
        familias,
      ),
    };
  }

  private async dtoDeVersion(
    version: PresupuestoVersion,
    tx?: EntityManager,
  ): Promise<PresupuestoVersionDto> {
    const nombres = await this.repositorio.nombresDeUsuarios(
      idsDeUsuarios([version]),
    );
    const origen =
      version.copiadaDeId === null
        ? null
        : await this.repositorio.buscarVersion(version.copiadaDeId, tx);
    return aVersionDto(version, nombres, () => origen?.numero ?? null);
  }
}

/** Una obra cerrada es de solo lectura. */
function exigirObraAbierta(obra: Obra): void {
  if (obra.estado?.codigo === CodigoEstadoObra.Cerrada) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'OBRA_CERRADA',
      'La obra está cerrada: solo se puede consultar.',
    );
  }
}

function exigirConPartidas(version: PresupuestoVersion): void {
  if (version.cantidadPartidas === 0) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PRESUPUESTO_VACIO',
      'La versión no tiene partidas.',
    );
  }
}

const aNueva = (p: Partida): PartidaNueva => ({
  codigo: p.codigo,
  familiaId: p.familiaId,
  descripcion: p.descripcion,
  unidad: p.unidad,
  cantidad: p.cantidad,
  precioUnitario: p.precioUnitario,
});

const aComparable = (p: Partida): PartidaComparable => ({
  codigo: p.codigo,
  orden: p.orden,
  familiaId: p.familiaId,
  descripcion: p.descripcion,
  unidad: p.unidad,
  cantidad: p.cantidad,
  precioUnitario: p.precioUnitario,
  total: p.total,
  totalClp: p.totalClp,
});
