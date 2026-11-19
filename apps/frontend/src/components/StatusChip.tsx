import Chip, { type ChipProps } from '@mui/material/Chip';
import { SEMANTICA } from './estados';

interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  /** Código estable del estado (`activa`, `en_revision`…). */
  estado: string;
  /** Texto visible; por defecto, el código con formato legible. */
  etiqueta?: string;
}

function legible(codigo: string): string {
  const texto = codigo.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Chip de estado con la misma semántica de color en toda la aplicación. */
export function StatusChip({ estado, etiqueta, size = 'small', ...resto }: StatusChipProps) {
  const semantica = SEMANTICA[estado];
  return (
    <Chip
      size={size}
      color={semantica?.color ?? 'default'}
      variant={semantica?.variant ?? 'filled'}
      label={etiqueta ?? legible(estado)}
      {...resto}
    />
  );
}
