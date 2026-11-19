import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';

const { Borrador, EnRevision, Aprobado, Rechazado } = EstadoPresupuesto;

/**
 * Máquina de estados de una versión: borrador → en revisión → aprobado | rechazado.
 * Aprobado y rechazado son finales: un cambio requiere una versión nueva.
 */
export const TRANSICIONES: Record<EstadoPresupuesto, EstadoPresupuesto[]> = {
  [Borrador]: [EnRevision],
  [EnRevision]: [Aprobado, Rechazado],
  [Aprobado]: [],
  [Rechazado]: [],
};

export const ETIQUETA_ESTADO: Record<EstadoPresupuesto, string> = {
  [Borrador]: 'borrador',
  [EnRevision]: 'en revisión',
  [Aprobado]: 'aprobada',
  [Rechazado]: 'rechazada',
};

export function puedeTransicionar(
  desde: EstadoPresupuesto,
  hasta: EstadoPresupuesto,
): boolean {
  return TRANSICIONES[desde].includes(hasta);
}

/** Lanza `422 TRANSICION_NO_VALIDA` si el cambio de estado no está permitido. */
export function exigirTransicion(
  desde: EstadoPresupuesto,
  hasta: EstadoPresupuesto,
): void {
  if (puedeTransicionar(desde, hasta)) return;
  throw new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'TRANSICION_NO_VALIDA',
    desde === hasta
      ? `La versión ya está ${ETIQUETA_ESTADO[desde]}.`
      : `La versión está ${ETIQUETA_ESTADO[desde]}: no se puede pasar a ${ETIQUETA_ESTADO[hasta]}.`,
  );
}

/** Solo un borrador admite cambios en la versión o en sus partidas. */
export const esEditable = (estado: EstadoPresupuesto): boolean =>
  estado === Borrador;

/** Lanza `422 VERSION_NO_EDITABLE` si la versión no es un borrador. */
export function exigirEditable(estado: EstadoPresupuesto): void {
  if (esEditable(estado)) return;
  throw new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'VERSION_NO_EDITABLE',
    estado === Aprobado
      ? 'Una versión aprobada es inmutable. Para cambiar el presupuesto, crea una nueva versión.'
      : `Solo se puede modificar una versión en borrador (esta está ${ETIQUETA_ESTADO[estado]}).`,
  );
}
