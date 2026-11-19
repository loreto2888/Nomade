import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import type { CeldaCruda } from './planilla.js';
import type { ClaveColumna } from '../presupuestos/columnas-planilla.js';

export interface ErrorFilaImportacion {
  campo: ClaveColumna | 'fila';
  mensaje: string;
}

/** Fila de un lote con los valores leídos y el resultado de su validación. */
@Entity({ name: 'importacion_fila', schema: 'nomade' })
export class ImportacionFila {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({ name: 'lote_id', type: 'bigint', transformer: bigintANumero })
  loteId: number;

  /** Número de fila en la planilla original. */
  @Column({ name: 'numero_fila', type: 'integer' })
  numeroFila: number;

  /** Valores tal como se leyeron del archivo. */
  @Column({ type: 'jsonb' })
  datos: Record<ClaveColumna, CeldaCruda>;

  @Column({ type: 'boolean' })
  valida: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  errores: ErrorFilaImportacion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
