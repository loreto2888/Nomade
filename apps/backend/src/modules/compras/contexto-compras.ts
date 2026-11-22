import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorAutenticado } from '../../common/auth/actor.js';
import { conflictoVersion } from '../../common/errores/conflicto-version.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { Reloj } from '../../common/tiempo/reloj.js';
import type { Catalogo } from '../catalogos/catalogo.entity.js';
import { CatalogosRepositorio } from '../catalogos/catalogos.repositorio.js';
import {
  CodigoEstadoObra,
  TipoCatalogo,
} from '../catalogos/catalogos.tipos.js';
import type { Obra } from '../obras/obra.entity.js';
import { ObrasRepositorio } from '../obras/obras.repositorio.js';
import { ProveedoresRepositorio } from '../proveedores/proveedores.repositorio.js';
import type { DocumentoCompra } from './documento-compra.entity.js';
import { EstadoDocumentoCompra } from './compras.tipos.js';

export const errorValidacion = (
  campo: string,
  mensaje: string,
): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.BAD_REQUEST,
    'VALIDACION',
    'Los datos enviados no son válidos.',
    [{ campo, errores: [mensaje] }],
  );

export const noEncontrado = (codigo: string, mensaje: string) =>
  new ErrorAplicacion(HttpStatus.NOT_FOUND, codigo, mensaje);

export const regla = (
  codigo: string,
  mensaje: string,
  detalles?: unknown[],
): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    codigo,
    mensaje,
    detalles,
  );

/** 409 si el cliente no tiene la última versión del documento. */
export function exigirVersion(
  documento: { version: number },
  version: number,
): void {
  if (documento.version !== version) throw conflictoVersion(documento.version);
}

/** Marca una modificación: sube la versión (control optimista) y registra quién la hizo. */
export function tocar(
  documento: DocumentoCompra,
  actor: ActorAutenticado,
): void {
  documento.version += 1;
  documento.updatedBy = actor.id;
}

/**
 * Validaciones de referencias comunes a cotizaciones, OT y OC: la obra debe existir y no estar
 * cerrada (D-21: una obra cerrada es de solo lectura), el proveedor debe estar vigente y la
 * categoría de gasto activa.
 */
@Injectable()
export class ContextoCompras {
  constructor(
    private readonly obras: ObrasRepositorio,
    private readonly proveedores: ProveedoresRepositorio,
    private readonly catalogos: CatalogosRepositorio,
    readonly reloj: Reloj,
  ) {}

  /** Obra bloqueada (`FOR UPDATE`, primer eslabón del orden de bloqueo) y abierta. */
  async obraAbierta(obraId: number, tx: EntityManager): Promise<Obra> {
    if (!(await this.obras.buscarPorIdBloqueando(obraId, tx))) {
      throw regla('OBRA_NO_DISPONIBLE', 'La obra no existe o fue eliminada.', [
        { campo: 'obraId', errores: ['La obra no existe o fue eliminada.'] },
      ]);
    }
    const obra = (await this.obras.buscarConRelaciones(obraId, tx))!;
    if (obra.estado?.codigo === CodigoEstadoObra.Cerrada) {
      throw regla(
        'OBRA_CERRADA',
        'La obra está cerrada: solo se puede consultar.',
      );
    }
    return obra;
  }

  async exigirProveedor(proveedorId: number, tx: EntityManager): Promise<void> {
    if (!(await this.proveedores.buscarPorId(proveedorId, tx))) {
      throw regla(
        'PROVEEDOR_NO_DISPONIBLE',
        'El proveedor no existe o fue eliminado.',
        [
          {
            campo: 'proveedorId',
            errores: ['El proveedor no existe o fue eliminado.'],
          },
        ],
      );
    }
  }

  /** Id de la categoría indicada (debe estar activa) o, sin ella, la del código por defecto. */
  async categoriaActiva(
    categoriaId: number | undefined,
    codigoPorDefecto: string,
    tx: EntityManager,
  ): Promise<number> {
    const categoria =
      categoriaId === undefined
        ? await this.catalogos.buscarPorCodigo(
            TipoCatalogo.CategoriaGasto,
            codigoPorDefecto,
            tx,
          )
        : await this.catalogos.buscarPorId(
            TipoCatalogo.CategoriaGasto,
            categoriaId,
            tx,
          );
    if (!categoria?.activo) {
      throw regla(
        'CATEGORIA_NO_DISPONIBLE',
        'La categoría de gasto no existe o está inactiva.',
        [
          {
            campo: 'categoriaGastoId',
            errores: ['La categoría de gasto no existe o está inactiva.'],
          },
        ],
      );
    }
    return categoria.id;
  }

  /** Todas las categorías de gasto (incluso inactivas, para mostrar documentos antiguos). */
  async categorias(): Promise<Map<number, Catalogo>> {
    const items = await this.catalogos.listar(
      TipoCatalogo.CategoriaGasto,
      true,
    );
    return new Map(items.map((i) => [i.id, i]));
  }

  /** Fecha `YYYY-MM-DD` de hoy en Chile. */
  hoy(): string {
    return this.reloj.hoy();
  }

  ahora(): Date {
    return this.reloj.ahora();
  }
}

/** Transición borrador → en revisión. */
export function marcarEnviado(
  documento: DocumentoCompra,
  actor: ActorAutenticado,
  ahora: Date,
): void {
  documento.estado = EstadoDocumentoCompra.EnRevision;
  documento.enviadoEn = ahora;
  documento.enviadoPor = actor.id;
  tocar(documento, actor);
}

/** Transición en revisión → aprobada | rechazada. */
export function marcarResuelto(
  documento: DocumentoCompra,
  estado: EstadoDocumentoCompra.Aprobada | EstadoDocumentoCompra.Rechazada,
  actor: ActorAutenticado,
  ahora: Date,
  motivo: string | null,
): void {
  documento.estado = estado;
  documento.resueltoEn = ahora;
  documento.resueltoPor = actor.id;
  documento.motivoResolucion = motivo;
  tocar(documento, actor);
}

/** Borrado lógico de un borrador. */
export function marcarEliminado(
  documento: DocumentoCompra,
  actor: ActorAutenticado,
  ahora: Date,
): void {
  documento.eliminadoEn = ahora;
  documento.eliminadoPor = actor.id;
  tocar(documento, actor);
}
