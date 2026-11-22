import type { Catalogo } from '../catalogos/catalogo.entity.js';
import { aUsuarioResumen } from '../presupuestos/presupuestos.mapper.js';
import type { DocumentoCompraDto } from './compras.dto.js';
import type { Referencias } from './compras.repositorio.js';
import { folio, type TipoDocumentoCompra } from './compras.tipos.js';
import type { DocumentoCompra } from './documento-compra.entity.js';

/** Ids de obras, proveedores y usuarios que hay que resolver para proyectar los documentos. */
export function idsDeReferencias(
  documentos: readonly (DocumentoCompra & {
    anuladoPor?: number | null;
    recibidoPor?: number | null;
  })[],
): { obras: number[]; proveedores: number[]; usuarios: number[] } {
  const usuarios = new Set<number>();
  for (const d of documentos) {
    for (const id of [
      d.createdBy,
      d.enviadoPor,
      d.resueltoPor,
      d.anuladoPor ?? null,
      d.recibidoPor ?? null,
    ]) {
      if (id !== null) usuarios.add(id);
    }
  }
  return {
    obras: documentos.map((d) => d.obraId),
    proveedores: documentos.map((d) => d.proveedorId),
    usuarios: [...usuarios],
  };
}

/** Campos comunes del DTO de un documento de compra. */
export function aDocumentoBase(
  tipo: TipoDocumentoCompra,
  d: DocumentoCompra,
  refs: Referencias,
  categorias: ReadonlyMap<number, Catalogo>,
): DocumentoCompraDto {
  const obra = refs.obras.get(d.obraId);
  const proveedor = refs.proveedores.get(d.proveedorId);
  const categoria = categorias.get(d.categoriaGastoId);
  return {
    id: d.id,
    numero: d.numero,
    folio: folio(tipo, d.numero),
    obra: {
      id: d.obraId,
      codigoCentroCosto: obra?.codigoCentroCosto ?? String(d.obraId),
      nombre: obra?.nombre ?? `Obra ${d.obraId}`,
      cerrada: obra?.cerrada ?? false,
    },
    proveedor: {
      id: d.proveedorId,
      rut: proveedor?.rut ?? '',
      razonSocial: proveedor?.razonSocial ?? `Proveedor ${d.proveedorId}`,
    },
    categoria: {
      id: d.categoriaGastoId,
      codigo: categoria?.codigo ?? String(d.categoriaGastoId),
      nombre: categoria?.nombre ?? `Categoría ${d.categoriaGastoId}`,
    },
    descripcion: d.descripcion,
    estado: d.estado,
    creadoPor: aUsuarioResumen(d.createdBy, refs.usuarios),
    creadoEn: d.createdAt.toISOString(),
    actualizadoEn: d.updatedAt.toISOString(),
    enviadoEn: d.enviadoEn?.toISOString() ?? null,
    enviadoPor: aUsuarioResumen(d.enviadoPor, refs.usuarios),
    resueltoEn: d.resueltoEn?.toISOString() ?? null,
    resueltoPor: aUsuarioResumen(d.resueltoPor, refs.usuarios),
    motivoResolucion: d.motivoResolucion,
    version: d.version,
  };
}
