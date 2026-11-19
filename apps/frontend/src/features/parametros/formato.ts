import type { ParametroDto, ValorParametroDto } from '@/api/parametros';

/** Valor de un parámetro con su unidad: `19 %`, `30 días`. `—` si no hay valor. */
export function textoValor(
  parametro: Pick<ParametroDto, 'unidad'>,
  valor: ValorParametroDto | null,
): string {
  if (!valor) return '—';
  return parametro.unidad ? `${valor.valor.replace('.', ',')} ${parametro.unidad}` : valor.valor;
}
