import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { esViolacionUnica } from '../../common/base-datos/errores-pg.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import type { Parametro, ParametroValor } from './parametro.entity.js';
import type {
  AgregarValorParametroDto,
  EliminarValorParametroDto,
  ParametroDto,
  ValorParametroDto,
} from './parametros.dto.js';
import { ParametrosRepositorio } from './parametros.repositorio.js';
import {
  interpretarValor,
  validarNuevaVersion,
  valorComoTexto,
  versionProxima,
  versionVigente,
  vigenteHasta,
} from './vigencia.js';

const noEncontrado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'PARAMETRO_NO_ENCONTRADO',
    'El parámetro no existe.',
  );

export function aValorDto(
  valor: ParametroValor,
  todas: readonly ParametroValor[],
): ValorParametroDto {
  return {
    id: valor.id,
    valor: valorComoTexto({
      numerico: valor.valorNumerico,
      texto: valor.valorTexto,
    }),
    valorNumerico: valor.valorNumerico,
    vigenteDesde: valor.vigenteDesde,
    vigenteHasta: vigenteHasta(todas, valor),
    motivo: valor.motivo,
    creadoEn: valor.createdAt.toISOString(),
    creadoPor: valor.createdBy,
  };
}

export function aParametroDto(
  parametro: Parametro,
  versiones: readonly ParametroValor[],
  hoy: string,
): ParametroDto {
  const vigente = versionVigente(versiones, hoy);
  const proxima = versionProxima(versiones, hoy);
  return {
    id: parametro.id,
    codigo: parametro.codigo,
    nombre: parametro.nombre,
    descripcion: parametro.descripcion,
    categoria: parametro.categoria,
    tipoValor: parametro.tipoValor,
    unidad: parametro.unidad,
    valorVigente: vigente ? aValorDto(vigente, versiones) : null,
    proximoValor: proxima ? aValorDto(proxima, versiones) : null,
    version: parametro.version,
  };
}

@Injectable()
export class ParametrosService {
  constructor(
    private readonly repositorio: ParametrosRepositorio,
    private readonly reloj: Reloj,
  ) {}

  async listar(): Promise<ParametroDto[]> {
    const parametros = await this.repositorio.listar();
    const valores = await this.repositorio.valoresDe(
      parametros.map((p) => p.id),
    );
    const hoy = this.reloj.hoy();
    return parametros.map((p) =>
      aParametroDto(
        p,
        valores.filter((v) => v.parametroId === p.id),
        hoy,
      ),
    );
  }

  async obtener(id: number): Promise<ParametroDto> {
    const parametro = await this.repositorio.buscarPorId(id);
    if (!parametro) throw noEncontrado();
    const valores = await this.repositorio.valoresDe([id]);
    return aParametroDto(parametro, valores, this.reloj.hoy());
  }

  /** Historial completo (la más reciente primero). */
  async historial(id: number): Promise<ValorParametroDto[]> {
    if (!(await this.repositorio.buscarPorId(id))) throw noEncontrado();
    const valores = await this.repositorio.valoresDe([id]);
    return valores.map((v) => aValorDto(v, valores));
  }

  /**
   * Valor numérico vigente de un parámetro en una fecha (por defecto hoy).
   * Lo usan los demás módulos (p. ej. el IVA); no pasa por la API.
   */
  async valorNumerico(
    codigo: string,
    fecha: string = this.reloj.hoy(),
  ): Promise<number> {
    const parametro = await this.repositorio.buscarPorCodigo(codigo);
    if (!parametro) throw noEncontrado();
    const valores = await this.repositorio.valoresDe([parametro.id]);
    const vigente = versionVigente(valores, fecha);
    if (!vigente || vigente.valorNumerico === null) {
      throw new ErrorAplicacion(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PARAMETRO_SIN_VALOR',
        `El parámetro "${codigo}" no tiene un valor numérico vigente al ${fecha}.`,
      );
    }
    return vigente.valorNumerico;
  }

  /** Agrega una versión del valor con su vigencia. Las versiones existentes no se modifican. */
  async agregarValor(
    id: number,
    dto: AgregarValorParametroDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ParametroDto> {
    try {
      const { antes, despues } = await this.repositorio.enTransaccion(
        async (tx) => {
          const parametro = await this.bloquear(id, dto.version, tx);
          const hoy = this.reloj.hoy();
          const previas = await this.repositorio.valoresDe([id], tx);
          const antes = aParametroDto(parametro, previas, hoy);

          const interpretado = interpretarValor(parametro.tipoValor, dto.valor);
          validarNuevaVersion({
            vigenteDesde: dto.vigenteDesde,
            hoy,
            ultimaVigenteDesde: previas[0]?.vigenteDesde ?? null,
          });

          const nueva = await this.repositorio.crearValor(
            {
              parametroId: id,
              valorNumerico: interpretado.numerico,
              valorTexto: interpretado.texto,
              vigenteDesde: dto.vigenteDesde,
              motivo: dto.motivo ?? null,
              createdBy: actor.id,
            },
            tx,
          );
          parametro.version += 1;
          parametro.updatedBy = actor.id;
          const guardado = await this.repositorio.guardarParametro(
            parametro,
            tx,
          );
          return {
            antes,
            despues: aParametroDto(guardado, [nueva, ...previas], hoy),
          };
        },
      );
      auditoria.entidadId = id;
      auditoria.antes = antes;
      auditoria.despues = despues;
      auditoria.motivo = dto.motivo;
      return despues;
    } catch (error) {
      if (esViolacionUnica(error, 'ux_parametro_valor_desde')) {
        throw new ErrorAplicacion(
          HttpStatus.CONFLICT,
          'CONFLICTO_VERSION',
          'Otra persona agregó un valor para esa fecha. Recarga y reintenta.',
        );
      }
      throw error;
    }
  }

  /** Elimina una versión que aún no entra en vigencia (las ya vigentes forman parte del historial). */
  async eliminarValor(
    id: number,
    valorId: number,
    dto: EliminarValorParametroDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ParametroDto> {
    const { antes, despues } = await this.repositorio.enTransaccion(
      async (tx) => {
        const parametro = await this.bloquear(id, dto.version, tx);
        const hoy = this.reloj.hoy();
        const previas = await this.repositorio.valoresDe([id], tx);
        const antes = aParametroDto(parametro, previas, hoy);

        const valor = await this.repositorio.buscarValor(valorId, tx);
        if (!valor || valor.parametroId !== id) {
          throw new ErrorAplicacion(
            HttpStatus.NOT_FOUND,
            'PARAMETRO_VALOR_NO_ENCONTRADO',
            'La versión del valor no existe.',
          );
        }
        if (valor.vigenteDesde <= hoy) {
          throw new ErrorAplicacion(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'VALOR_YA_VIGENTE',
            'Solo se pueden eliminar valores programados para más adelante. Agrega una versión nueva para cambiar el valor vigente.',
          );
        }
        await this.repositorio.eliminarValor(valorId, tx);
        parametro.version += 1;
        parametro.updatedBy = actor.id;
        const guardado = await this.repositorio.guardarParametro(parametro, tx);
        const restantes = previas.filter((v) => v.id !== valorId);
        return { antes, despues: aParametroDto(guardado, restantes, hoy) };
      },
    );
    auditoria.entidadId = id;
    auditoria.antes = antes;
    auditoria.despues = despues;
    auditoria.motivo = dto.motivo;
    return despues;
  }

  private async bloquear(
    id: number,
    version: number,
    tx: EntityManager,
  ): Promise<Parametro> {
    const parametro = await this.repositorio.buscarPorIdBloqueando(id, tx);
    if (!parametro) throw noEncontrado();
    if (parametro.version !== version)
      throw conflictoVersion(parametro.version);
    return parametro;
  }
}
