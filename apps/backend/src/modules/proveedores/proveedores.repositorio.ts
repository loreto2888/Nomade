import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  Not,
  Repository,
  type EntityManager,
} from 'typeorm';
import { RepositorioMaestro } from '../../common/base-datos/repositorio-maestro.js';
import { escaparLike } from '../../common/paginacion/like.js';
import {
  sentidoSql,
  type DireccionOrden,
} from '../../common/paginacion/orden.js';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { CuentaBancariaProveedor, Proveedor } from './proveedor.entity.js';

export interface FiltroProveedores {
  q?: string;
  ordenarPor?: 'razonSocial' | 'rut' | 'creadoEn';
  direccion?: DireccionOrden;
  pagina: number;
  tamanio: number;
}

const COLUMNA_ORDEN = {
  razonSocial: 'p.razonSocial',
  rut: 'p.rut',
  creadoEn: 'p.createdAt',
} as const;

@Injectable()
export class ProveedoresRepositorio extends RepositorioMaestro<Proveedor> {
  constructor(
    @InjectRepository(Proveedor) repositorio: Repository<Proveedor>,
    dataSource: DataSource,
  ) {
    super(repositorio, dataSource);
  }

  buscarPorRut(rut: string, tx?: EntityManager): Promise<Proveedor | null> {
    return this.de(tx).findOne({ where: { rut, eliminadoEn: IsNull() } });
  }

  async listar(filtro: FiltroProveedores): Promise<[Proveedor[], number]> {
    const consulta = this.repositorio
      .createQueryBuilder('p')
      .where('p.eliminadoEn IS NULL');
    if (filtro.q) {
      consulta.andWhere(
        `(p.razonSocial ILIKE :q ESCAPE '\\' OR p.nombreFantasia ILIKE :q ESCAPE '\\' OR p.rut ILIKE :qRut ESCAPE '\\')`,
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
      .addOrderBy('p.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  /** Ids (de los dados) que tienen al menos una cuenta bancaria vigente. */
  async conCuentasBancarias(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const filas = await this.dataSource.query<{ proveedor_id: string }[]>(
      `SELECT DISTINCT proveedor_id FROM nomade.proveedor_cuenta_bancaria
       WHERE proveedor_id = ANY($1::bigint[]) AND eliminado_en IS NULL`,
      [ids],
    );
    return new Set(filas.map((f) => Number(f.proveedor_id)));
  }
}

@Injectable()
export class CuentasBancariasRepositorio extends RepositorioMaestro<CuentaBancariaProveedor> {
  constructor(
    @InjectRepository(CuentaBancariaProveedor)
    repositorio: Repository<CuentaBancariaProveedor>,
    dataSource: DataSource,
  ) {
    super(repositorio, dataSource);
  }

  listarPorProveedor(
    proveedorId: number,
    tx?: EntityManager,
  ): Promise<CuentaBancariaProveedor[]> {
    return this.de(tx).find({
      where: { proveedorId, eliminadoEn: IsNull() },
      order: { principal: 'DESC', id: 'ASC' },
    });
  }

  buscarDuplicada(
    proveedorId: number,
    banco: string,
    numeroCuenta: string,
    tx: EntityManager,
  ): Promise<CuentaBancariaProveedor | null> {
    return this.de(tx)
      .createQueryBuilder('c')
      .where('c.proveedorId = :proveedorId', { proveedorId })
      .andWhere('lower(c.banco) = lower(:banco)', { banco })
      .andWhere('c.numeroCuenta = :numeroCuenta', { numeroCuenta })
      .andWhere('c.eliminadoEn IS NULL')
      .getOne();
  }

  /** Quita la marca de principal a las demás cuentas vigentes del proveedor. */
  async quitarPrincipalExcepto(
    proveedorId: number,
    exceptoId: number | null,
    usuarioId: number,
    tx: EntityManager,
  ): Promise<void> {
    const consulta = this.de(tx)
      .createQueryBuilder()
      .update()
      .set({ principal: false, updatedBy: usuarioId })
      .where('proveedor_id = :proveedorId', { proveedorId })
      .andWhere('principal = true')
      .andWhere('eliminado_en IS NULL');
    if (exceptoId !== null)
      consulta.andWhere('id <> :exceptoId', { exceptoId });
    await consulta.execute();
  }

  /** Primera cuenta vigente del proveedor distinta de `exceptoId` (para promoverla a principal). */
  primeraVigenteExcepto(
    proveedorId: number,
    exceptoId: number,
    tx: EntityManager,
  ): Promise<CuentaBancariaProveedor | null> {
    return this.de(tx).findOne({
      where: { proveedorId, eliminadoEn: IsNull(), id: Not(exceptoId) },
      order: { id: 'ASC' },
    });
  }
}
