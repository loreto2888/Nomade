import type { TipoCatalogo } from '@/api/catalogos';

export const ETIQUETA_CATALOGO: Record<TipoCatalogo, string> = {
  estado_obra: 'Estados de obra',
  tipo_documento: 'Tipos de documento',
  categoria_gasto: 'Categorías de gasto',
  familia_partida: 'Familias de partida',
};

export const TIPOS_CATALOGO = Object.keys(ETIQUETA_CATALOGO) as TipoCatalogo[];
