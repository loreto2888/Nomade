import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  EntidadMaestro,
  numericoANumero,
} from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { Obra } from '../obras/obra.entity.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { EstadoImportacion, TipoImportacion } from './importaciones.tipos.js';

/** Lote de una carga masiva: se previsualiza y luego se confirma o se descarta. */
@Entity({ name: 'importacion_lote', schema: 'nomade' })
export class ImportacionLote extends EntidadMaestro {
  @Column({ type: 'text' })
  tipo: TipoImportacion;

  @Column({ type: 'text', default: EstadoImportacion.Previsualizado })
  estado: EstadoImportacion;

  @Column({
    name: 'obra_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  obraId: number | null;

  @ManyToOne(() => Obra)
  @JoinColumn({ name: 'obra_id' })
  obra?: Obra | null;

  @Column({ name: 'nombre_archivo', type: 'text' })
  nombreArchivo: string;

  @Column({
    name: 'tamanio_bytes',
    type: 'bigint',
    transformer: bigintANumero,
  })
  tamanioBytes: number;

  @Column({ type: 'text' })
  sha256: string;

  @Column({ name: 'total_filas', type: 'integer' })
  totalFilas: number;

  @Column({ name: 'filas_validas', type: 'integer' })
  filasValidas: number;

  @Column({ name: 'filas_con_error', type: 'integer' })
  filasConError: number;

  @Column({
    name: 'monto_total',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: numericoANumero,
  })
  montoTotal: number;

  @Column({ type: 'text', nullable: true })
  moneda: MonedaContrato | null;

  @Column({
    name: 'presupuesto_version_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  presupuestoVersionId: number | null;

  @Column({ name: 'confirmado_en', type: 'timestamptz', nullable: true })
  confirmadoEn: Date | null;

  @Column({
    name: 'confirmado_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  confirmadoPor: number | null;

  @Column({ name: 'descartado_en', type: 'timestamptz', nullable: true })
  descartadoEn: Date | null;

  @Column({
    name: 'descartado_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  descartadoPor: number | null;
}
