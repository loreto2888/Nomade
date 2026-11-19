import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  EliminarDto,
  VersionDto,
} from '../../common/maestros/contraparte.dto.js';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';
import { recortar } from '../../common/validacion/texto.js';
import { TipoValorParametro } from './parametros.tipos.js';

export class ValorParametroDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({
    example: '19',
    description: 'Valor en texto (los numéricos sin ceros sobrantes).',
  })
  valor: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 19,
    description: 'Valor numérico; `null` en parámetros de texto.',
  })
  valorNumerico: number | null;

  @ApiProperty({
    example: '2026-12-01',
    description: 'Primer día de vigencia (AAAA-MM-DD).',
  })
  vigenteDesde: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2027-02-28',
    description:
      'Último día de vigencia; `null` si es la versión más reciente.',
  })
  vigenteHasta: string | null;

  @ApiProperty({ type: String, nullable: true })
  motivo: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ type: Number, nullable: true })
  creadoPor: number | null;
}

export class ParametroDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'iva' })
  codigo: string;

  @ApiProperty({ example: 'IVA' })
  nombre: string;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({ example: 'Impuestos' })
  categoria: string;

  @ApiProperty({ enum: TipoValorParametro, enumName: 'TipoValorParametro' })
  tipoValor: TipoValorParametro;

  @ApiProperty({ type: String, nullable: true, example: '%' })
  unidad: string | null;

  @ApiProperty({
    type: ValorParametroDto,
    nullable: true,
    description: 'Versión que rige hoy (hora de Chile).',
  })
  valorVigente: ValorParametroDto | null;

  @ApiProperty({
    type: ValorParametroDto,
    nullable: true,
    description:
      'Versión programada para entrar en vigencia más adelante, si existe.',
  })
  proximoValor: ValorParametroDto | null;

  @ApiProperty({
    example: 2,
    description:
      'Versión para control optimista: sube con cada valor agregado o eliminado.',
  })
  version: number;
}

export class AgregarValorParametroDto extends VersionDto {
  @ApiProperty({
    example: '19',
    description: 'Valor según el tipo del parámetro (número, entero o texto).',
  })
  @Transform(recortar)
  @IsString({ message: 'El valor es obligatorio.' })
  @MaxLength(200, { message: 'El valor es demasiado largo.' })
  valor: string;

  @ApiProperty({
    example: '2026-12-01',
    description: 'Primer día de vigencia (hoy o posterior).',
  })
  @EsFechaIso()
  vigenteDesde: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Motivo del cambio (queda en la bitácora).',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser texto.' })
  @MaxLength(500, {
    message: 'El motivo debe tener como máximo 500 caracteres.',
  })
  motivo?: string;
}

export class EliminarValorParametroDto extends EliminarDto {}
