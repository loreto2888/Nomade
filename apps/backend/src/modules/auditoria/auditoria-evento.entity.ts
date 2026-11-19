import { Column, Entity, PrimaryColumn } from 'typeorm';
import { bigintANumero } from '../../common/base-datos/transformadores.js';

/** Fila de la bitácora. Tabla append-only: `nomade_app` solo puede insertar y consultar. */
@Entity({ name: 'auditoria_evento', schema: 'nomade' })
export class AuditoriaEvento {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({ name: 'ocurrido_en', type: 'timestamptz', default: () => 'now()' })
  ocurridoEn: Date;

  @Column({
    name: 'usuario_id',
    type: 'bigint',
    nullable: true,
    transformer: bigintANumero,
  })
  usuarioId: number | null;

  @Column({ name: 'usuario_correo', type: 'text', nullable: true })
  usuarioCorreo: string | null;

  @Column({ name: 'usuario_nombre', type: 'text', nullable: true })
  usuarioNombre: string | null;

  @Column({ type: 'text' })
  accion: string;

  @Column({ type: 'text' })
  entidad: string;

  @Column({ name: 'entidad_id', type: 'text', nullable: true })
  entidadId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  antes: unknown;

  @Column({ type: 'jsonb', nullable: true })
  despues: unknown;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ name: 'id_correlacion', type: 'text', nullable: true })
  idCorrelacion: string | null;
}
