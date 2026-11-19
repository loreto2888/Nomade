import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, type SelectQueryBuilder } from 'typeorm';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { escaparLike } from '../usuarios/usuarios.repositorio.js';
import { AuditoriaEvento } from './auditoria-evento.entity.js';
import type {
  ConsultarAuditoriaDto,
  EventoAuditoriaDto,
  PaginaAuditoriaDto,
} from './auditoria.dto.js';
import { sanitizarParaAuditoria } from './sanitizar.js';

export interface NuevoEventoAuditoria {
  usuarioId?: number | null;
  usuarioCorreo?: string | null;
  usuarioNombre?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | number | null;
  antes?: unknown;
  despues?: unknown;
  motivo?: string | null;
  ip?: string | null;
  idCorrelacion?: string | null;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Rango de fechas del filtro: "hasta" con solo fecha incluye todo ese día. */
export function rangoFechas(
  desde?: string,
  hasta?: string,
): { desde?: Date; hasta?: Date } {
  const inicio = desde ? new Date(desde) : undefined;
  let fin: Date | undefined;
  if (hasta) {
    fin = new Date(hasta);
    if (SOLO_FECHA.test(hasta)) fin = new Date(fin.getTime() + UN_DIA_MS);
  }
  return { desde: inicio, hasta: fin };
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(AuditoriaEvento)
    private readonly repositorio: Repository<AuditoriaEvento>,
  ) {}

  /** Inserta un evento (sanitizado). Nunca modifica ni elimina filas existentes. */
  async registrar(evento: NuevoEventoAuditoria): Promise<void> {
    await this.repositorio.insert({
      usuarioId: evento.usuarioId ?? null,
      usuarioCorreo: evento.usuarioCorreo ?? null,
      usuarioNombre: evento.usuarioNombre ?? null,
      accion: evento.accion,
      entidad: evento.entidad,
      entidadId:
        evento.entidadId === undefined || evento.entidadId === null
          ? null
          : String(evento.entidadId),
      antes: (sanitizarParaAuditoria(evento.antes) ?? null) as never,
      despues: (sanitizarParaAuditoria(evento.despues) ?? null) as never,
      motivo: evento.motivo ?? null,
      ip: evento.ip ?? null,
      idCorrelacion: evento.idCorrelacion ?? null,
    });
  }

  /** Como `registrar`, pero un fallo de auditoría se registra en el log sin romper la operación. */
  async registrarSinFallar(evento: NuevoEventoAuditoria): Promise<void> {
    try {
      await this.registrar(evento);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el evento de auditoría ${evento.accion}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async consultar(filtro: ConsultarAuditoriaDto): Promise<PaginaAuditoriaDto> {
    const { skip, take } = rangoPagina(filtro);
    const [eventos, total] = await construirConsulta(
      this.repositorio.createQueryBuilder('e'),
      filtro,
    )
      .orderBy('e.ocurridoEn', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return {
      items: eventos.map(aEventoDto),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }
}

/** Aplica los filtros de la consulta de bitácora (todos se combinan con AND). */
export function construirConsulta(
  consulta: SelectQueryBuilder<AuditoriaEvento>,
  filtro: Omit<ConsultarAuditoriaDto, 'pagina' | 'tamanio'>,
): SelectQueryBuilder<AuditoriaEvento> {
  const { desde, hasta } = rangoFechas(filtro.desde, filtro.hasta);
  if (desde) consulta.andWhere('e.ocurridoEn >= :desde', { desde });
  if (hasta) consulta.andWhere('e.ocurridoEn < :hasta', { hasta });
  if (filtro.usuarioId !== undefined) {
    consulta.andWhere('e.usuarioId = :usuarioId', {
      usuarioId: filtro.usuarioId,
    });
  }
  if (filtro.entidad)
    consulta.andWhere('e.entidad = :entidad', { entidad: filtro.entidad });
  if (filtro.entidadId) {
    consulta.andWhere('e.entidadId = :entidadId', {
      entidadId: filtro.entidadId,
    });
  }
  if (filtro.accion) {
    if (filtro.accion.endsWith('.')) {
      consulta.andWhere(`e.accion LIKE :prefijo ESCAPE '\\'`, {
        prefijo: `${escaparLike(filtro.accion)}%`,
      });
    } else {
      consulta.andWhere('e.accion = :accion', { accion: filtro.accion });
    }
  }
  if (filtro.q) {
    consulta.andWhere(
      new Brackets((b) => {
        for (const columna of [
          'e.accion',
          'e.entidad',
          'e.usuarioNombre',
          'e.usuarioCorreo',
          'e.motivo',
        ]) {
          b.orWhere(`${columna} ILIKE :q ESCAPE '\\'`);
        }
      }),
      { q: `%${escaparLike(filtro.q)}%` },
    );
  }
  return consulta;
}

function aEventoDto(evento: AuditoriaEvento): EventoAuditoriaDto {
  return {
    id: evento.id,
    ocurridoEn: evento.ocurridoEn.toISOString(),
    usuarioId: evento.usuarioId,
    usuarioCorreo: evento.usuarioCorreo,
    usuarioNombre: evento.usuarioNombre,
    accion: evento.accion,
    entidad: evento.entidad,
    entidadId: evento.entidadId,
    antes: (evento.antes ?? null) as Record<string, unknown> | null,
    despues: (evento.despues ?? null) as Record<string, unknown> | null,
    motivo: evento.motivo,
    ip: evento.ip,
    idCorrelacion: evento.idCorrelacion,
  };
}
