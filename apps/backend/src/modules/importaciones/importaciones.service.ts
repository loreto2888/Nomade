import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import {
  limpiarNombreArchivo,
  validarArchivo,
} from '../adjuntos/politica-archivos.js';
import type { ArchivoSubido } from '../adjuntos/adjuntos.service.js';
import { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import {
  CodigoEstadoObra,
  TipoCatalogo,
} from '../catalogos/catalogos.tipos.js';
import type { Obra } from '../obras/obra.entity.js';
import { ObrasRepositorio } from '../obras/obras.repositorio.js';
import { PresupuestosService } from '../presupuestos/presupuestos.service.js';
import type { ImportacionFila } from './importacion-fila.entity.js';
import type { ImportacionLote } from './importacion-lote.entity.js';
import type {
  ConfirmarImportacionDto,
  DescartarImportacionDto,
  FilaImportacionDto,
  ImportacionLoteDto,
  ListarFilasImportacionDto,
  ListarImportacionesDto,
  PaginaFilasImportacionDto,
  PaginaImportacionesDto,
  SubirImportacionPresupuestoDto,
} from './importaciones.dto.js';
import { ImportacionesRepositorio } from './importaciones.repositorio.js';
import { EstadoImportacion, TipoImportacion } from './importaciones.tipos.js';
import { leerPlanilla, type CeldaCruda } from './planilla.js';
import {
  NOMBRE_PLANTILLA_PRESUPUESTO,
  generarPlantillaPresupuesto,
} from './plantilla-presupuesto.js';
import {
  montoDeFilasValidas,
  validarFilasPresupuesto,
  type FamiliaDisponible,
} from './validacion-presupuesto.js';

const loteNoEncontrado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'IMPORTACION_NO_ENCONTRADA',
    'La importación no existe.',
  );

const obraNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'OBRA_NO_ENCONTRADA',
    'La obra de destino no existe.',
  );

function exigirObraAbierta(obra: Obra): void {
  if (obra.estado?.codigo === CodigoEstadoObra.Cerrada) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'OBRA_CERRADA',
      'La obra está cerrada: solo se puede consultar.',
    );
  }
}

const aTexto = (valor: CeldaCruda | undefined): string | null =>
  valor === null || valor === undefined ? null : String(valor);

export function aFilaDto(fila: ImportacionFila): FilaImportacionDto {
  return {
    numeroFila: fila.numeroFila,
    datos: {
      codigo: aTexto(fila.datos.codigo),
      familia: aTexto(fila.datos.familia),
      descripcion: aTexto(fila.datos.descripcion),
      unidad: aTexto(fila.datos.unidad),
      cantidad: aTexto(fila.datos.cantidad),
      precioUnitario: aTexto(fila.datos.precioUnitario),
    },
    valida: fila.valida,
    errores: fila.errores.map((e) => ({ campo: e.campo, mensaje: e.mensaje })),
  };
}

@Injectable()
export class ImportacionesService {
  constructor(
    private readonly repositorio: ImportacionesRepositorio,
    private readonly obras: ObrasRepositorio,
    private readonly catalogos: CatalogosRepositorio,
    private readonly presupuestos: PresupuestosService,
    private readonly reloj: Reloj,
  ) {}

  /** Plantilla provisoria de presupuesto con las familias activas del catálogo. */
  async plantillaPresupuesto(): Promise<{ nombre: string; contenido: Buffer }> {
    return {
      nombre: NOMBRE_PLANTILLA_PRESUPUESTO,
      contenido: await generarPlantillaPresupuesto(
        await this.familiasActivas(),
      ),
    };
  }

  /**
   * Sube una planilla de presupuesto: la lee, valida fila a fila y guarda el lote para su
   * previsualización. No crea nada en el presupuesto hasta que se confirme.
   */
  async subirPresupuesto(
    archivo: ArchivoSubido | undefined,
    dto: SubirImportacionPresupuestoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    if (!archivo) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'ARCHIVO_REQUERIDO',
        'Adjunta un archivo en el campo "archivo".',
      );
    }
    const nombre = limpiarNombreArchivo(archivo.originalname);
    const validado = validarArchivo({ nombre, contenido: archivo.buffer });
    if (validado.extension !== 'xlsx' && validado.extension !== 'csv') {
      throw new ErrorAplicacion(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        'TIPO_ARCHIVO_NO_PERMITIDO',
        'Para importar un presupuesto sube un archivo .xlsx o .csv.',
      );
    }
    const obra = await this.obras.buscarConRelaciones(dto.obraId);
    if (!obra) throw obraNoEncontrada();
    exigirObraAbierta(obra);

    const filas = await leerPlanilla(archivo.buffer, validado.extension);
    const resultados = validarFilasPresupuesto(filas, {
      moneda: obra.monedaContrato,
      familias: await this.familiasActivas(),
    });
    const filasConError = resultados.filter((r) => r.errores.length > 0).length;

    const lote = await this.repositorio.enTransaccion((tx) =>
      this.repositorio.crearLote(
        {
          tipo: TipoImportacion.Presupuesto,
          estado: EstadoImportacion.Previsualizado,
          obraId: obra.id,
          nombreArchivo: nombre,
          tamanioBytes: archivo.buffer.length,
          sha256: createHash('sha256').update(archivo.buffer).digest('hex'),
          totalFilas: filas.length,
          filasValidas: filas.length - filasConError,
          filasConError,
          montoTotal: montoDeFilasValidas(resultados, obra.monedaContrato),
          moneda: obra.monedaContrato,
          version: 1,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        filas.map((fila, indice) => ({
          numeroFila: fila.numeroFila,
          datos: fila.celdas,
          valida: resultados[indice].errores.length === 0,
          errores: resultados[indice].errores,
        })),
        tx,
      ),
    );
    lote.obra = obra;
    const resultado = await this.aDto(lote);
    auditoria.entidadId = lote.id;
    auditoria.despues = resultado;
    return resultado;
  }

  async listar(
    filtro: ListarImportacionesDto,
  ): Promise<PaginaImportacionesDto> {
    const [lotes, total] = await this.repositorio.listarLotes(filtro);
    const nombres = await this.repositorio.nombresDeUsuarios(
      lotes.flatMap((l) => (l.createdBy === null ? [] : [l.createdBy])),
    );
    return {
      items: lotes.map((l) => aLoteDto(l, nombres)),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  async obtener(id: number): Promise<ImportacionLoteDto> {
    const lote = await this.repositorio.buscarLote(id);
    if (!lote) throw loteNoEncontrado();
    return this.aDto(lote);
  }

  async listarFilas(
    id: number,
    filtro: ListarFilasImportacionDto,
  ): Promise<PaginaFilasImportacionDto> {
    if (!(await this.repositorio.buscarLote(id))) throw loteNoEncontrado();
    const [filas, total] = await this.repositorio.listarFilas(id, {
      soloErrores: filtro.soloErrores ?? false,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    });
    return {
      items: filas.map(aFilaDto),
      total,
      pagina: filtro.pagina,
      tamanio: filtro.tamanio,
    };
  }

  /**
   * Confirma un lote sin errores: vuelve a validar sus filas contra el catálogo y la obra de hoy y
   * crea la versión de presupuesto en borrador. Todo en una transacción con el lote bloqueado, de
   * modo que una doble confirmación no cree dos versiones.
   */
  async confirmar(
    id: number,
    dto: ConfirmarImportacionDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    const lote = await this.repositorio.enTransaccion(async (tx) => {
      const lote = await this.repositorio.buscarLoteBloqueando(id, tx);
      if (!lote) throw loteNoEncontrado();
      if (lote.version !== dto.version) throw conflictoVersion(lote.version);
      exigirPrevisualizado(lote);
      if (lote.filasConError > 0) {
        throw new ErrorAplicacion(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'IMPORTACION_CON_ERRORES',
          `El lote tiene ${lote.filasConError} fila(s) con errores: corrígelos en la planilla y vuelve a subirla.`,
        );
      }
      const obra = lote.obraId
        ? await this.obras.buscarConRelaciones(lote.obraId, tx)
        : null;
      if (!obra) throw obraNoEncontrada();
      exigirObraAbierta(obra);

      const filas = await this.repositorio.todasLasFilas(lote.id, tx);
      const resultados = validarFilasPresupuesto(
        filas.map((f) => ({ numeroFila: f.numeroFila, celdas: f.datos })),
        {
          moneda: obra.monedaContrato,
          familias: await this.familiasActivas(),
        },
      );
      if (resultados.some((r) => r.errores.length > 0)) {
        throw new ErrorAplicacion(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'IMPORTACION_DESACTUALIZADA',
          'Los datos del lote ya no son válidos (cambió el catálogo o la moneda de la obra). Descarta el lote y vuelve a subir la planilla.',
        );
      }

      const version = await this.presupuestos.crearEnTransaccion(tx, {
        obraId: obra.id,
        descripcion: `Importada de ${lote.nombreArchivo}`.slice(0, 200),
        partidas: resultados.map((r) => r.partida!),
        importacionLoteId: lote.id,
        actor,
      });
      lote.estado = EstadoImportacion.Confirmado;
      lote.confirmadoEn = this.reloj.ahora();
      lote.confirmadoPor = actor.id;
      lote.presupuestoVersionId = version.id;
      lote.version += 1;
      lote.updatedBy = actor.id;
      return this.repositorio.guardarLote(lote, tx);
    });
    const resultado = await this.aDto(
      (await this.repositorio.buscarLote(lote.id))!,
    );
    auditoria.entidadId = id;
    auditoria.antes = { estado: EstadoImportacion.Previsualizado };
    auditoria.despues = resultado;
    return resultado;
  }

  async descartar(
    id: number,
    dto: DescartarImportacionDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<ImportacionLoteDto> {
    await this.repositorio.enTransaccion(async (tx) => {
      const lote = await this.repositorio.buscarLoteBloqueando(id, tx);
      if (!lote) throw loteNoEncontrado();
      if (lote.version !== dto.version) throw conflictoVersion(lote.version);
      exigirPrevisualizado(lote);
      lote.estado = EstadoImportacion.Descartado;
      lote.descartadoEn = this.reloj.ahora();
      lote.descartadoPor = actor.id;
      lote.version += 1;
      lote.updatedBy = actor.id;
      await this.repositorio.guardarLote(lote, tx);
    });
    const resultado = await this.aDto((await this.repositorio.buscarLote(id))!);
    auditoria.entidadId = id;
    auditoria.antes = { estado: EstadoImportacion.Previsualizado };
    auditoria.despues = resultado;
    auditoria.motivo = dto.motivo;
    return resultado;
  }

  // ---------------------------------------------------------------------------

  private async familiasActivas(): Promise<FamiliaDisponible[]> {
    const items = await this.catalogos.listar(
      TipoCatalogo.FamiliaPartida,
      false,
    );
    return items.map((i) => ({ id: i.id, codigo: i.codigo, nombre: i.nombre }));
  }

  private async aDto(lote: ImportacionLote): Promise<ImportacionLoteDto> {
    const nombres = await this.repositorio.nombresDeUsuarios(
      lote.createdBy === null ? [] : [lote.createdBy],
    );
    return aLoteDto(lote, nombres);
  }
}

function exigirPrevisualizado(lote: ImportacionLote): void {
  if (lote.estado === EstadoImportacion.Previsualizado) return;
  throw new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'IMPORTACION_NO_PENDIENTE',
    lote.estado === EstadoImportacion.Confirmado
      ? 'El lote ya fue confirmado.'
      : 'El lote fue descartado.',
  );
}

function aLoteDto(
  lote: ImportacionLote,
  nombres: ReadonlyMap<number, string>,
): ImportacionLoteDto {
  return {
    id: lote.id,
    tipo: lote.tipo,
    estado: lote.estado,
    obra: lote.obra
      ? {
          id: lote.obra.id,
          codigoCentroCosto: lote.obra.codigoCentroCosto,
          nombre: lote.obra.nombre,
        }
      : null,
    nombreArchivo: lote.nombreArchivo,
    tamanioBytes: lote.tamanioBytes,
    totalFilas: lote.totalFilas,
    filasValidas: lote.filasValidas,
    filasConError: lote.filasConError,
    montoTotal: lote.montoTotal,
    moneda: lote.moneda,
    presupuestoVersionId: lote.presupuestoVersionId,
    confirmadoEn: lote.confirmadoEn?.toISOString() ?? null,
    creadoPor:
      lote.createdBy === null
        ? null
        : {
            id: lote.createdBy,
            nombre: nombres.get(lote.createdBy) ?? `Usuario ${lote.createdBy}`,
          },
    creadoEn: lote.createdAt.toISOString(),
    version: lote.version,
  };
}
