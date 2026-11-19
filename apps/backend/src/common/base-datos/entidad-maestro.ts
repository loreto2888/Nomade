import {
  Column,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintANumero } from './transformadores.js';

/** Transformador de `numeric` (llega como `string` desde `pg`) a `number`. */
export const numericoANumero = {
  to: (valor: number | null | undefined) => valor,
  from: (valor: string | number | null) =>
    valor === null || valor === undefined ? null : Number(valor),
};

/**
 * Columnas comunes de los maestros (plan §6.2, D-13): PK identity, auditoría,
 * `version` para control optimista y borrado lógico. Las tablas concretas las
 * crea la migración; aquí solo se mapean.
 */
export abstract class EntidadMaestro {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  /** Control optimista: lo incrementa el servicio en cada modificación. */
  @Column({ type: 'integer', default: 1 })
  version: number;

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

/** Maestro con borrado lógico (`eliminado_en`). */
export abstract class EntidadMaestroEliminable extends EntidadMaestro {
  @Column({ name: 'eliminado_en', type: 'timestamptz', nullable: true })
  eliminadoEn: Date | null;

  @Column({
    name: 'eliminado_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  eliminadoPor: number | null;
}
