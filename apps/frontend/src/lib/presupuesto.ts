import type { EstadoPresupuesto, PresupuestoVersionDto } from '@/api/generated';
import type { Sesion } from '@/app/sesion';
import { formatearMonto } from './formato';

export const ETIQUETA_ESTADO_VERSION: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobada',
  rechazado: 'Rechazada',
};

/** Permiso que habilita aprobar y rechazar (el backend siempre valida). */
export const PERMISO_APROBAR_PRESUPUESTO = 'presupuesto.aprobar';

export interface AccionesVersion {
  /** Agregar, modificar y quitar partidas; cambiar la descripción. */
  editar: boolean;
  /** Eliminar el borrador. */
  eliminar: boolean;
  enviarARevision: boolean;
  /** Motivo por el que no se puede enviar, si el estado lo permite pero falta algo. */
  bloqueoEnvio: string | null;
  aprobar: boolean;
  rechazar: boolean;
  /** Si la versión está en revisión y la persona no puede aprobarla: por qué (D-10). */
  bloqueoAprobacion: string | null;
  /** Crear una versión nueva en borrador con las partidas de esta. */
  copiar: boolean;
}

/**
 * Qué acciones del flujo se ofrecen según el estado de la versión, el rol, el permiso y quién la
 * creó. Replica la política del backend (que es la autoridad): un `usuario` no aprueba lo que él
 * mismo creó (D-10); el `admin` sí; una obra cerrada es de solo lectura.
 */
export function accionesDeVersion(
  version: Pick<PresupuestoVersionDto, 'estado' | 'cantidadPartidas' | 'creadoPor'>,
  sesion: Pick<Sesion, 'id' | 'rol' | 'permisos'>,
  obraCerrada: boolean,
): AccionesVersion {
  const borrador = version.estado === 'borrador' && !obraCerrada;
  const enRevision = version.estado === 'en_revision' && !obraCerrada;
  const puedeAprobarPermiso = sesion.permisos.includes(PERMISO_APROBAR_PRESUPUESTO);
  const esCreador = version.creadoPor !== null && version.creadoPor.id === sesion.id;
  const autoaprobacion = esCreador && sesion.rol !== 'admin';

  return {
    editar: borrador,
    eliminar: borrador,
    enviarARevision: borrador,
    bloqueoEnvio:
      borrador && version.cantidadPartidas === 0
        ? 'Agrega al menos una partida para enviar la versión a revisión.'
        : null,
    aprobar: enRevision && puedeAprobarPermiso && !autoaprobacion,
    rechazar: enRevision && puedeAprobarPermiso,
    bloqueoAprobacion:
      enRevision && puedeAprobarPermiso && autoaprobacion
        ? 'No puedes aprobar una versión que tú mismo creaste: debe aprobarla otra persona.'
        : null,
    copiar: !obraCerrada,
  };
}

/** Texto de un total en la moneda de la versión («$ 1.000» o «UF 12,50»). */
export const formatearTotalVersion = (
  version: Pick<PresupuestoVersionDto, 'moneda' | 'total'>,
): string => formatearMonto(version.total, version.moneda);

/**
 * Total estimado de una partida mientras se escribe (cantidad × precio). Es solo una ayuda
 * visual: el total oficial lo calcula el servidor (aritmética decimal exacta).
 */
export function totalEstimado(
  cantidad: number | null,
  precioUnitario: number | null,
  moneda: 'CLP' | 'UF',
): number | null {
  if (cantidad === null || precioUnitario === null) return null;
  const decimales = moneda === 'UF' ? 4 : 0;
  const factor = 10 ** decimales;
  return Math.round((cantidad * precioUnitario + Number.EPSILON) * factor) / factor;
}

/** Interpreta una cantidad escrita a la chilena (`120,5`, `1.234,5678`); `null` si no es válida. */
export function parsearCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '');
  if (limpio === '') return null;
  if (!/^\d[\d.,]*$/.test(limpio)) return null;
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpio)
      ? limpio.replace(/\./g, '')
      : limpio;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/** Cantidad para mostrar: hasta 4 decimales con coma (`120,5`). */
export function formatearCantidad(cantidad: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(cantidad);
}
