import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNull,
  Repository,
  type DeepPartial,
  type EntityManager,
} from 'typeorm';
import { Movimiento } from './movimiento.entity.js';
import type { OrigenMovimiento, TipoMovimiento } from './movimientos.tipos.js';

export interface TotalCategoria {
  categoriaGastoId: number | null;
  totalClp: number;
}

/** Acceso al libro de movimientos: solo inserta y consulta (la tabla es append-only). */
@Injectable()
export class MovimientosRepositorio {
  constructor(
    @InjectRepository(Movimiento)
    private readonly movimientos: Repository<Movimiento>,
  ) {}

  private de(tx?: EntityManager): Repository<Movimiento> {
    return tx ? tx.getRepository(Movimiento) : this.movimientos;
  }

  insertar(
    datos: DeepPartial<Movimiento>,
    tx: EntityManager,
  ): Promise<Movimiento> {
    const repo = this.de(tx);
    return repo.save(repo.create(datos));
  }

  /** Movimiento original (no reversa) de un hecho. */
  buscarOriginal(
    tipo: TipoMovimiento,
    origenTipo: OrigenMovimiento,
    origenId: number,
    tx?: EntityManager,
  ): Promise<Movimiento | null> {
    return this.de(tx).findOne({
      where: { tipo, origenTipo, origenId, reversaDeId: IsNull() },
    });
  }

  buscarReversaDe(id: number, tx?: EntityManager): Promise<Movimiento | null> {
    return this.de(tx).findOne({ where: { reversaDeId: id } });
  }

  listarDeOrigen(
    origenTipo: OrigenMovimiento,
    origenId: number,
  ): Promise<Movimiento[]> {
    return this.movimientos.find({
      where: { origenTipo, origenId },
      order: { id: 'ASC' },
    });
  }

  /** Saldo por categoría de gasto de un tipo de movimiento en una obra. */
  async totalesPorCategoria(
    obraId: number,
    tipo: TipoMovimiento,
  ): Promise<TotalCategoria[]> {
    const filas = await this.movimientos
      .createQueryBuilder('m')
      .select('m.categoriaGastoId', 'categoriaGastoId')
      .addSelect('sum(m.montoClp)', 'totalClp')
      .where('m.obraId = :obraId AND m.tipo = :tipo', { obraId, tipo })
      .groupBy('m.categoriaGastoId')
      .getRawMany<{ categoriaGastoId: string | null; totalClp: string }>();
    return filas.map((f) => ({
      categoriaGastoId:
        f.categoriaGastoId === null ? null : Number(f.categoriaGastoId),
      totalClp: Number(f.totalClp),
    }));
  }
}
