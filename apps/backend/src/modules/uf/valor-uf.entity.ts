import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericoANumero } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';

/** Valor de la UF de un día. Se carga manualmente (admin). */
@Entity({ name: 'valor_uf', schema: 'nomade' })
export class ValorUf {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  /** `YYYY-MM-DD`. */
  @Column({ type: 'date' })
  fecha: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericoANumero,
  })
  valor: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  createdBy: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  updatedBy: number | null;
}
