import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from './error-aplicacion.js';

@ApiSchema({ name: 'DetalleConflicto' })
export class DetalleConflictoDto {
  @ApiProperty({
    description: 'Versión vigente del registro en el servidor.',
    example: 4,
  })
  versionActual: number;
}

/** Respuesta 409 por control optimista (otra persona modificó el registro). */
@ApiSchema({ name: 'ConflictResponse' })
export class ConflictResponseDto {
  @ApiProperty({ example: 'CONFLICTO_VERSION' })
  codigo: string;

  @ApiProperty({
    example:
      'El registro fue modificado por otra persona. Recarga y reintenta.',
  })
  mensaje: string;

  @ApiProperty({ type: [DetalleConflictoDto] })
  detalles: DetalleConflictoDto[];
}

export function conflictoVersion(versionActual: number): ErrorAplicacion {
  return new ErrorAplicacion(
    HttpStatus.CONFLICT,
    'CONFLICTO_VERSION',
    'El registro fue modificado por otra persona. Recarga y reintenta.',
    [{ versionActual }],
  );
}
