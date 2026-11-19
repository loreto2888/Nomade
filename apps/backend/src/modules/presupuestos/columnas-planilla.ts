/**
 * Columnas de la planilla de presupuesto (plantilla genérica PROVISORIA: la plantilla real del
 * cliente no existe aún, H9). La importación acepta las columnas en cualquier orden y reconoce
 * algunos sinónimos del encabezado; la exportación usa estos mismos títulos para poder volver a
 * importar un presupuesto exportado.
 */
export const CLAVES_COLUMNA = [
  'codigo',
  'familia',
  'descripcion',
  'unidad',
  'cantidad',
  'precioUnitario',
] as const;

export type ClaveColumna = (typeof CLAVES_COLUMNA)[number];

export interface DefinicionColumna {
  clave: ClaveColumna;
  titulo: string;
  ancho: number;
  /** Encabezados alternativos, ya normalizados con `normalizarEncabezado`. */
  alias: readonly string[];
  ayuda: string;
}

export const COLUMNAS_PLANILLA: readonly DefinicionColumna[] = [
  {
    clave: 'codigo',
    titulo: 'Código',
    ancho: 14,
    alias: ['codigo', 'cod', 'item', 'nropartida', 'codigopartida'],
    ayuda:
      'Obligatorio. Único en la planilla. 1 a 30 caracteres: letras, dígitos, punto, guion o guion bajo (p. ej. 1.2.3). Formatea la columna como texto para no perder ceros finales.',
  },
  {
    clave: 'familia',
    titulo: 'Familia',
    ancho: 24,
    alias: ['familia', 'familiapartida', 'familiadepartida', 'rubro'],
    ayuda:
      'Obligatorio. Código o nombre de una familia activa del catálogo (ver hoja «Familias»).',
  },
  {
    clave: 'descripcion',
    titulo: 'Descripción',
    ancho: 48,
    alias: ['descripcion', 'detalle', 'glosa', 'nombre', 'nombrepartida'],
    ayuda: 'Obligatorio. 2 a 300 caracteres.',
  },
  {
    clave: 'unidad',
    titulo: 'Unidad',
    ancho: 10,
    alias: ['unidad', 'un', 'und', 'um', 'unidaddemedida'],
    ayuda: 'Obligatorio. Hasta 20 caracteres (m2, m3, ml, kg, gl, un…).',
  },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    ancho: 14,
    alias: ['cantidad', 'cant', 'qty'],
    ayuda: 'Obligatorio. Número mayor que cero, hasta 4 decimales.',
  },
  {
    clave: 'precioUnitario',
    titulo: 'Precio unitario',
    ancho: 18,
    alias: ['preciounitario', 'preciounit', 'pu', 'precio', 'valorunitario'],
    ayuda:
      'Obligatorio. En la moneda de la obra: CLP sin decimales; UF hasta 4 decimales. Cero o mayor.',
  },
];

/** Normaliza un encabezado: minúsculas, sin tildes ni signos («Precio unitario» → «preciounitario»). */
export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Clave de columna que corresponde a un encabezado, o `null` si no se reconoce. */
export function claveDeEncabezado(texto: string): ClaveColumna | null {
  const normalizado = normalizarEncabezado(texto);
  if (!normalizado) return null;
  return (
    COLUMNAS_PLANILLA.find((c) => c.alias.includes(normalizado))?.clave ?? null
  );
}
