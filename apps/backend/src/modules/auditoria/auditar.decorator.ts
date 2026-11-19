import { SetMetadata } from '@nestjs/common';

export const CLAVE_AUDITAR = 'nomade:auditar';

export interface OpcionesAuditar {
  /** Código de la acción, `entidad.verbo`: `usuario.crear`. */
  accion: string;
  entidad: string;
  /**
   * Si el servicio no informó `despues` en el contexto, usa el cuerpo de la
   * respuesta (sin campos sensibles). Por defecto `true`.
   */
  incluirRespuesta?: boolean;
}

/** Registra en la bitácora cada ejecución exitosa del endpoint. */
export const Auditar = (opciones: OpcionesAuditar) =>
  SetMetadata(CLAVE_AUDITAR, opciones);
