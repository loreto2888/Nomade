/** Pestañas de la ficha de obra (plan §10.3). Solo «Resumen» está implementada en la fase 2. */
export interface PestanaObra {
  id: string;
  etiqueta: string;
  /** Qué incluirá y en qué fase del plan (§11) se habilita. Vacío = ya disponible. */
  pendiente?: string;
}

export const PESTANAS_OBRA: PestanaObra[] = [
  { id: 'resumen', etiqueta: 'Resumen' },
  {
    id: 'presupuesto',
    etiqueta: 'Presupuesto',
    pendiente: 'Versiones y partidas del presupuesto aprobado (fase 3).',
  },
  {
    id: 'eepp',
    etiqueta: 'Estados de pago',
    pendiente: 'Estados de pago, facturas de venta y cobranza (fase 7).',
  },
  {
    id: 'compras',
    etiqueta: 'Compras',
    pendiente: 'Órdenes de trabajo y de compra de la obra (fase 4).',
  },
  {
    id: 'gastos',
    etiqueta: 'Gastos',
    pendiente: 'Rendiciones y gastos imputados a la obra (fase 8).',
  },
  {
    id: 'mano-obra',
    etiqueta: 'Mano de obra',
    pendiente: 'Costos quincenales distribuidos en la obra (fase 8).',
  },
  {
    id: 'documentos',
    etiqueta: 'Documentos',
    pendiente: 'Facturas y documentos de egreso asociados (fase 5).',
  },
  {
    id: 'resultado',
    etiqueta: 'Resultado',
    pendiente: 'Ingresos, costos y margen de la obra (fase 9).',
  },
  {
    id: 'cierre',
    etiqueta: 'Cierre',
    pendiente: 'Lista de control y cierre financiero de la obra (fase 10).',
  },
  {
    id: 'actividad',
    etiqueta: 'Actividad',
    pendiente: 'Tareas y actividad de los equipos por obra (fase posterior).',
  },
];

export const PESTANA_POR_DEFECTO = 'resumen';

/** Pestaña pedida por la URL (`?pestana=`), o «resumen» si no existe. */
export function pestanaValida(valor: string | null): string {
  return PESTANAS_OBRA.some((p) => p.id === valor) ? (valor as string) : PESTANA_POR_DEFECTO;
}
