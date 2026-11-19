import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import {
  elegirValorUf,
  restarDias,
  DIAS_MAXIMOS_UF_ANTERIOR,
} from '../../common/dinero/conversion-uf.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import type {
  ListarValoresUfDto,
  PaginaValoresUfDto,
  ValorUfDto,
} from './uf.dto.js';
import { UfRepositorio } from './uf.repositorio.js';
import type { ValorUf } from './valor-uf.entity.js';

const aDto = (v: ValorUf): ValorUfDto => ({ fecha: v.fecha, valor: v.valor });

@Injectable()
export class UfService {
  constructor(
    private readonly repositorio: UfRepositorio,
    private readonly reloj: Reloj,
  ) {}

  /**
   * Valor de la UF aplicable a una fecha: el del día o el último anterior de hasta
   * 7 días. `null` si no hay (nadie cargó la UF reciente).
   */
  async valorParaFecha(
    fecha: string = this.reloj.hoy(),
  ): Promise<ValorUfDto | null> {
    const candidatos = await this.repositorio.entre(
      restarDias(fecha, DIAS_MAXIMOS_UF_ANTERIOR),
      fecha,
    );
    const elegido = elegirValorUf(candidatos.map(aDto), fecha);
    return elegido ? { fecha: elegido.fecha, valor: elegido.valor } : null;
  }

  /** Igual que `valorParaFecha`, pero lanza 422 si no hay valor. */
  async exigirValorParaFecha(fecha?: string): Promise<ValorUfDto> {
    const valor = await this.valorParaFecha(fecha);
    if (!valor) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'UF_NO_DISPONIBLE',
        `No hay valor de la UF cargado para ${fecha ?? 'hoy'} (ni en los ${DIAS_MAXIMOS_UF_ANTERIOR} días anteriores). Pide a un administrador que lo cargue en Parámetros.`,
      );
    }
    return valor;
  }

  async listar(filtro: ListarValoresUfDto): Promise<PaginaValoresUfDto> {
    const [valores, total] = await this.repositorio.listar(filtro);
    return {
      items: valores.map(aDto),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  /** Crea o corrige el valor de la UF de un día (queda en la bitácora con antes/después). */
  async guardar(
    fecha: string,
    valor: number,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ValorUfDto> {
    const existente = await this.repositorio.buscarPorFecha(fecha);
    try {
      let guardado: ValorUf;
      if (existente) {
        auditoria.antes = aDto(existente);
        existente.valor = valor;
        existente.updatedBy = actor.id;
        guardado = await this.repositorio.guardar(existente);
      } else {
        guardado = await this.repositorio.crear({
          fecha,
          valor,
          createdBy: actor.id,
          updatedBy: actor.id,
        });
      }
      auditoria.entidadId = fecha;
      auditoria.despues = aDto(guardado);
      return aDto(guardado);
    } catch (error) {
      if (esViolacionUnica(error, 'ux_valor_uf_fecha')) {
        throw new ErrorAplicacion(
          HttpStatus.CONFLICT,
          'CONFLICTO',
          'Otra persona cargó ese día al mismo tiempo. Recarga y reintenta.',
        );
      }
      throw error;
    }
  }
}
