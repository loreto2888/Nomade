import type { ChipProps } from '@mui/material/Chip';

type ColorChip = NonNullable<ChipProps['color']>;

export interface Semantica {
  color: ColorChip;
  variant?: ChipProps['variant'];
}

/**
 * Semántica de color de los estados (plan §10.1): pendiente/revisión = advertencia,
 * excepción/rechazado = error, aprobado/activo = éxito, cerrado = neutro.
 */
export const SEMANTICA: Record<string, Semantica> = {
  // Estados de obra
  en_preparacion: { color: 'info' },
  activa: { color: 'success' },
  suspendida: { color: 'warning' },
  terminada: { color: 'primary', variant: 'outlined' },
  cerrada: { color: 'default', variant: 'outlined' },
  // Estados genéricos de documentos (fases siguientes)
  borrador: { color: 'default' },
  pendiente: { color: 'warning' },
  en_revision: { color: 'warning' },
  aprobado: { color: 'success' },
  aprobada: { color: 'success' },
  pagado: { color: 'success' },
  excepcion: { color: 'error' },
  rechazado: { color: 'error' },
  rechazada: { color: 'error' },
  cerrado: { color: 'default', variant: 'outlined' },
  anulado: { color: 'default', variant: 'outlined' },
  activo: { color: 'success' },
  inactivo: { color: 'default' },
};

/** Color MUI de un estado (por su código); `default` si no se conoce. */
export function colorDeEstado(codigo: string): ColorChip {
  return SEMANTICA[codigo]?.color ?? 'default';
}
