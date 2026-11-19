/** Vigencia máxima de una sesión (D-11). */
export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
/** Inactividad máxima antes de expirar la sesión (D-11). */
export const INACTIVIDAD_MAXIMA_MS = 30 * 60 * 1000;
/** La última actividad se persiste como máximo una vez por este intervalo. */
export const INTERVALO_ACTIVIDAD_MS = 60 * 1000;

export type EstadoSesion = 'valida' | 'revocada' | 'expirada' | 'inactiva';

export interface DatosSesion {
  expiraEn: Date;
  ultimaActividadEn: Date;
  revocadaEn: Date | null;
}

export function calcularExpiracion(ahora: Date): Date {
  return new Date(ahora.getTime() + DURACION_SESION_MS);
}

/** Evalúa una sesión: revocada, vencida (8 h) o inactiva (30 min). */
export function evaluarSesion(sesion: DatosSesion, ahora: Date): EstadoSesion {
  if (sesion.revocadaEn !== null) return 'revocada';
  if (ahora.getTime() >= sesion.expiraEn.getTime()) return 'expirada';
  if (
    ahora.getTime() - sesion.ultimaActividadEn.getTime() >=
    INACTIVIDAD_MAXIMA_MS
  ) {
    return 'inactiva';
  }
  return 'valida';
}

/** ¿Corresponde persistir la actividad? (evita una escritura por request). */
export function debeRegistrarActividad(
  sesion: Pick<DatosSesion, 'ultimaActividadEn'>,
  ahora: Date,
): boolean {
  return (
    ahora.getTime() - sesion.ultimaActividadEn.getTime() >=
    INTERVALO_ACTIVIDAD_MS
  );
}
