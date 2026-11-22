import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';
import { aBooleano, recortar } from '../../common/validacion/texto.js';
import { UsuarioResumenDto } from '../presupuestos/presupuestos.dto.js';
import {
  DocumentoCompraDto,
  DocumentoReferenciaDto,
  ListarDocumentosCompraDto,
} from './compras.dto.js';
import { MAX_HITOS_POR_OT } from './compras.tipos.js';

export class HitoDto {
  @ApiProperty({ example: 21 })
  id: number;

  @ApiProperty({ example: 1, description: 'Posición del hito en la OT.' })
  numero: number;

  @ApiProperty({ example: 'Anticipo' })
  descripcion: string;

  @ApiProperty({ example: 30, description: 'Porcentaje del monto de la OT.' })
  porcentaje: number;

  @ApiProperty({ example: 8400000, description: 'Monto neto del hito (CLP).' })
  montoNeto: number;

  @ApiProperty({ type: String, nullable: true, example: '2026-12-01' })
  fechaEstimada: string | null;

  @ApiProperty({
    example: 30,
    description: 'Porcentaje ya ordenado con OC parciales vigentes.',
  })
  porcentajeOrdenado: number;

  @ApiProperty({ example: 8400000 })
  montoOrdenado: number;

  @ApiProperty({
    example: 0,
    description: 'Porcentaje que aún se puede ordenar.',
  })
  porcentajeDisponible: number;

  @ApiProperty({ example: 0 })
  montoDisponible: number;
}

export class OrdenTrabajoDto extends DocumentoCompraDto {
  @ApiProperty({ type: DocumentoReferenciaDto })
  cotizacion: DocumentoReferenciaDto;

  @ApiProperty({
    example: 28000000,
    description: 'Monto contratado (CLP neto).',
  })
  montoNeto: number;

  @ApiProperty({ type: String, nullable: true })
  fechaInicio: string | null;

  @ApiProperty({ type: String, nullable: true })
  fechaTermino: string | null;

  @ApiProperty({ type: [HitoDto] })
  hitos: HitoDto[];

  @ApiProperty({
    example: 8400000,
    description:
      'Monto de las OC parciales vigentes (borrador, en revisión, aprobadas o recibidas).',
  })
  montoOrdenado: number;

  @ApiProperty({ example: 30 })
  porcentajeOrdenado: number;

  @ApiProperty({
    example: 19600000,
    description: 'Saldo de la OT: monto contratado − monto ordenado.',
  })
  saldo: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  anuladoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  anuladoPor: UsuarioResumenDto | null;

  @ApiProperty({ type: String, nullable: true })
  motivoAnulacion: string | null;
}

export class PaginaOrdenesTrabajoDto {
  @ApiProperty({ type: [OrdenTrabajoDto] })
  items: OrdenTrabajoDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarOrdenesTrabajoDto extends ListarDocumentosCompraDto {
  @ApiPropertyOptional({
    description:
      'Solo OT aprobadas con saldo por ordenar (las que admiten OC parciales).',
  })
  @IsOptional()
  @Transform(aBooleano)
  conSaldo?: boolean;
}

export class DatosHitoDto {
  @ApiProperty({ example: 'Anticipo', minLength: 2, maxLength: 200 })
  @Transform(recortar)
  @IsString({ message: 'La descripción del hito debe ser texto.' })
  @MinLength(2, { message: 'Describe el hito.' })
  @MaxLength(200, {
    message: 'La descripción del hito debe tener como máximo 200 caracteres.',
  })
  descripcion: string;

  @ApiProperty({
    example: 30,
    description: 'Porcentaje del monto de la OT (hasta 2 decimales).',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El porcentaje debe ser un número con hasta 2 decimales.' },
  )
  @Min(0.01, { message: 'El porcentaje debe ser mayor que cero.' })
  @Max(100, { message: 'El porcentaje no puede superar 100.' })
  porcentaje: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-12-01' })
  @IsOptional()
  @EsFechaIso()
  fechaEstimada?: string | null;
}

class DatosOrdenTrabajoDto {
  @ApiPropertyOptional({
    maxLength: 1000,
    description:
      'Alcance del trabajo. Por defecto, la descripción de la cotización.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(2, { message: 'Describe el alcance de la OT.' })
  @MaxLength(1000, {
    message: 'La descripción debe tener como máximo 1000 caracteres.',
  })
  descripcion?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @EsFechaIso()
  fechaInicio?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @EsFechaIso()
  fechaTermino?: string | null;

  @ApiPropertyOptional({
    type: [DatosHitoDto],
    description:
      'Hitos en orden. Reemplazan a los actuales. En borrador pueden sumar menos de 100 %; para enviar a revisión deben sumar 100 %.',
  })
  @IsOptional()
  @IsArray({ message: 'Los hitos deben ser una lista.' })
  @ArrayMaxSize(MAX_HITOS_POR_OT, {
    message: `Una OT admite hasta ${MAX_HITOS_POR_OT} hitos.`,
  })
  @ValidateNested({ each: true })
  @Type(() => DatosHitoDto)
  hitos?: DatosHitoDto[];
}

export class CrearOrdenTrabajoDto extends DatosOrdenTrabajoDto {
  @ApiProperty({
    example: 8,
    description:
      'Cotización aprobada (sin otra OT vigente) de la que nace la OT.',
  })
  @IsInt({ message: 'Selecciona una cotización.' })
  @Min(1, { message: 'Selecciona una cotización.' })
  cotizacionId: number;
}

export class ActualizarOrdenTrabajoDto extends DatosOrdenTrabajoDto {
  @ApiProperty({
    example: 3,
    description: 'Versión que el cliente tiene cargada (409 si no coincide).',
  })
  @IsInt({ message: 'La versión debe ser un número entero.' })
  @Min(1, { message: 'La versión debe ser al menos 1.' })
  version: number;
}
