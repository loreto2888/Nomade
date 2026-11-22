import { Column, Entity } from 'typeorm';
import { numericoANumero } from '../../common/base-datos/entidad-maestro.js';
import { DocumentoCompra } from './documento-compra.entity.js';

/** Cotización de un proveedor para una obra (CLP neto). */
@Entity({ name: 'cotizacion', schema: 'nomade' })
export class Cotizacion extends DocumentoCompra {
  @Column({ name: 'referencia_proveedor', type: 'text', nullable: true })
  referenciaProveedor: string | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'validez_hasta', type: 'date', nullable: true })
  validezHasta: string | null;

  @Column({
    name: 'monto_neto',
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: numericoANumero,
  })
  montoNeto: number;
}
