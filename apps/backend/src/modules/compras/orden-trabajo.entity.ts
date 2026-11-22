import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { numericoANumero } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { DocumentoCompra } from './documento-compra.entity.js';

/** Orden de trabajo (subcontrato) nacida de una cotización aprobada. */
@Entity({ name: 'orden_trabajo', schema: 'nomade' })
export class OrdenTrabajo extends DocumentoCompra {
  @Column({ name: 'cotizacion_id', type: 'bigint', transformer: bigintANumero })
  cotizacionId: number;

  /** Monto contratado (el de la cotización). */
  @Column({
    name: 'monto_neto',
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: numericoANumero,
  })
  montoNeto: number;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: string | null;

  @Column({ name: 'fecha_termino', type: 'date', nullable: true })
  fechaTermino: string | null;

  @Column({ name: 'anulado_en', type: 'timestamptz', nullable: true })
  anuladoEn: Date | null;

  @Column({
    name: 'anulado_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  anuladoPor: number | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}

/** Hito de pago de una OT (porcentaje del monto). Editable solo en borrador. */
@Entity({ name: 'orden_trabajo_hito', schema: 'nomade' })
export class OrdenTrabajoHito {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({
    name: 'orden_trabajo_id',
    type: 'bigint',
    transformer: bigintANumero,
  })
  ordenTrabajoId: number;

  @Column({ type: 'integer' })
  numero: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericoANumero,
  })
  porcentaje: number;

  @Column({
    name: 'monto_neto',
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: numericoANumero,
  })
  montoNeto: number;

  @Column({ name: 'fecha_estimada', type: 'date', nullable: true })
  fechaEstimada: string | null;

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
