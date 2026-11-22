import type { EstadoDocumentoCompra, TipoOrdenCompra } from '@/api/generated';
import type { Sesion } from '@/app/sesion';

export type TipoDocumento = 'cotizacion' | 'orden_trabajo' | 'orden_compra';

export const ETIQUETA_ESTADO_COMPRA: Record<EstadoDocumentoCompra, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  recibida: 'Recibida',
  anulada: 'Anulada',
};

export const ETIQUETA_TIPO_OC: Record<TipoOrdenCompra, string> = {
  materiales: 'Materiales',
  parcial_ot: 'Parcial de OT',
};

export const NOMBRE_DOCUMENTO: Record<TipoDocumento, string> = {
  cotizacion: 'cotización',
  orden_trabajo: 'orden de trabajo',
  orden_compra: 'orden de compra',
};

/** Permiso con que se aprueba y rechaza cada documento (el backend siempre valida). */
export const PERMISO_APROBAR: Record<TipoDocumento, string> = {
  cotizacion: 'cotizacion.aprobar',
  orden_trabajo: 'ot.aprobar',
  orden_compra: 'oc.aprobar',
};

export const PERMISO_ANULAR: Partial<Record<TipoDocumento, string>> = {
  orden_trabajo: 'ot.anular',
  orden_compra: 'oc.anular',
};

export interface AccionesDocumento {
  editar: boolean;
  eliminar: boolean;
  enviar: boolean;
  aprobar: boolean;
  rechazar: boolean;
  /** En revisión, pero la persona no puede aprobarlo: por qué (D-10). */
  bloqueoAprobacion: string | null;
  anular: boolean;
  recibir: boolean;
}

/**
 * Acciones que se ofrecen según el estado, el tipo de documento, los permisos y quién lo creó.
 * Replica las reglas del backend (la autoridad): un `usuario` no aprueba lo que él mismo creó (D-10)
 * y el `admin` sí; una obra cerrada es de solo lectura; lo aprobado no se edita (supuesto H5).
 */
export function accionesDeDocumento(
  tipo: TipoDocumento,
  documento: { estado: EstadoDocumentoCompra; creadoPor: { id: number } | null },
  sesion: Pick<Sesion, 'id' | 'rol' | 'permisos'>,
  obraCerrada = false,
): AccionesDocumento {
  const abierta = !obraCerrada;
  const { estado } = documento;
  const borrador = abierta && estado === 'borrador';
  const enRevision = abierta && estado === 'en_revision';
  const aprobada = abierta && estado === 'aprobada';
  const puedeAprobar = sesion.permisos.includes(PERMISO_APROBAR[tipo]);
  const autoaprobacion =
    documento.creadoPor !== null && documento.creadoPor.id === sesion.id && sesion.rol !== 'admin';
  const permisoAnular = PERMISO_ANULAR[tipo];
  return {
    editar: borrador,
    eliminar: borrador,
    enviar: borrador,
    aprobar: enRevision && puedeAprobar && !autoaprobacion,
    rechazar: enRevision && puedeAprobar,
    bloqueoAprobacion:
      enRevision && puedeAprobar && autoaprobacion
        ? `No puedes aprobar una ${NOMBRE_DOCUMENTO[tipo]} que tú mismo creaste: debe aprobarla otra persona.`
        : null,
    anular: aprobada && permisoAnular !== undefined && sesion.permisos.includes(permisoAnular),
    recibir: aprobada && tipo === 'orden_compra',
  };
}

const formatoPorcentaje = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

/** `33,33 %` */
export const formatearPorcentaje = (valor: number): string =>
  `${formatoPorcentaje.format(valor)} %`;

/** Porcentaje escrito a la chilena (`33,33`); `null` si no es un número válido. */
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|%/g, '').replace(',', '.');
  if (limpio === '' || !/^\d+(\.\d+)?$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

/** Suma de porcentajes en centésimas (sin errores de punto flotante). */
export const sumarPorcentajes = (valores: readonly number[]): number =>
  valores.reduce((s, v) => s + Math.round(v * 100), 0) / 100;

/** Monto de un porcentaje de un total (ayuda visual; el monto oficial lo calcula el servidor). */
export const montoDePorcentaje = (total: number, porcentaje: number): number =>
  Math.round((total * Math.round(porcentaje * 100)) / 10000);
