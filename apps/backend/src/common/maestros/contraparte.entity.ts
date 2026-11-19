import { Column } from 'typeorm';
import { EntidadMaestroEliminable } from '../base-datos/entidad-maestro.js';

/** Datos comunes de clientes y proveedores (mismas columnas en ambas tablas). */
export abstract class EntidadContraparte extends EntidadMaestroEliminable {
  /** RUT normalizado: `76123456-0`. */
  @Column({ type: 'text' })
  rut: string;

  @Column({ name: 'razon_social', type: 'text' })
  razonSocial: string;

  @Column({ name: 'nombre_fantasia', type: 'text', nullable: true })
  nombreFantasia: string | null;

  @Column({ type: 'text', nullable: true })
  giro: string | null;

  @Column({ name: 'contacto_nombre', type: 'text', nullable: true })
  contactoNombre: string | null;

  @Column({ type: 'text', nullable: true })
  correo: string | null;

  @Column({ type: 'text', nullable: true })
  telefono: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;
}
