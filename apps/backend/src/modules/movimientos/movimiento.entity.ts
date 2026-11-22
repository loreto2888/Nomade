import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { numericoANumero } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { OrigenMovimiento, TipoMovimiento } from './movimientos.tipos.js';

/**
 * Movimiento del libro (plan §9.3): append-only. Se corrige con una reversa (monto con signo
 * contrario que apunta al original), nunca se edita ni se elimina.
 */
@Entity({ name: 'movimiento', schema: 'nomade' })
export class Movimiento {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  tipo: TipoMovimiento;

  @Column({ name: 'obra_id', type: 'bigint', transformer: bigintANumero })
  obraId: number;

  @Column({
    name: 'proveedor_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  proveedorId: number | null;

  @Column({
    name: 'categoria_gasto_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  categoriaGastoId: number | null;

  @Column({ name: 'origen_tipo', type: 'text' })
  origenTipo: OrigenMovimiento;

  @Column({ name: 'origen_id', type: 'bigint', transformer: bigintANumero })
  origenId: number;

  /** CLP con signo (las reversas son negativas). */
  @Column({
    name: 'monto_clp',
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: numericoANumero,
  })
  montoClp: number;

  @Column({
    name: 'reversa_de_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  reversaDeId: number | null;

  @Column({ type: 'text' })
  descripcion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  createdBy: number | null;
}
