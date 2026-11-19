const formatoFechaHora = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Fecha y hora en español de Chile; devuelve el texto original si no es una fecha válida. */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : formatoFechaHora.format(fecha);
}

/** Iniciales (hasta 2) de un nombre para el avatar. */
export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
