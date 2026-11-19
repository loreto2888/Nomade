import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  EntidadMaestroEliminable,
  numericoANumero,
} from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { Catalogo } from '../catalogos/catalogo.entity.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { MonedaContrato } from './obras.tipos.js';

/** Obra / centro de costo único. */
@Entity({ name: 'obra', schema: 'nomade' })
export class Obra extends EntidadMaestroEliminable {
  @Column({ name: 'codigo_centro_costo', type: 'text' })
  codigoCentroCosto: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ name: 'cliente_id', type: 'bigint', transformer: bigintANumero })
  clienteId: number;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Cliente;

  @Column({ name: 'estado_id', type: 'bigint', transformer: bigintANumero })
  estadoId: number;

  @ManyToOne(() => Catalogo)
  @JoinColumn({ name: 'estado_id' })
  estado?: Catalogo;

  @Column({ type: 'text', nullable: true })
  responsable: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  /** `YYYY-MM-DD`. */
  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: string | null;

  @Column({ name: 'fecha_termino', type: 'date', nullable: true })
  fechaTermino: string | null;

  @Column({
    name: 'moneda_contrato',
    type: 'text',
    default: MonedaContrato.Clp,
  })
  monedaContrato: MonedaContrato;

  @Column({
    name: 'monto_contrato',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: numericoANumero,
  })
  montoContrato: number | null;

  @Column({
    name: 'monto_contrato_clp',
    type: 'numeric',
    precision: 18,
    scale: 0,
    nullable: true,
    transformer: numericoANumero,
  })
  montoContratoClp: number | null;

  @Column({ name: 'fecha_valor_uf', type: 'date', nullable: true })
  fechaValorUf: string | null;

  @Column({
    name: 'valor_uf',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: numericoANumero,
  })
  valorUf: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
