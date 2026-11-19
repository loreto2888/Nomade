/** Catálogos editables (deben coincidir con `ck_catalogo_tipo` de la migración). */
export enum TipoCatalogo {
  EstadoObra = 'estado_obra',
  TipoDocumento = 'tipo_documento',
  CategoriaGasto = 'categoria_gasto',
  FamiliaPartida = 'familia_partida',
}

/** Códigos de los estados de obra que usa la lógica de la aplicación (ítems protegidos del catálogo). */
export const CodigoEstadoObra = {
  EnPreparacion: 'en_preparacion',
  Activa: 'activa',
  Suspendida: 'suspendida',
  Terminada: 'terminada',
  Cerrada: 'cerrada',
} as const;
