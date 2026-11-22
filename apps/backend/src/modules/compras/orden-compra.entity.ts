import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { numericoANumero } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { TipoOrdenCompra } from './compras.tipos.js';
import { DocumentoCompra } from './documento-compra.entity.js';

const MONTO = {
  type: 'numeric',
  precision: 18,
  scale: 0,
  transformer: numericoANumero,
} as const;

/** Orden de compra: de materiales (con líneas) o parcial de una OT. */
@Entity({ name: 'orden_compra', schema: 'nomade' })
export class OrdenCompra extends DocumentoCompra {
  @Column({ type: 'text' })
  tipo: TipoOrdenCompra;

  @Column({
    name: 'orden_trabajo_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  ordenTrabajoId: number | null;

  @Column({
    name: 'hito_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  hitoId: number | null;

  /** OC parcial: porcentaje del monto de la OT. */
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericoANumero,
  })
  porcentaje: number | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'fecha_entrega', type: 'date', nullable: true })
  fechaEntrega: string | null;

  @Column({ name: 'afecta_iva', type: 'boolean', default: true })
  afectaIva: boolean;

  @Column({
    name: 'tasa_iva',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericoANumero,
  })
  tasaIva: number;

  @Column({ name: 'monto_neto', ...MONTO, default: 0 })
  montoNeto: number;

  @Column({ name: 'monto_iva', ...MONTO, default: 0 })
  montoIva: number;

  @Column({ name: 'monto_total', ...MONTO, default: 0 })
  montoTotal: number;

  @Column({ name: 'recibido_en', type: 'timestamptz', nullable: true })
  recibidoEn: Date | null;

  @Column({
    name: 'recibido_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  recibidoPor: number | null;

  @Column({ name: 'fecha_recepcion', type: 'date', nullable: true })
  fechaRecepcion: string | null;

  @Column({ name: 'observacion_recepcion', type: 'text', nullable: true })
  observacionRecepcion: string | null;

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

/** Línea de una OC de materiales. Editable solo en borrador. */
@Entity({ name: 'orden_compra_linea', schema: 'nomade' })
export class OrdenCompraLinea {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({
    name: 'orden_compra_id',
    type: 'bigint',
    transformer: bigintANumero,
  })
  ordenCompraId: number;

  @Column({ type: 'integer' })
  numero: number;

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

  /** CLP, hasta 4 decimales. */
  @Column({
    name: 'precio_unitario',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericoANumero,
  })
  precioUnitario: number;

  /** cantidad × precio, redondeado a pesos. */
  @Column(MONTO)
  total: number;

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
