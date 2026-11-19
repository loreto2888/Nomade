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

// Las fechas de calendario (`AAAA-MM-DD`, sin hora) se formatean en UTC para que el huso del
// navegador no las corra un día.
const formatoFecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' });

/** Fecha de calendario `AAAA-MM-DD` → «1 mar 2026». `—` si no hay valor. */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fecha : formatoFecha.format(d);
}

const formatoCLP = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const formatoUF = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Pesos chilenos: `$ 185.000.000`. `—` si no hay valor. */
export function formatCLP(monto: number | null | undefined): string {
  if (monto === null || monto === undefined) return '—';
  return `$ ${formatoCLP.format(monto)}`;
}

/** Unidades de fomento: `UF 4.710,50` (2 a 4 decimales). `—` si no hay valor. */
export function formatUF(monto: number | null | undefined): string {
  if (monto === null || monto === undefined) return '—';
  return `UF ${formatoUF.format(monto)}`;
}

/** Monto en su moneda original (`CLP` o `UF`). */
export function formatearMonto(monto: number | null | undefined, moneda: 'CLP' | 'UF'): string {
  return moneda === 'UF' ? formatUF(monto) : formatCLP(monto);
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

/** Tamaño de archivo legible: `482 KB`, `3,4 MB`. */
export function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
