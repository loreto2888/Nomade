import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';

/** Forma común de todas las respuestas de error de la API. */
@ApiSchema({ name: 'ErrorResponse' })
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Código estable del error, en mayúsculas.',
    example: 'VALIDACION',
  })
  codigo: string;

  @ApiProperty({
    description: 'Mensaje legible en español.',
    example: 'Los datos enviados no son válidos.',
  })
  mensaje: string;

  @ApiPropertyOptional({
    description: 'Información adicional (por ejemplo, errores por campo).',
    type: 'array',
    items: {},
  })
  detalles?: unknown[];
}
