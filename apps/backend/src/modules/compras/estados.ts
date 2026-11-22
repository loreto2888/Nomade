import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { EstadoDocumentoCompra, TipoDocumentoCompra } from './compras.tipos.js';

const { Borrador, EnRevision, Aprobada, Rechazada, Recibida, Anulada } =
  EstadoDocumentoCompra;

type Transiciones = Partial<
  Record<EstadoDocumentoCompra, readonly EstadoDocumentoCompra[]>
>;

/**
 * Máquinas de estado (la base de datos aplica la misma regla en `fn_documento_compra_transicion`).
 * Supuesto H5: lo aprobado no vuelve a borrador ni se edita; la OC se anula con reversa y la OT
 * solo se anula si no tiene OC vigentes.
 */
export const TRANSICIONES: Record<TipoDocumentoCompra, Transiciones> = {
  [TipoDocumentoCompra.Cotizacion]: {
    [Borrador]: [EnRevision],
    [EnRevision]: [Aprobada, Rechazada],
  },
  [TipoDocumentoCompra.OrdenTrabajo]: {
    [Borrador]: [EnRevision],
    [EnRevision]: [Aprobada, Rechazada],
    [Aprobada]: [Anulada],
  },
  [TipoDocumentoCompra.OrdenCompra]: {
    [Borrador]: [EnRevision],
    [EnRevision]: [Aprobada, Rechazada],
    [Aprobada]: [Recibida, Anulada],
  },
};

/** Estado en texto, en femenino («la cotización / la OT / la OC está aprobada»). */
export const ETIQUETA_ESTADO: Record<EstadoDocumentoCompra, string> = {
  [Borrador]: 'en borrador',
  [EnRevision]: 'en revisión',
  [Aprobada]: 'aprobada',
  [Rechazada]: 'rechazada',
  [Recibida]: 'recibida',
  [Anulada]: 'anulada',
};

export const NOMBRE_DOCUMENTO: Record<TipoDocumentoCompra, string> = {
  [TipoDocumentoCompra.Cotizacion]: 'La cotización',
  [TipoDocumentoCompra.OrdenTrabajo]: 'La OT',
  [TipoDocumentoCompra.OrdenCompra]: 'La OC',
};

export function puedeTransicionar(
  tipo: TipoDocumentoCompra,
  desde: EstadoDocumentoCompra,
  hasta: EstadoDocumentoCompra,
): boolean {
  return TRANSICIONES[tipo][desde]?.includes(hasta) ?? false;
}

/** Lanza `422 TRANSICION_NO_VALIDA` si el cambio de estado no está permitido. */
export function exigirTransicion(
  tipo: TipoDocumentoCompra,
  desde: EstadoDocumentoCompra,
  hasta: EstadoDocumentoCompra,
): void {
  if (puedeTransicionar(tipo, desde, hasta)) return;
  const documento = NOMBRE_DOCUMENTO[tipo];
  throw new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'TRANSICION_NO_VALIDA',
    desde === hasta
      ? `${documento} ya está ${ETIQUETA_ESTADO[desde]}.`
      : `${documento} está ${ETIQUETA_ESTADO[desde]}: no puede quedar ${ETIQUETA_ESTADO[hasta]}.`,
  );
}

/** Lanza `422 DOCUMENTO_NO_EDITABLE` si el documento no es un borrador. */
export function exigirBorrador(
  tipo: TipoDocumentoCompra,
  estado: EstadoDocumentoCompra,
): void {
  if (estado === Borrador) return;
  const documento = NOMBRE_DOCUMENTO[tipo];
  throw new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'DOCUMENTO_NO_EDITABLE',
    estado === Aprobada || estado === Recibida
      ? `${documento} está ${ETIQUETA_ESTADO[estado]}: ya no se puede modificar.`
      : `Solo se puede modificar un borrador (${documento.toLowerCase()} está ${ETIQUETA_ESTADO[estado]}).`,
  );
}
