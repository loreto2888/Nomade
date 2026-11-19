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
import { Cliente } from './cliente.entity.js';

export interface FiltroClientes {
  q?: string;
  ordenarPor?: 'razonSocial' | 'rut' | 'creadoEn';
  direccion?: DireccionOrden;
  pagina: number;
  tamanio: number;
}

const COLUMNA_ORDEN = {
  razonSocial: 'c.razonSocial',
  rut: 'c.rut',
  creadoEn: 'c.createdAt',
} as const;

@Injectable()
export class ClientesRepositorio extends RepositorioMaestro<Cliente> {
  constructor(
    @InjectRepository(Cliente) repositorio: Repository<Cliente>,
    dataSource: DataSource,
  ) {
    super(repositorio, dataSource);
  }

  buscarPorRut(rut: string, tx?: EntityManager): Promise<Cliente | null> {
    return this.de(tx).findOne({ where: { rut, eliminadoEn: IsNull() } });
  }

  async listar(filtro: FiltroClientes): Promise<[Cliente[], number]> {
    const consulta = this.repositorio
      .createQueryBuilder('c')
      .where('c.eliminadoEn IS NULL');
    if (filtro.q) {
      consulta.andWhere(
        `(c.razonSocial ILIKE :q ESCAPE '\\' OR c.nombreFantasia ILIKE :q ESCAPE '\\' OR c.rut ILIKE :qRut ESCAPE '\\')`,
        {
          q: `%${escaparLike(filtro.q)}%`,
          qRut: `%${escaparLike(filtro.q.replace(/[.]/g, ''))}%`,
        },
      );
    }
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy(
        COLUMNA_ORDEN[filtro.ordenarPor ?? 'razonSocial'],
        sentidoSql(filtro.direccion),
      )
      .addOrderBy('c.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  /** Obras vigentes del cliente: impiden eliminarlo. */
  async contarObrasVigentes(
    clienteId: number,
    tx: EntityManager,
  ): Promise<number> {
    const filas = await tx.query<{ total: number }[]>(
      'SELECT count(*)::int AS total FROM nomade.obra WHERE cliente_id = $1 AND eliminado_en IS NULL',
      [clienteId],
    );
    return filas[0]?.total ?? 0;
  }
}
