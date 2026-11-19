/** Tipo de carga masiva (debe coincidir con `ck_importacion_lote_tipo`). */
export enum TipoImportacion {
  Presupuesto = 'presupuesto',
}

/** Estado de un lote (debe coincidir con `ck_importacion_lote_estado`). */
export enum EstadoImportacion {
  Previsualizado = 'previsualizado',
  Confirmado = 'confirmado',
  Descartado = 'descartado',
}
