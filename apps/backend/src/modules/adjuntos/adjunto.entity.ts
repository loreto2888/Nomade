import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { EntidadAdjuntable } from './adjuntos.tipos.js';

/** Metadatos de un archivo adjunto; el contenido vive en el almacenamiento local. */
@Entity({ name: 'adjunto', schema: 'nomade' })
export class Adjunto {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({ name: 'entidad_tipo', type: 'text' })
  entidadTipo: EntidadAdjuntable;

  @Column({ name: 'entidad_id', type: 'bigint', transformer: bigintANumero })
  entidadId: number;

  @Column({ name: 'nombre_original', type: 'text' })
  nombreOriginal: string;

  @Column({ name: 'clave_almacenamiento', type: 'text' })
  claveAlmacenamiento: string;

  @Column({ name: 'tipo_mime', type: 'text' })
  tipoMime: string;

  @Column({ type: 'text' })
  extension: string;

  @Column({ name: 'tamanio_bytes', type: 'bigint', transformer: bigintANumero })
  tamanioBytes: number;

  @Column({ type: 'text' })
  sha256: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  createdBy: number | null;

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
