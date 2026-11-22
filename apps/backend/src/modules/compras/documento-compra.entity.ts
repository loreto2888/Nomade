import { Column } from 'typeorm';
import { EntidadMaestroEliminable } from '../../common/base-datos/entidad-maestro.js';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { EstadoDocumentoCompra } from './compras.tipos.js';

/** Columnas comunes de cotizaciones, OT y OC: folio, obra, proveedor, categoría y flujo de aprobación. */
export abstract class DocumentoCompra extends EntidadMaestroEliminable {
  /** Folio: correlativo global por tipo de documento (D-17). */
  @Column({ type: 'bigint', transformer: bigintANumero })
  numero: number;

  @Column({ name: 'obra_id', type: 'bigint', transformer: bigintANumero })
  obraId: number;

  @Column({ name: 'proveedor_id', type: 'bigint', transformer: bigintANumero })
  proveedorId: number;

  @Column({
    name: 'categoria_gasto_id',
    type: 'bigint',
    transformer: bigintANumero,
  })
  categoriaGastoId: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', default: EstadoDocumentoCompra.Borrador })
  estado: EstadoDocumentoCompra;

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
