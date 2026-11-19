import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import type { Catalogo } from './catalogo.entity.js';
import type {
  ActualizarCatalogoItemDto,
  CatalogoItemDto,
  CrearCatalogoItemDto,
} from './catalogos.dto.js';
import { CatalogosRepositorio } from './catalogos.repositorio.js';
import type { TipoCatalogo } from './catalogos.tipos.js';

export function aCatalogoItemDto(item: Catalogo): CatalogoItemDto {
  return {
    id: item.id,
    tipo: item.tipo,
    codigo: item.codigo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    orden: item.orden,
    activo: item.activo,
    protegido: item.protegido,
    version: item.version,
  };
}

const noEncontrado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'CATALOGO_ITEM_NO_ENCONTRADO',
    'El ítem del catálogo no existe.',
  );

const codigoDuplicado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CATALOGO_CODIGO_DUPLICADO',
    'Ya existe un ítem con ese código en este catálogo.',
  );

const nombreDuplicado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CATALOGO_NOMBRE_DUPLICADO',
    'Ya existe un ítem con ese nombre en este catálogo.',
  );

/** Traduce una violación de unicidad de PostgreSQL (carrera entre dos altas) al error de negocio. */
function traducirDuplicado(error: unknown): unknown {
  if (esViolacionUnica(error, 'ux_catalogo_tipo_codigo'))
    return codigoDuplicado();
  if (esViolacionUnica(error, 'ux_catalogo_tipo_nombre'))
    return nombreDuplicado();
  return error;
}

@Injectable()
export class CatalogosService {
  constructor(private readonly catalogos: CatalogosRepositorio) {}

  async listar(
    tipo: TipoCatalogo,
    incluirInactivos = false,
  ): Promise<CatalogoItemDto[]> {
    return (await this.catalogos.listar(tipo, incluirInactivos)).map(
      aCatalogoItemDto,
    );
  }

  async crear(
    tipo: TipoCatalogo,
    dto: CrearCatalogoItemDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CatalogoItemDto> {
    try {
      const item = await this.catalogos.enTransaccion(async (tx) => {
        if (await this.catalogos.buscarPorCodigo(tipo, dto.codigo, tx)) {
          throw codigoDuplicado();
        }
        return this.catalogos.crear(
          {
            tipo,
            codigo: dto.codigo,
            nombre: dto.nombre,
            descripcion: dto.descripcion ?? null,
            orden: dto.orden ?? 0,
            activo: true,
            protegido: false,
            version: 1,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          tx,
        );
      });
      const resultado = aCatalogoItemDto(item);
      auditoria.entidadId = item.id;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      throw traducirDuplicado(error);
    }
  }

  async actualizar(
    tipo: TipoCatalogo,
    id: number,
    dto: ActualizarCatalogoItemDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<CatalogoItemDto> {
    try {
      const { antes, despues } = await this.catalogos.enTransaccion(
        async (tx) => {
          const item = await this.catalogos.buscarPorIdBloqueando(tipo, id, tx);
          if (!item) throw noEncontrado();
          if (item.version !== dto.version)
            throw conflictoVersion(item.version);
          const antes = aCatalogoItemDto(item);
          if (dto.activo === false && item.protegido) {
            throw new ErrorAplicacion(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'CATALOGO_ITEM_PROTEGIDO',
              'Este ítem lo usa la aplicación y no se puede desactivar. Puedes cambiar su nombre.',
            );
          }
          if (dto.nombre !== undefined) item.nombre = dto.nombre;
          if (dto.descripcion !== undefined) item.descripcion = dto.descripcion;
          if (dto.orden !== undefined) item.orden = dto.orden;
          if (dto.activo !== undefined) item.activo = dto.activo;
          item.version += 1;
          item.updatedBy = actor.id;
          const guardado = await this.catalogos.guardar(item, tx);
          return { antes, despues: aCatalogoItemDto(guardado) };
        },
      );
      auditoria.entidadId = id;
      auditoria.antes = antes;
      auditoria.despues = despues;
      return despues;
    } catch (error) {
      throw traducirDuplicado(error);
    }
  }
}
