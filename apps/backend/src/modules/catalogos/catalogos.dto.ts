import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VersionDto } from '../../common/maestros/contraparte.dto.js';
import {
  aBooleano,
  recortar,
  recortarONulo,
} from '../../common/validacion/texto.js';
import { TipoCatalogo } from './catalogos.tipos.js';

export class CatalogoItemDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ enum: TipoCatalogo, enumName: 'TipoCatalogo' })
  tipo: TipoCatalogo;

  @ApiProperty({
    example: 'en_preparacion',
    description: 'Identificador estable; no se puede editar.',
  })
  codigo: string;

  @ApiProperty({ example: 'En preparación' })
  nombre: string;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({
    example: 10,
    description: 'Posición en las listas (ascendente).',
  })
  orden: number;

  @ApiProperty({
    description: 'Los ítems inactivos no se ofrecen para nuevos registros.',
  })
  activo: boolean;

  @ApiProperty({
    description:
      'Ítem que usa la lógica de la aplicación: no se puede desactivar.',
  })
  protegido: boolean;

  @ApiProperty({ example: 1 })
  version: number;
}

export class ListarCatalogoDto {
  @ApiPropertyOptional({
    description:
      'Incluye también los ítems inactivos (por defecto solo los activos).',
    default: false,
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'El filtro "incluirInactivos" debe ser true o false.' })
  incluirInactivos?: boolean;
}

export class CrearCatalogoItemDto {
  @ApiProperty({
    example: 'subcontrato_electrico',
    description:
      'Minúsculas, dígitos y guion bajo; empieza con letra (2 a 40 caracteres).',
  })
  @Transform(recortar)
  @Matches(/^[a-z][a-z0-9_]{1,39}$/, {
    message:
      'El código debe empezar con una letra minúscula y usar solo minúsculas, dígitos y guion bajo (2 a 40 caracteres).',
  })
  codigo: string;

  @ApiProperty({
    example: 'Subcontrato eléctrico',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, {
    message: 'El nombre debe tener como máximo 100 caracteres.',
  })
  nombre: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(300, {
    message: 'La descripción debe tener como máximo 300 caracteres.',
  })
  descripcion?: string | null;

  @ApiPropertyOptional({ example: 100, minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  @Max(9999, { message: 'El orden no puede superar 9999.' })
  orden?: number;
}

export class ActualizarCatalogoItemDto extends VersionDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, {
    message: 'El nombre debe tener como máximo 100 caracteres.',
  })
  nombre?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(300, {
    message: 'La descripción debe tener como máximo 300 caracteres.',
  })
  descripcion?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  @Max(9999, { message: 'El orden no puede superar 9999.' })
  orden?: number;

  @ApiPropertyOptional({
    description:
      'Activa o desactiva el ítem (los protegidos no se desactivan).',
  })
  @IsOptional()
  @IsBoolean({ message: 'El indicador "activo" debe ser verdadero o falso.' })
  activo?: boolean;
}
