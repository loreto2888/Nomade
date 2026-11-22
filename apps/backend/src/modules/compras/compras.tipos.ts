/**
 * Estados de los documentos de compra (deben coincidir con los `CHECK` de la migración `compras`).
 * Las cotizaciones usan borrador → en revisión → aprobada | rechazada; la OT agrega «anulada» y la
 * OC agrega «recibida» y «anulada».
 */
export enum EstadoDocumentoCompra {
  Borrador = 'borrador',
  EnRevision = 'en_revision',
  Aprobada = 'aprobada',
  Rechazada = 'rechazada',
  Recibida = 'recibida',
  Anulada = 'anulada',
}

/** Documentos de compra (también el `tipo` de su folio y su entidad adjuntable). */
export enum TipoDocumentoCompra {
  Cotizacion = 'cotizacion',
  OrdenTrabajo = 'orden_trabajo',
  OrdenCompra = 'orden_compra',
}

/** Tipo de OC: materiales (con líneas) o pago parcial de una OT (hito + porcentaje). */
export enum TipoOrdenCompra {
  Materiales = 'materiales',
  ParcialOt = 'parcial_ot',
}

/** Prefijo visible del folio de cada documento (`OC-000012`). */
export const PREFIJO_FOLIO: Record<TipoDocumentoCompra, string> = {
  [TipoDocumentoCompra.Cotizacion]: 'COT',
  [TipoDocumentoCompra.OrdenTrabajo]: 'OT',
  [TipoDocumentoCompra.OrdenCompra]: 'OC',
};

/** Folio visible: prefijo y número con 6 dígitos (`OT-000045`). */
export const folio = (tipo: TipoDocumentoCompra, numero: number): string =>
  `${PREFIJO_FOLIO[tipo]}-${String(numero).padStart(6, '0')}`;

/** Categorías de gasto por defecto (ítems protegidos del catálogo `categoria_gasto`). */
export const CodigoCategoriaGasto = {
  Materiales: 'materiales',
  Subcontratos: 'subcontratos',
} as const;

/** Estados en que una OC parcial ocupa saldo de su OT (las rechazadas y anuladas lo liberan). */
export const ESTADOS_OC_VIGENTES: readonly EstadoDocumentoCompra[] = [
  EstadoDocumentoCompra.Borrador,
  EstadoDocumentoCompra.EnRevision,
  EstadoDocumentoCompra.Aprobada,
  EstadoDocumentoCompra.Recibida,
];

/** Topes de tamaño de los documentos. */
export const MAX_HITOS_POR_OT = 50;
export const MAX_LINEAS_POR_OC = 200;
