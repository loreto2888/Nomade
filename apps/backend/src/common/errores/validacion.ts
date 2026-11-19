import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorAplicacion } from './error-aplicacion.js';

export interface ErrorCampo {
  campo: string;
  errores: string[];
}

function aplanar(errores: ValidationError[], prefijo = ''): ErrorCampo[] {
  return errores.flatMap((error) => {
    const campo = prefijo ? `${prefijo}.${error.property}` : error.property;
    const propios = error.constraints
      ? [{ campo, errores: Object.values(error.constraints) }]
      : [];
    return [...propios, ...aplanar(error.children ?? [], campo)];
  });
}

/** ValidationPipe global: rechaza propiedades no declaradas y transforma tipos. */
export function crearValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errores) =>
      new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'VALIDACION',
        'Los datos enviados no son válidos.',
        aplanar(errores),
      ),
  });
}
