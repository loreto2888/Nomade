/** Tipo de movimiento del libro (debe coincidir con `ck_movimiento_tipo`). En la fase 4 solo compromisos. */
export enum TipoMovimiento {
  Compromiso = 'compromiso',
}

/** Documento que origina el movimiento (debe coincidir con `ck_movimiento_origen`). */
export enum OrigenMovimiento {
  OrdenCompra = 'orden_compra',
}
