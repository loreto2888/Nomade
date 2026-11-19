import { HttpStatus } from '@nestjs/common';
import type { DeepPartial, EntityManager } from 'typeorm';
import type { ActorAutenticado, ContextoAuditoria } from '../auth/actor.js';
import { esViolacionUnica } from '../base-datos/errores-pg.js';
import { conflictoVersion } from '../errores/conflicto-version.js';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';
import type {
  ActualizarContraparteDto,
  ContraparteDto,
  DatosContraparteDto,
  EliminarDto,
} from './contraparte.dto.js';
import type { EntidadContraparte } from './contraparte.entity.js';
import { aplicarCamposContraparte } from './contraparte.mapper.js';

/** Operaciones que el servicio común necesita del repositorio de cada maestro. */
export interface RepositorioContraparte<E extends EntidadContraparte> {
  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T>;
  buscarPorId(id: number, tx?: EntityManager): Promise<E | null>;
  buscarPorIdBloqueando(id: number, tx: EntityManager): Promise<E | null>;
  buscarPorRut(rut: string, tx?: EntityManager): Promise<E | null>;
  crear(datos: DeepPartial<E>, tx?: EntityManager): Promise<E>;
  guardar(entidad: E, tx?: EntityManager): Promise<E>;
}

export interface TextosContraparte {
  codigoNoEncontrado: string;
  mensajeNoEncontrado: string;
  mensajeRutDuplicado: string;
  /** Restricción única de PostgreSQL sobre el RUT vigente. */
  restriccionRut: string;
}

/**
 * Casos de uso comunes de clientes y proveedores: alta, modificación con
 * control de versión (409), borrado lógico y unicidad del RUT vigente.
 * Cada maestro aporta su proyección y sus reglas de eliminación.
 */
export abstract class ServicioContraparte<
  E extends EntidadContraparte,
  D extends ContraparteDto,
> {
  protected constructor(
    protected readonly repositorio: RepositorioContraparte<E>,
    private readonly textos: TextosContraparte,
  ) {}

  /** Proyecciones públicas de varias filas (puede agregar datos derivados). */
  protected abstract aDtos(entidades: E[]): Promise<D[]>;

  /** Regla del maestro para poder eliminar el registro (lanza 422 si no). */
  protected abstract validarEliminacion(
    entidad: E,
    tx: EntityManager,
  ): Promise<void>;

  protected async aDto(entidad: E): Promise<D> {
    return (await this.aDtos([entidad]))[0];
  }

  protected noEncontrado(): ErrorAplicacion {
    return new ErrorAplicacion(
      HttpStatus.NOT_FOUND,
      this.textos.codigoNoEncontrado,
      this.textos.mensajeNoEncontrado,
    );
  }

  protected rutDuplicado(): ErrorAplicacion {
    return new ErrorAplicacion(
      HttpStatus.CONFLICT,
      'RUT_DUPLICADO',
      this.textos.mensajeRutDuplicado,
    );
  }

  async obtener(id: number): Promise<D> {
    const entidad = await this.repositorio.buscarPorId(id);
    if (!entidad) throw this.noEncontrado();
    return this.aDto(entidad);
  }

  async crear(
    dto: DatosContraparteDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<D> {
    try {
      const entidad = await this.repositorio.enTransaccion(async (tx) => {
        if (await this.repositorio.buscarPorRut(dto.rut, tx)) {
          throw this.rutDuplicado();
        }
        const datos = {
          rut: dto.rut,
          razonSocial: dto.razonSocial,
          nombreFantasia: dto.nombreFantasia ?? null,
          giro: dto.giro ?? null,
          contactoNombre: dto.contactoNombre ?? null,
          correo: dto.correo ?? null,
          telefono: dto.telefono ?? null,
          direccion: dto.direccion ?? null,
          version: 1,
          createdBy: actor.id,
          updatedBy: actor.id,
        };
        return this.repositorio.crear(datos as unknown as DeepPartial<E>, tx);
      });
      const resultado = await this.aDto(entidad);
      auditoria.entidadId = entidad.id;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      if (esViolacionUnica(error, this.textos.restriccionRut)) {
        throw this.rutDuplicado();
      }
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: ActualizarContraparteDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<D> {
    try {
      const { antes, despues } = await this.repositorio.enTransaccion(
        async (tx) => {
          const entidad = await this.repositorio.buscarPorIdBloqueando(id, tx);
          if (!entidad) throw this.noEncontrado();
          if (entidad.version !== dto.version) {
            throw conflictoVersion(entidad.version);
          }
          const antes = await this.aDto(entidad);
          if (dto.rut !== undefined && dto.rut !== entidad.rut) {
            const otro = await this.repositorio.buscarPorRut(dto.rut, tx);
            if (otro && otro.id !== entidad.id) throw this.rutDuplicado();
          }
          aplicarCamposContraparte(entidad, dto);
          entidad.version += 1;
          entidad.updatedBy = actor.id;
          const guardada = await this.repositorio.guardar(entidad, tx);
          return { antes, despues: await this.aDto(guardada) };
        },
      );
      auditoria.entidadId = id;
      auditoria.antes = antes;
      auditoria.despues = despues;
      return despues;
    } catch (error) {
      if (esViolacionUnica(error, this.textos.restriccionRut)) {
        throw this.rutDuplicado();
      }
      throw error;
    }
  }

  /** Borrado lógico: el registro se conserva con `eliminadoEn` (D-13). */
  async eliminar(
    id: number,
    dto: EliminarDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const antes = await this.repositorio.enTransaccion(async (tx) => {
      const entidad = await this.repositorio.buscarPorIdBloqueando(id, tx);
      if (!entidad) throw this.noEncontrado();
      if (entidad.version !== dto.version) {
        throw conflictoVersion(entidad.version);
      }
      await this.validarEliminacion(entidad, tx);
      const antes = await this.aDto(entidad);
      entidad.eliminadoEn = new Date();
      entidad.eliminadoPor = actor.id;
      entidad.updatedBy = actor.id;
      entidad.version += 1;
      await this.repositorio.guardar(entidad, tx);
      return antes;
    });
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.motivo = dto.motivo;
  }
}
