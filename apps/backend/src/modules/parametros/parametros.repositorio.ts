import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, type EntityManager } from 'typeorm';
import { Parametro, ParametroValor } from './parametro.entity.js';

@Injectable()
export class ParametrosRepositorio {
  constructor(
    @InjectRepository(Parametro)
    private readonly parametros: Repository<Parametro>,
    @InjectRepository(ParametroValor)
    private readonly valores: Repository<ParametroValor>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  listar(): Promise<Parametro[]> {
    return this.parametros.find({
      order: { categoria: 'ASC', nombre: 'ASC', id: 'ASC' },
    });
  }

  buscarPorId(id: number, tx?: EntityManager): Promise<Parametro | null> {
    return (tx ? tx.getRepository(Parametro) : this.parametros).findOne({
      where: { id },
    });
  }

  buscarPorCodigo(codigo: string): Promise<Parametro | null> {
    return this.parametros.findOne({ where: { codigo } });
  }

  buscarPorIdBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<Parametro | null> {
    return tx
      .getRepository(Parametro)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  guardarParametro(
    parametro: Parametro,
    tx: EntityManager,
  ): Promise<Parametro> {
    return tx.getRepository(Parametro).save(parametro);
  }

  valoresDe(
    parametroIds: number[],
    tx?: EntityManager,
  ): Promise<ParametroValor[]> {
    if (parametroIds.length === 0) return Promise.resolve([]);
    return (tx ? tx.getRepository(ParametroValor) : this.valores).find({
      where: { parametroId: In(parametroIds) },
      order: { vigenteDesde: 'DESC' },
    });
  }

  buscarValor(id: number, tx: EntityManager): Promise<ParametroValor | null> {
    return tx.getRepository(ParametroValor).findOne({ where: { id } });
  }

  crearValor(
    datos: Partial<ParametroValor>,
    tx: EntityManager,
  ): Promise<ParametroValor> {
    const repo = tx.getRepository(ParametroValor);
    return repo.save(repo.create(datos));
  }

  async eliminarValor(id: number, tx: EntityManager): Promise<void> {
    await tx.getRepository(ParametroValor).delete(id);
  }
}
