import { ApiProperty } from '@nestjs/swagger';

export enum EstadoSalud {
  Ok = 'ok',
  Error = 'error',
}

export class SaludDto {
  @ApiProperty({
    enum: EstadoSalud,
    enumName: 'EstadoSalud',
    description: 'Estado general del servicio.',
    example: EstadoSalud.Ok,
  })
  estado: EstadoSalud;

  @ApiProperty({
    enum: EstadoSalud,
    enumName: 'EstadoSalud',
    description: 'Estado de la conexión a PostgreSQL.',
    example: EstadoSalud.Ok,
  })
  baseDatos: EstadoSalud;

  @ApiProperty({
    description: 'Versión del backend (package.json).',
    example: '0.1.0',
  })
  version: string;

  @ApiProperty({
    description: 'Fecha y hora del servidor (ISO 8601).',
    format: 'date-time',
    example: '2026-11-18T12:00:00.000Z',
  })
  fecha: string;
}
