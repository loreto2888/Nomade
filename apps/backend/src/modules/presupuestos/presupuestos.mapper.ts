import type { Catalogo } from '../catalogos/catalogo.entity.js';
import type { Partida } from './partida.entity.js';
import type { PresupuestoVersion } from './presupuesto-version.entity.js';
import type {
  FamiliaResumenDto,
  PartidaDto,
  PresupuestoVersionDto,
  TotalFamiliaDto,
  UsuarioResumenDto,
} from './presupuestos.dto.js';
import type { TotalFamilia } from './calculo.js';

export type NombresUsuarios = ReadonlyMap<number, string>;

export function aUsuarioResumen(
  id: number | null,
  nombres: NombresUsuarios,
): UsuarioResumenDto | null {
  if (id === null) return null;
  return { id, nombre: nombres.get(id) ?? `Usuario ${id}` };
}

/** Ids de usuario que aparecen en las versiones (para resolver sus nombres en una consulta). */
export function idsDeUsuarios(
  versiones: readonly PresupuestoVersion[],
): number[] {
  const ids = new Set<number>();
  for (const v of versiones) {
    for (const id of [v.createdBy, v.enviadoPor, v.resueltoPor]) {
      if (id !== null) ids.add(id);
    }
  }
  return [...ids];
}

export function aVersionDto(
  v: PresupuestoVersion,
  nombres: NombresUsuarios,
  numeroDeVersion: (id: number) => number | null,
): PresupuestoVersionDto {
  return {
    id: v.id,
    obraId: v.obraId,
    numero: v.numero,
    estado: v.estado,
    vigente: v.vigente,
    descripcion: v.descripcion,
    moneda: v.moneda,
    valorUf: v.valorUf,
    fechaValorUf: v.fechaValorUf,
    total: v.total,
    totalClp: v.totalClp,
    cantidadPartidas: v.cantidadPartidas,
    copiadaDeId: v.copiadaDeId,
    copiadaDeNumero:
      v.copiadaDeId === null ? null : numeroDeVersion(v.copiadaDeId),
    importacionLoteId: v.importacionLoteId,
    creadoPor: aUsuarioResumen(v.createdBy, nombres),
    creadoEn: v.createdAt.toISOString(),
    actualizadoEn: v.updatedAt.toISOString(),
    enviadoEn: v.enviadoEn?.toISOString() ?? null,
    enviadoPor: aUsuarioResumen(v.enviadoPor, nombres),
    resueltoEn: v.resueltoEn?.toISOString() ?? null,
    resueltoPor: aUsuarioResumen(v.resueltoPor, nombres),
    motivoResolucion: v.motivoResolucion,
    version: v.version,
  };
}

export function aFamiliaResumen(
  familiaId: number,
  familias: ReadonlyMap<number, Catalogo>,
): FamiliaResumenDto {
  const familia = familias.get(familiaId);
  return {
    id: familiaId,
    codigo: familia?.codigo ?? String(familiaId),
    nombre: familia?.nombre ?? `Familia ${familiaId}`,
  };
}

export function aPartidaDto(
  p: Partida,
  familias: ReadonlyMap<number, Catalogo>,
): PartidaDto {
  return {
    id: p.id,
    versionId: p.versionId,
    orden: p.orden,
    codigo: p.codigo,
    familia: aFamiliaResumen(p.familiaId, familias),
    descripcion: p.descripcion,
    unidad: p.unidad,
    cantidad: p.cantidad,
    precioUnitario: p.precioUnitario,
    total: p.total,
    totalClp: p.totalClp,
    version: p.version,
  };
}

/** Totales por familia en el orden del catálogo (y las familias desconocidas al final). */
export function aTotalesFamiliaDto(
  totales: readonly TotalFamilia[],
  familias: ReadonlyMap<number, Catalogo>,
): TotalFamiliaDto[] {
  const orden = (id: number) =>
    familias.get(id)?.orden ?? Number.MAX_SAFE_INTEGER;
  return [...totales]
    .sort(
      (a, b) =>
        orden(a.familiaId) - orden(b.familiaId) || a.familiaId - b.familiaId,
    )
    .map((t) => ({
      familia: aFamiliaResumen(t.familiaId, familias),
      cantidadPartidas: t.cantidadPartidas,
      total: t.total,
      totalClp: t.totalClp,
    }));
}
