import { HttpException, HttpStatus } from '@nestjs/common';

export interface CuerpoError {
  codigo: string;
  mensaje: string;
  detalles?: unknown[];
}

/**
 * Excepción con código y mensaje en español. El filtro global la responde
 * tal cual con el formato `ErrorResponse`.
 */
export class ErrorAplicacion extends HttpException {
  constructor(
    estado: HttpStatus,
    codigo: string,
    mensaje: string,
    detalles?: unknown[],
  ) {
    const cuerpo: CuerpoError = { codigo, mensaje };
    if (detalles !== undefined) cuerpo.detalles = detalles;
    super(cuerpo, estado);
  }
}
