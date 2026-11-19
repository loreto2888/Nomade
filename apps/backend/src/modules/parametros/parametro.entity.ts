import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import {
  EntidadMaestro,
  numericoANumero,
} from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { TipoValorParametro } from './parametros.tipos.js';

@Entity({ name: 'parametro', schema: 'nomade' })
export class Parametro extends EntidadMaestro {
  @Column({ type: 'text' })
  codigo: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text' })
  categoria: string;

  @Column({ name: 'tipo_valor', type: 'text' })
  tipoValor: TipoValorParametro;

  @Column({ type: 'text', nullable: true })
  unidad: string | null;
}

/** Una versión del valor de un parámetro, con su inicio de vigencia. */
@Entity({ name: 'parametro_valor', schema: 'nomade' })
export class ParametroValor {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({ name: 'parametro_id', type: 'bigint', transformer: bigintANumero })
  parametroId: number;

  @Column({
    name: 'valor_numerico',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: numericoANumero,
  })
  valorNumerico: number | null;

  @Column({ name: 'valor_texto', type: 'text', nullable: true })
  valorTexto: string | null;

  /** `YYYY-MM-DD`. */
  @Column({ name: 'vigente_desde', type: 'date' })
  vigenteDesde: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

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
