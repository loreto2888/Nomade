export const RUTA_INGRESAR = '/ingresar';
export const RUTA_CAMBIAR_CLAVE = '/cambiar-clave';
/** Clave del `state` de navegación con la ruta a la que volver tras ingresar. */
export const ESTADO_DESDE = 'desde';

/** Solo rutas internas: evita redirecciones abiertas desde `state`. */
export function rutaDestinoSegura(destino: unknown): string {
  return typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//')
    ? destino
    : '/';
}
