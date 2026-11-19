import {
  DataSource,
  IsNull,
  type DeepPartial,
  type EntityManager,
  type FindOptionsWhere,
  type Repository,
} from 'typeorm';
import type { EntidadMaestroEliminable } from './entidad-maestro.js';

/**
 * Acceso a datos común de los maestros con borrado lógico. Los métodos
 * aceptan el `EntityManager` de una transacción; las búsquedas por id ignoran
 * los registros eliminados.
 */
export abstract class RepositorioMaestro<E extends EntidadMaestroEliminable> {
  protected constructor(
    protected readonly repositorio: Repository<E>,
    protected readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  protected de(tx?: EntityManager): Repository<E> {
    return tx ? tx.getRepository<E>(this.repositorio.target) : this.repositorio;
  }

  buscarPorId(id: number, tx?: EntityManager): Promise<E | null> {
    return this.de(tx).findOne({
      where: { id, eliminadoEn: IsNull() } as FindOptionsWhere<E>,
    });
  }

  /** `SELECT … FOR UPDATE` de la fila vigente (exige transacción). */
  buscarPorIdBloqueando(id: number, tx: EntityManager): Promise<E | null> {
    return this.de(tx).findOne({
      where: { id, eliminadoEn: IsNull() } as FindOptionsWhere<E>,
      lock: { mode: 'pessimistic_write' },
    });
  }

  crear(datos: DeepPartial<E>, tx?: EntityManager): Promise<E> {
    const repo = this.de(tx);
    return repo.save(repo.create(datos));
  }

  guardar(entidad: E, tx?: EntityManager): Promise<E> {
    return this.de(tx).save(entidad);
  }
}
