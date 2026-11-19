import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  EntidadMaestro,
  numericoANumero,
} from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { Catalogo } from '../catalogos/catalogo.entity.js';

/** Partida de una versión de presupuesto (editable solo mientras la versión es borrador). */
@Entity({ name: 'partida', schema: 'nomade' })
export class Partida extends EntidadMaestro {
  @Column({ name: 'version_id', type: 'bigint', transformer: bigintANumero })
  versionId: number;

  @Column({ type: 'integer' })
  orden: number;

  @Column({ type: 'text' })
  codigo: string;

  @Column({ name: 'familia_id', type: 'bigint', transformer: bigintANumero })
  familiaId: number;

  @ManyToOne(() => Catalogo)
  @JoinColumn({ name: 'familia_id' })
  familia?: Catalogo;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text' })
  unidad: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericoANumero,
  })
  cantidad: number;

  /** En la moneda de la versión. */
  @Column({
    name: 'precio_unitario',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericoANumero,
  })
  precioUnitario: number;

  /** `cantidad × precioUnitario` en la moneda de la versión. */
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericoANumero,
  })
  total: number;

  @Column({
    name: 'total_clp',
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: numericoANumero,
  })
  totalClp: number;
}
