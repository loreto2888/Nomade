import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
  type DeepPartial,
  type EntityManager,
} from 'typeorm';
import { nombresDeUsuarios } from '../../common/base-datos/nombres-usuarios.js';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { ImportacionFila } from './importacion-fila.entity.js';
import { ImportacionLote } from './importacion-lote.entity.js';
import type { EstadoImportacion } from './importaciones.tipos.js';

const LOTE_INSERCION = 500;

export interface FiltroLotes {
  obraId?: number;
  estado?: EstadoImportacion;
  pagina: number;
  tamanio: number;
}

@Injectable()
export class ImportacionesRepositorio {
  constructor(
    @InjectRepository(ImportacionLote)
    private readonly lotes: Repository<ImportacionLote>,
    @InjectRepository(ImportacionFila)
    private readonly filas: Repository<ImportacionFila>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  private deLotes(tx?: EntityManager): Repository<ImportacionLote> {
    return tx ? tx.getRepository(ImportacionLote) : this.lotes;
  }

  private deFilas(tx?: EntityManager): Repository<ImportacionFila> {
    return tx ? tx.getRepository(ImportacionFila) : this.filas;
  }

  /** Crea el lote y todas sus filas en la transacción dada. */
  async crearLote(
    datos: DeepPartial<ImportacionLote>,
    filas: DeepPartial<ImportacionFila>[],
    tx: EntityManager,
  ): Promise<ImportacionLote> {
    const lotes = this.deLotes(tx);
    const lote = await lotes.save(lotes.create(datos));
    const repoFilas = this.deFilas(tx);
    for (let i = 0; i < filas.length; i += LOTE_INSERCION) {
      await repoFilas.insert(
        filas
          .slice(i, i + LOTE_INSERCION)
          .map((f) => ({ ...f, loteId: lote.id })),
      );
    }
    return lote;
  }

  buscarLote(id: number, tx?: EntityManager): Promise<ImportacionLote | null> {
    return this.deLotes(tx).findOne({
      where: { id },
      relations: { obra: true },
    });
  }

  /** `SELECT … FOR UPDATE` del lote (sin relaciones; exige transacción). */
  buscarLoteBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<ImportacionLote | null> {
    return this.deLotes(tx).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  guardarLote(
    lote: ImportacionLote,
    tx: EntityManager,
  ): Promise<ImportacionLote> {
    return this.deLotes(tx).save(lote);
  }

  listarLotes(filtro: FiltroLotes): Promise<[ImportacionLote[], number]> {
    const consulta = this.lotes
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.obra', 'o');
    if (filtro.obraId !== undefined) {
      consulta.andWhere('l.obraId = :obraId', { obraId: filtro.obraId });
    }
    if (filtro.estado !== undefined) {
      consulta.andWhere('l.estado = :estado', { estado: filtro.estado });
    }
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy('l.createdAt', 'DESC')
      .addOrderBy('l.id', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  listarFilas(
    loteId: number,
    filtro: { soloErrores: boolean; pagina: number; tamanio: number },
  ): Promise<[ImportacionFila[], number]> {
    const { skip, take } = rangoPagina(filtro);
    return this.filas.findAndCount({
      where: filtro.soloErrores ? { loteId, valida: false } : { loteId },
      order: { numeroFila: 'ASC' },
      skip,
      take,
    });
  }

  todasLasFilas(loteId: number, tx: EntityManager): Promise<ImportacionFila[]> {
    return this.deFilas(tx).find({
      where: { loteId },
      order: { numeroFila: 'ASC' },
    });
  }

  nombresDeUsuarios(ids: number[]): Promise<Map<number, string>> {
    return nombresDeUsuarios(this.dataSource, ids);
  }
}
