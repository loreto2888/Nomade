import { Column, Entity } from 'typeorm';
import { EntidadMaestro } from '../../common/base-datos/entidad-maestro.js';
import { TipoCatalogo } from './catalogos.tipos.js';

@Entity({ name: 'catalogo', schema: 'nomade' })
export class Catalogo extends EntidadMaestro {
  @Column({ type: 'text' })
  tipo: TipoCatalogo;

  /** Identificador estable (no editable): lo usa la lógica de la aplicación. */
  @Column({ type: 'text' })
  codigo: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  /** Ítems con código usado por la aplicación: no se pueden desactivar. */
  @Column({ type: 'boolean', default: false })
  protegido: boolean;
}
