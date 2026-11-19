import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar, recortarONulo } from '../../common/validacion/texto.js';
import { EntidadAdjuntable } from './adjuntos.tipos.js';

export class AdjuntoDto {
  @ApiProperty({ example: 9 })
  id: number;

  @ApiProperty({ enum: EntidadAdjuntable, enumName: 'EntidadAdjuntable' })
  entidadTipo: EntidadAdjuntable;

  @ApiProperty({ example: 1 })
  entidadId: number;

  @ApiProperty({ example: 'Contrato firmado.pdf' })
  nombreOriginal: string;

  @ApiProperty({ example: 'application/pdf' })
  tipoMime: string;

  @ApiProperty({ example: 'pdf' })
  extension: string;

  @ApiProperty({ example: 482133, description: 'Tamaño en bytes.' })
  tamanioBytes: number;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Usuario que subió el archivo.',
  })
  creadoPor: number | null;
}

export class ListarAdjuntosDto {
  @ApiProperty({ enum: EntidadAdjuntable, enumName: 'EntidadAdjuntable' })
  @IsEnum(EntidadAdjuntable, {
    message: 'La entidad debe ser "obra", "proveedor" o "cliente".',
  })
  entidadTipo: EntidadAdjuntable;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({
    message: 'El identificador de la entidad debe ser un número entero.',
  })
  @Min(1, { message: 'El identificador de la entidad no es válido.' })
  entidadId: number;
}

/**
 * Campos de texto del formulario multipart. El archivo viaja en `archivo` y se declara en el
 * `@ApiBody` del endpoint: no es una propiedad del DTO porque `whitelist` la rechazaría.
 */
export class SubirAdjuntoDto extends ListarAdjuntosDto {
  @ApiPropertyOptional({ type: String, maxLength: 300 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(300, {
    message: 'La descripción debe tener como máximo 300 caracteres.',
  })
  descripcion?: string | null;
}

export class EliminarAdjuntoDto {
  @ApiPropertyOptional({
    description: 'Motivo, queda en la bitácora.',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser texto.' })
  @MaxLength(500, {
    message: 'El motivo debe tener como máximo 500 caracteres.',
  })
  motivo?: string;
}
