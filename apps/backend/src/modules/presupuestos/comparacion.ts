export type TipoCambioPartida =
  'nueva' | 'eliminada' | 'modificada' | 'sin_cambios';

export interface PartidaComparable {
  codigo: string;
  orden: number;
  familiaId: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  totalClp: number;
}

export interface FilaComparacion {
  codigo: string;
  cambio: TipoCambioPartida;
  /** Partida en la versión base (`null` si es nueva). */
  base: PartidaComparable | null;
  /** Partida en la versión comparada (`null` si fue eliminada). */
  nueva: PartidaComparable | null;
  /** `totalClp` nuevo − `totalClp` base (una partida ausente cuenta como 0). */
  diferenciaClp: number;
}

export interface ResultadoComparacion {
  filas: FilaComparacion[];
  totalBaseClp: number;
  totalNuevoClp: number;
  diferenciaClp: number;
  nuevas: number;
  eliminadas: number;
  modificadas: number;
  sinCambios: number;
}

/**
 * Una partida cambió si difiere su definición. Si las versiones están en monedas distintas los
 * precios no son comparables y se compara el total en CLP.
 */
function cambio(
  base: PartidaComparable,
  nueva: PartidaComparable,
  mismaMoneda: boolean,
): boolean {
  if (
    base.familiaId !== nueva.familiaId ||
    base.descripcion !== nueva.descripcion ||
    base.unidad !== nueva.unidad
  ) {
    return true;
  }
  if (!mismaMoneda) return base.totalClp !== nueva.totalClp;
  return (
    base.cantidad !== nueva.cantidad ||
    base.precioUnitario !== nueva.precioUnitario
  );
}

/**
 * Compara dos versiones por código de partida. Orden del resultado: las partidas de la versión
 * nueva en su orden y, al final, las eliminadas (en el orden de la base).
 */
export function compararPartidas(
  base: readonly PartidaComparable[],
  nueva: readonly PartidaComparable[],
  mismaMoneda: boolean,
): ResultadoComparacion {
  const porCodigoBase = new Map(base.map((p) => [p.codigo, p]));
  const codigosNueva = new Set(nueva.map((p) => p.codigo));
  const filas: FilaComparacion[] = [];

  for (const partida of [...nueva].sort((a, b) => a.orden - b.orden)) {
    const anterior = porCodigoBase.get(partida.codigo) ?? null;
    if (!anterior) {
      filas.push({
        codigo: partida.codigo,
        cambio: 'nueva',
        base: null,
        nueva: partida,
        diferenciaClp: partida.totalClp,
      });
      continue;
    }
    filas.push({
      codigo: partida.codigo,
      cambio: cambio(anterior, partida, mismaMoneda)
        ? 'modificada'
        : 'sin_cambios',
      base: anterior,
      nueva: partida,
      diferenciaClp: partida.totalClp - anterior.totalClp,
    });
  }
  for (const partida of [...base].sort((a, b) => a.orden - b.orden)) {
    if (codigosNueva.has(partida.codigo)) continue;
    filas.push({
      codigo: partida.codigo,
      cambio: 'eliminada',
      base: partida,
      nueva: null,
      diferenciaClp: -partida.totalClp,
    });
  }

  const contar = (tipo: TipoCambioPartida) =>
    filas.filter((f) => f.cambio === tipo).length;
  const totalBaseClp = base.reduce((s, p) => s + p.totalClp, 0);
  const totalNuevoClp = nueva.reduce((s, p) => s + p.totalClp, 0);
  return {
    filas,
    totalBaseClp,
    totalNuevoClp,
    diferenciaClp: totalNuevoClp - totalBaseClp,
    nuevas: contar('nueva'),
    eliminadas: contar('eliminada'),
    modificadas: contar('modificada'),
    sinCambios: contar('sin_cambios'),
  };
}
