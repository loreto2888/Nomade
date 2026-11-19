import { Column, Entity } from 'typeorm';
import {
  EntidadMaestroEliminable,
  numericoANumero,
} from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';

/** Versión del presupuesto de una obra. */
@Entity({ name: 'presupuesto_version', schema: 'nomade' })
export class PresupuestoVersion extends EntidadMaestroEliminable {
  @Column({ name: 'obra_id', type: 'bigint', transformer: bigintANumero })
  obraId: number;

  /** Correlativo por obra. */
  @Column({ type: 'integer' })
  numero: number;

  @Column({ type: 'text', default: EstadoPresupuesto.Borrador })
  estado: EstadoPresupuesto;

  /** Única versión aprobada que rige la obra. */
  @Column({ type: 'boolean', default: false })
  vigente: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text', default: MonedaContrato.Clp })
  moneda: MonedaContrato;

  @Column({
    name: 'valor_uf',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: numericoANumero,
  })
  valorUf: number | null;

  @Column({ name: 'fecha_valor_uf', type: 'date', nullable: true })
  fechaValorUf: string | null;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: numericoANumero,
  })
  total: number;

  @Column({
    name: 'total_clp',
    type: 'numeric',
    precision: 18,
    scale: 0,
    default: 0,
    transformer: numericoANumero,
  })
  totalClp: number;

  @Column({ name: 'cantidad_partidas', type: 'integer', default: 0 })
  cantidadPartidas: number;

  @Column({
    name: 'copiada_de_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  copiadaDeId: number | null;

  @Column({
    name: 'importacion_lote_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  importacionLoteId: number | null;

  @Column({ name: 'enviado_en', type: 'timestamptz', nullable: true })
  enviadoEn: Date | null;

  @Column({
    name: 'enviado_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  enviadoPor: number | null;

  /** Aprobación o rechazo. */
  @Column({ name: 'resuelto_en', type: 'timestamptz', nullable: true })
  resueltoEn: Date | null;

  @Column({
    name: 'resuelto_por',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  resueltoPor: number | null;

  @Column({ name: 'motivo_resolucion', type: 'text', nullable: true })
  motivoResolucion: string | null;
}
