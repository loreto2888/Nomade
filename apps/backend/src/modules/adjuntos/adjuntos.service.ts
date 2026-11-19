import { createHash } from 'node:crypto';
import type { ReadStream } from 'node:fs';
import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActorAutenticado,
  ContextoAuditoria,
} from '../../common/auth/actor.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import type { Adjunto } from './adjunto.entity.js';
import { AlmacenArchivos } from './almacen-archivos.js';
import type {
  AdjuntoDto,
  EliminarAdjuntoDto,
  ListarAdjuntosDto,
  SubirAdjuntoDto,
} from './adjuntos.dto.js';
import { AdjuntosRepositorio } from './adjuntos.repositorio.js';
import { limpiarNombreArchivo, validarArchivo } from './politica-archivos.js';

/** Archivo recibido por multer (memoria). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export function aAdjuntoDto(a: Adjunto): AdjuntoDto {
  return {
    id: a.id,
    entidadTipo: a.entidadTipo,
    entidadId: a.entidadId,
    nombreOriginal: a.nombreOriginal,
    tipoMime: a.tipoMime,
    extension: a.extension,
    tamanioBytes: a.tamanioBytes,
    descripcion: a.descripcion,
    creadoEn: a.createdAt.toISOString(),
    creadoPor: a.createdBy,
  };
}

export interface DescargaAdjunto {
  nombre: string;
  tipoMime: string;
  tamanioBytes: number;
  flujo: ReadStream;
}

@Injectable()
export class AdjuntosService {
  constructor(
    private readonly repositorio: AdjuntosRepositorio,
    private readonly almacen: AlmacenArchivos,
  ) {}

  async listar(filtro: ListarAdjuntosDto): Promise<AdjuntoDto[]> {
    if (
      !(await this.repositorio.existeEntidad(
        filtro.entidadTipo,
        filtro.entidadId,
      ))
    ) {
      throw entidadNoEncontrada();
    }
    return (
      await this.repositorio.listarDeEntidad(
        filtro.entidadTipo,
        filtro.entidadId,
      )
    ).map(aAdjuntoDto);
  }

  /**
   * Valida el archivo (tipo, contenido, 20 MB), lo guarda en disco y registra
   * sus metadatos. Si el registro falla, el archivo recién escrito se elimina.
   */
  async subir(
    archivo: ArchivoSubido | undefined,
    dto: SubirAdjuntoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<AdjuntoDto> {
    if (!archivo) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'ARCHIVO_REQUERIDO',
        'Adjunta un archivo en el campo "archivo".',
      );
    }
    const nombre = limpiarNombreArchivo(archivo.originalname);
    const validado = validarArchivo({ nombre, contenido: archivo.buffer });
    if (
      !(await this.repositorio.existeEntidad(dto.entidadTipo, dto.entidadId))
    ) {
      throw entidadNoEncontrada();
    }

    const clave = await this.almacen.guardar(
      archivo.buffer,
      validado.extension,
    );
    try {
      const creado = await this.repositorio.crear({
        entidadTipo: dto.entidadTipo,
        entidadId: dto.entidadId,
        nombreOriginal: nombre,
        claveAlmacenamiento: clave,
        tipoMime: validado.tipoMime,
        extension: validado.extension,
        tamanioBytes: archivo.buffer.length,
        sha256: createHash('sha256').update(archivo.buffer).digest('hex'),
        descripcion: dto.descripcion ?? null,
        createdBy: actor.id,
      });
      const resultado = aAdjuntoDto(creado);
      auditoria.entidadId = creado.id;
      auditoria.despues = resultado;
      return resultado;
    } catch (error) {
      await this.almacen.eliminar(clave);
      throw error;
    }
  }

  /** Abre el archivo para descargarlo (la ruta exige sesión; nunca se sirve de forma pública). */
  async descargar(id: number): Promise<DescargaAdjunto> {
    const adjunto = await this.repositorio.buscarPorId(id);
    if (!adjunto) throw noEncontrado();
    return {
      nombre: adjunto.nombreOriginal,
      tipoMime: adjunto.tipoMime,
      tamanioBytes: adjunto.tamanioBytes,
      flujo: this.almacen.abrir(adjunto.claveAlmacenamiento),
    };
  }

  /** Borrado lógico: se conserva el archivo en disco y su registro. */
  async eliminar(
    id: number,
    dto: EliminarAdjuntoDto,
    actor: ActorAutenticado,
    auditoria: ContextoAuditoria,
  ): Promise<void> {
    const adjunto = await this.repositorio.buscarPorId(id);
    if (!adjunto) throw noEncontrado();
    adjunto.eliminadoEn = new Date();
    adjunto.eliminadoPor = actor.id;
    await this.repositorio.guardar(adjunto);
    auditoria.entidadId = id;
    auditoria.antes = aAdjuntoDto(adjunto);
    auditoria.motivo = dto.motivo;
  }
}

const noEncontrado = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'ADJUNTO_NO_ENCONTRADO',
    'El adjunto no existe.',
  );

const entidadNoEncontrada = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.NOT_FOUND,
    'ENTIDAD_NO_ENCONTRADA',
    'El registro al que quieres adjuntar el archivo no existe.',
  );
