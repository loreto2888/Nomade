/** Entidades a las que se puede adjuntar archivos (deben coincidir con `ck_adjunto_entidad`). */
export enum EntidadAdjuntable {
  Obra = 'obra',
  Proveedor = 'proveedor',
  Cliente = 'cliente',
  Cotizacion = 'cotizacion',
  OrdenTrabajo = 'orden_trabajo',
  OrdenCompra = 'orden_compra',
}

/** Tabla de cada entidad adjuntable (lista cerrada: nunca se interpola texto del usuario). */
export const TABLA_DE_ENTIDAD: Record<EntidadAdjuntable, string> = {
  [EntidadAdjuntable.Obra]: 'nomade.obra',
  [EntidadAdjuntable.Proveedor]: 'nomade.proveedor',
  [EntidadAdjuntable.Cliente]: 'nomade.cliente',
  [EntidadAdjuntable.Cotizacion]: 'nomade.cotizacion',
  [EntidadAdjuntable.OrdenTrabajo]: 'nomade.orden_trabajo',
  [EntidadAdjuntable.OrdenCompra]: 'nomade.orden_compra',
};
