/** Rutas de las fichas de compras (también las usan los enlaces de otras pantallas). */
export const rutaCotizacion = (id: number) => `/ordenes-trabajo/cotizaciones/${id}`;
export const rutaOrdenTrabajo = (id: number) => `/ordenes-trabajo/${id}`;
export const rutaOrdenCompra = (id: number) => `/ordenes-compra/${id}`;

/** Rejilla de datos de las fichas (1, 2 o 3 columnas según el ancho). */
export const rejilla = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
};
