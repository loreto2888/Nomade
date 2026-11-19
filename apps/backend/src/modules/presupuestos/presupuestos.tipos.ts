/** Estado de una versión de presupuesto (debe coincidir con `ck_presupuesto_version_estado`). */
export enum EstadoPresupuesto {
  Borrador = 'borrador',
  EnRevision = 'en_revision',
  Aprobado = 'aprobado',
  Rechazado = 'rechazado',
}

/** Máximo de partidas de una versión (también el tope de filas de una importación). */
export const MAX_PARTIDAS_POR_VERSION = 5000;
