import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Not, Repository } from 'typeorm';
import { Sesion } from './sesion.entity.js';
import {
  calcularExpiracion,
  debeRegistrarActividad,
  evaluarSesion,
  type EstadoSesion,
} from './politica-sesion.js';

export interface ContextoSolicitud {
  ip: string | null;
  agenteUsuario: string | null;
}

export type ResultadoValidacion =
  | { estado: 'valida'; sesion: Sesion }
  | {
      estado: Exclude<EstadoSesion, 'valida'> | 'inexistente';
      sesion?: undefined;
    };

export function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SesionesService {
  constructor(
    @InjectRepository(Sesion) private readonly repositorio: Repository<Sesion>,
  ) {}

  /** Crea una sesión y devuelve el token opaco (solo se entrega una vez). */
  async crear(
    usuarioId: number,
    contexto: ContextoSolicitud,
    ahora: Date = new Date(),
  ): Promise<{ token: string; sesion: Sesion }> {
    const token = randomBytes(32).toString('base64url');
    const sesion = await this.repositorio.save(
      this.repositorio.create({
        usuarioId,
        tokenHash: hashearToken(token),
        creadaEn: ahora,
        expiraEn: calcularExpiracion(ahora),
        ultimaActividadEn: ahora,
        revocadaEn: null,
        ip: contexto.ip,
        agenteUsuario: contexto.agenteUsuario?.slice(0, 300) ?? null,
      }),
    );
    return { token, sesion };
  }

  /**
   * Valida el token de la cookie: existe, no está revocada, no superó las 8 h
   * ni los 30 min de inactividad. Si es válida, registra la actividad.
   */
  async validar(
    token: string,
    ahora: Date = new Date(),
  ): Promise<ResultadoValidacion> {
    const sesion = await this.repositorio.findOne({
      where: { tokenHash: hashearToken(token) },
    });
    if (!sesion) return { estado: 'inexistente' };

    const estado = evaluarSesion(sesion, ahora);
    if (estado !== 'valida') return { estado };

    if (debeRegistrarActividad(sesion, ahora)) {
      await this.repositorio.update(sesion.id, { ultimaActividadEn: ahora });
      sesion.ultimaActividadEn = ahora;
    }
    return { estado: 'valida', sesion };
  }

  async revocar(sesionId: number, ahora: Date = new Date()): Promise<void> {
    await this.repositorio.update(
      { id: sesionId, revocadaEn: IsNull() },
      { revocadaEn: ahora },
    );
  }

  /** Revoca las sesiones activas del usuario (opcionalmente conserva una). */
  async revocarDeUsuario(
    usuarioId: number,
    opciones: { excepto?: number; ahora?: Date } = {},
  ): Promise<void> {
    await this.repositorio.update(
      {
        usuarioId,
        revocadaEn: IsNull(),
        ...(opciones.excepto !== undefined
          ? { id: Not(opciones.excepto) }
          : {}),
      },
      { revocadaEn: opciones.ahora ?? new Date() },
    );
  }
}
