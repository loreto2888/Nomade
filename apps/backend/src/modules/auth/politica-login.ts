/** Intentos fallidos consecutivos que bloquean la cuenta (§13 del plan). */
export const MAX_INTENTOS_FALLIDOS = 5;
/** Duración del bloqueo temporal. */
export const DURACION_BLOQUEO_MS = 15 * 60 * 1000;

export function estaBloqueado(
  usuario: { bloqueadoHasta: Date | null },
  ahora: Date,
): boolean {
  return (
    usuario.bloqueadoHasta !== null &&
    usuario.bloqueadoHasta.getTime() > ahora.getTime()
  );
}

/** Minutos que faltan para el desbloqueo, redondeados hacia arriba (mínimo 1). */
export function minutosRestantes(bloqueadoHasta: Date, ahora: Date): number {
  return Math.max(
    1,
    Math.ceil((bloqueadoHasta.getTime() - ahora.getTime()) / 60_000),
  );
}

export interface ResultadoFallo {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  /** `true` si este fallo disparó el bloqueo. */
  bloqueada: boolean;
}

/**
 * Cuenta un intento fallido. Al llegar al máximo se bloquea la cuenta y el
 * contador vuelve a cero (tras el bloqueo se parte de cero).
 */
export function registrarFalloLogin(
  usuario: { intentosFallidos: number },
  ahora: Date,
): ResultadoFallo {
  const intentos = usuario.intentosFallidos + 1;
  if (intentos >= MAX_INTENTOS_FALLIDOS) {
    return {
      intentosFallidos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + DURACION_BLOQUEO_MS),
      bloqueada: true,
    };
  }
  return { intentosFallidos: intentos, bloqueadoHasta: null, bloqueada: false };
}
