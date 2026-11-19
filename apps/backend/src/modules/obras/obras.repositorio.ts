import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository, type EntityManager } from 'typeorm';
import { RepositorioMaestro } from '../../common/base-datos/repositorio-maestro.js';
import { escaparLike } from '../../common/paginacion/like.js';
import {
  sentidoSql,
  type DireccionOrden,
} from '../../common/paginacion/orden.js';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { Obra } from './obra.entity.js';
import type { CampoOrdenObras } from './obras.tipos.js';

export interface FiltroObras {
  q?: string;
  estadoId?: number;
  clienteId?: number;
  ordenarPor?: CampoOrdenObras;
  direccion?: DireccionOrden;
  pagina: number;
  tamanio: number;
}

const COLUMNA_ORDEN: Record<CampoOrdenObras, string> = {
  codigoCentroCosto: 'o.codigoCentroCosto',
  nombre: 'o.nombre',
  cliente: 'c.razonSocial',
  estado: 'e.orden',
  fechaInicio: 'o.fechaInicio',
  creadoEn: 'o.createdAt',
};

@Injectable()
export class ObrasRepositorio extends RepositorioMaestro<Obra> {
  constructor(
    @InjectRepository(Obra) repositorio: Repository<Obra>,
    dataSource: DataSource,
  ) {
    super(repositorio, dataSource);
  }

  buscarPorCodigo(codigo: string, tx?: EntityManager): Promise<Obra | null> {
    return this.de(tx).findOne({
      where: { codigoCentroCosto: codigo, eliminadoEn: IsNull() },
    });
  }

  /** La obra con su cliente y estado cargados (para proyectar al DTO). */
  buscarConRelaciones(id: number, tx?: EntityManager): Promise<Obra | null> {
    return this.de(tx).findOne({
      where: { id, eliminadoEn: IsNull() },
      relations: { cliente: true, estado: true },
    });
  }

  async listar(filtro: FiltroObras): Promise<[Obra[], number]> {
    const consulta = this.repositorio
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.cliente', 'c')
      .innerJoinAndSelect('o.estado', 'e')
      .where('o.eliminadoEn IS NULL');
    if (filtro.q) {
      consulta.andWhere(
        `(o.nombre ILIKE :q ESCAPE '\\' OR o.codigoCentroCosto ILIKE :q ESCAPE '\\' OR o.responsable ILIKE :q ESCAPE '\\' OR c.razonSocial ILIKE :q ESCAPE '\\')`,
        { q: `%${escaparLike(filtro.q)}%` },
      );
    }
    if (filtro.estadoId !== undefined) {
      consulta.andWhere('o.estadoId = :estadoId', {
        estadoId: filtro.estadoId,
      });
    }
    if (filtro.clienteId !== undefined) {
      consulta.andWhere('o.clienteId = :clienteId', {
        clienteId: filtro.clienteId,
      });
    }
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy(
        COLUMNA_ORDEN[filtro.ordenarPor ?? 'codigoCentroCosto'],
        sentidoSql(filtro.direccion),
      )
      .addOrderBy('o.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  /** Adjuntos vigentes de la obra. */
  async contarAdjuntos(obraId: number): Promise<number> {
    const filas = await this.dataSource.query<{ total: number }[]>(
      `SELECT count(*)::int AS total FROM nomade.adjunto
       WHERE entidad_tipo = 'obra' AND entidad_id = $1 AND eliminado_en IS NULL`,
      [obraId],
    );
    return filas[0]?.total ?? 0;
  }
}
