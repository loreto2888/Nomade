import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, type EntityManager } from 'typeorm';
import { Catalogo } from './catalogo.entity.js';
import type { TipoCatalogo } from './catalogos.tipos.js';

@Injectable()
export class CatalogosRepositorio {
  constructor(
    @InjectRepository(Catalogo)
    private readonly repositorio: Repository<Catalogo>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  private de(tx?: EntityManager): Repository<Catalogo> {
    return tx ? tx.getRepository(Catalogo) : this.repositorio;
  }

  listar(tipo: TipoCatalogo, incluirInactivos: boolean): Promise<Catalogo[]> {
    return this.repositorio.find({
      where: incluirInactivos ? { tipo } : { tipo, activo: true },
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  buscarPorId(
    tipo: TipoCatalogo,
    id: number,
    tx?: EntityManager,
  ): Promise<Catalogo | null> {
    return this.de(tx).findOne({ where: { tipo, id } });
  }

  buscarPorIdBloqueando(
    tipo: TipoCatalogo,
    id: number,
    tx: EntityManager,
  ): Promise<Catalogo | null> {
    return this.de(tx).findOne({
      where: { tipo, id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  buscarPorCodigo(
    tipo: TipoCatalogo,
    codigo: string,
    tx?: EntityManager,
  ): Promise<Catalogo | null> {
    return this.de(tx).findOne({ where: { tipo, codigo } });
  }

  crear(datos: Partial<Catalogo>, tx?: EntityManager): Promise<Catalogo> {
    const repo = this.de(tx);
    return repo.save(repo.create(datos));
  }

  guardar(item: Catalogo, tx?: EntityManager): Promise<Catalogo> {
    return this.de(tx).save(item);
  }
}
