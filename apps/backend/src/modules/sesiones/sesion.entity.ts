import { Column, Entity, PrimaryColumn } from 'typeorm';
import { bigintANumero } from '../../common/base-datos/transformadores.js';

@Entity({ name: 'sesion', schema: 'nomade' })
export class Sesion {
  @PrimaryColumn({
    type: 'bigint',
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintANumero,
  })
  id: number;

  @Column({
    name: 'usuario_id',
    type: 'bigint',
    transformer: bigintANumero,
  })
  usuarioId: number;

  /** SHA-256 (hex) del token opaco de la cookie. */
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ name: 'creada_en', type: 'timestamptz' })
  creadaEn: Date;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ name: 'ultima_actividad_en', type: 'timestamptz' })
  ultimaActividadEn: Date;

  @Column({ name: 'revocada_en', type: 'timestamptz', nullable: true })
  revocadaEn: Date | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ name: 'agente_usuario', type: 'text', nullable: true })
  agenteUsuario: string | null;
}
