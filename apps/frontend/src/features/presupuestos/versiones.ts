import type { PresupuestoVersionDto } from '@/api/generated';

/** Versión que se muestra: la pedida por `?version=` si existe; si no, la vigente o la más reciente. */
export function versionInicial(
  versiones: PresupuestoVersionDto[],
  pedida: number | null,
): PresupuestoVersionDto | undefined {
  return versiones.find((v) => v.id === pedida) ?? versiones.find((v) => v.vigente) ?? versiones[0];
}
