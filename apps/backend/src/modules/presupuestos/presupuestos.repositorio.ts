import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  Repository,
  type DeepPartial,
  type EntityManager,
} from 'typeorm';
import { nombresDeUsuarios } from '../../common/base-datos/nombres-usuarios.js';
import { Partida } from './partida.entity.js';
import { PresupuestoVersion } from './presupuesto-version.entity.js';

/** Tamaño de los lotes de inserción de partidas (límite de parámetros de PostgreSQL). */
const LOTE_INSERCION = 500;

/** Acceso a datos de versiones de presupuesto y de sus partidas. */
@Injectable()
export class PresupuestosRepositorio {
  constructor(
    @InjectRepository(PresupuestoVersion)
    private readonly versiones: Repository<PresupuestoVersion>,
    @InjectRepository(Partida)
    private readonly partidas: Repository<Partida>,
    private readonly dataSource: DataSource,
  ) {}

  enTransaccion<T>(trabajo: (tx: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(trabajo);
  }

  private deVersiones(tx?: EntityManager): Repository<PresupuestoVersion> {
    return tx ? tx.getRepository(PresupuestoVersion) : this.versiones;
  }

  private dePartidas(tx?: EntityManager): Repository<Partida> {
    return tx ? tx.getRepository(Partida) : this.partidas;
  }

  // --- Versiones ------------------------------------------------------------

  listarVersionesDeObra(obraId: number): Promise<PresupuestoVersion[]> {
    return this.versiones.find({
      where: { obraId, eliminadoEn: IsNull() },
      order: { numero: 'DESC' },
    });
  }

  buscarVersion(
    id: number,
    tx?: EntityManager,
  ): Promise<PresupuestoVersion | null> {
    return this.deVersiones(tx).findOne({
      where: { id, eliminadoEn: IsNull() },
    });
  }

  /** `SELECT … FOR UPDATE` de la versión vigente (no eliminada). Exige transacción. */
  buscarVersionBloqueando(
    id: number,
    tx: EntityManager,
  ): Promise<PresupuestoVersion | null> {
    return this.deVersiones(tx).findOne({
      where: { id, eliminadoEn: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
  }

  buscarVigenteDeObra(
    obraId: number,
    tx?: EntityManager,
  ): Promise<PresupuestoVersion | null> {
    return this.deVersiones(tx).findOne({
      where: { obraId, vigente: true, eliminadoEn: IsNull() },
    });
  }

  /** Siguiente correlativo de la obra (incluye las versiones eliminadas: no se reutilizan). */
  async siguienteNumero(obraId: number, tx: EntityManager): Promise<number> {
    const filas = await tx.query<{ maximo: number | null }[]>(
      'SELECT max(numero)::int AS maximo FROM nomade.presupuesto_version WHERE obra_id = $1',
      [obraId],
    );
    return (filas[0]?.maximo ?? 0) + 1;
  }

  crearVersion(
    datos: DeepPartial<PresupuestoVersion>,
    tx: EntityManager,
  ): Promise<PresupuestoVersion> {
    const repo = this.deVersiones(tx);
    return repo.save(repo.create(datos));
  }

  guardarVersion(
    version: PresupuestoVersion,
    tx: EntityManager,
  ): Promise<PresupuestoVersion> {
    return this.deVersiones(tx).save(version);
  }

  // --- Partidas -------------------------------------------------------------

  listarPartidas(versionId: number, tx?: EntityManager): Promise<Partida[]> {
    return this.dePartidas(tx).find({
      where: { versionId },
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  buscarPartida(
    versionId: number,
    id: number,
    tx: EntityManager,
  ): Promise<Partida | null> {
    return this.dePartidas(tx).findOne({ where: { id, versionId } });
  }

  async maxOrden(versionId: number, tx: EntityManager): Promise<number> {
    const filas = await tx.query<{ maximo: number | null }[]>(
      'SELECT max(orden)::int AS maximo FROM nomade.partida WHERE version_id = $1',
      [versionId],
    );
    return filas[0]?.maximo ?? 0;
  }

  crearPartida(
    datos: DeepPartial<Partida>,
    tx: EntityManager,
  ): Promise<Partida> {
    const repo = this.dePartidas(tx);
    return repo.save(repo.create(datos));
  }

  /** Inserta muchas partidas (copia de una versión o importación) en lotes. */
  async insertarPartidas(
    datos: DeepPartial<Partida>[],
    tx: EntityManager,
  ): Promise<void> {
    const repo = this.dePartidas(tx);
    for (let i = 0; i < datos.length; i += LOTE_INSERCION) {
      await repo.insert(datos.slice(i, i + LOTE_INSERCION));
    }
  }

  guardarPartida(partida: Partida, tx: EntityManager): Promise<Partida> {
    return this.dePartidas(tx).save(partida);
  }

  async eliminarPartida(partida: Partida, tx: EntityManager): Promise<void> {
    await this.dePartidas(tx).delete({ id: partida.id });
  }

  // --- Usuarios -------------------------------------------------------------

  nombresDeUsuarios(ids: number[]): Promise<Map<number, string>> {
    return nombresDeUsuarios(this.dataSource, ids);
  }
}
