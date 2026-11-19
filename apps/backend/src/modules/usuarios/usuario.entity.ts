import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintANumero } from '../../common/base-datos/transformadores.js';
import { Rol, TemaInterfaz } from '../../common/permisos/rol.js';

@Entity({ name: 'usuario', schema: 'nomade' })
export class Usuario {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  /** `citext`: único sin distinguir mayúsculas. */
  @Column({ type: 'citext' })
  correo: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  rol: Rol;

  @Column({ name: 'clave_hash', type: 'text' })
  claveHash: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'debe_cambiar_clave', type: 'boolean', default: true })
  debeCambiarClave: boolean;

  @Column({ name: 'intentos_fallidos', type: 'integer', default: 0 })
  intentosFallidos: number;

  @Column({ name: 'bloqueado_hasta', type: 'timestamptz', nullable: true })
  bloqueadoHasta: Date | null;

  @Column({ name: 'clave_cambiada_en', type: 'timestamptz', nullable: true })
  claveCambiadaEn: Date | null;

  @Column({ name: 'ultimo_acceso_en', type: 'timestamptz', nullable: true })
  ultimoAccesoEn: Date | null;

  @Column({ type: 'text', default: TemaInterfaz.Claro })
  tema: TemaInterfaz;

  /** Control optimista: lo incrementa el servicio en cada modificación de datos. */
  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  createdBy: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  updatedBy: number | null;
}
