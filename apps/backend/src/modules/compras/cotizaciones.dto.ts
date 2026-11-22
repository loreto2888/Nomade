import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VersionDto } from '../../common/maestros/contraparte.dto.js';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';
import { recortar, recortarONulo } from '../../common/validacion/texto.js';
import {
  DocumentoCompraDto,
  DocumentoReferenciaDto,
  ListarDocumentosCompraDto,
} from './compras.dto.js';

/** Tope de un monto neto en CLP (cabe holgadamente en numeric(18,0)). */
export const MONTO_MAXIMO = 1_000_000_000_000_000;

export class CotizacionDto extends DocumentoCompraDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'COT-4512',
    description: 'Número o referencia que usa el proveedor.',
  })
  referenciaProveedor: string | null;

  @ApiProperty({ example: '2026-11-18' })
  fecha: string;

  @ApiProperty({ type: String, nullable: true, example: '2026-12-18' })
  validezHasta: string | null;

  @ApiProperty({ example: 28000000, description: 'Monto neto en CLP.' })
  montoNeto: number;

  @ApiProperty({
    type: DocumentoReferenciaDto,
    nullable: true,
    description:
      'OT vigente creada desde esta cotización (no rechazada ni anulada).',
  })
  ordenTrabajo: DocumentoReferenciaDto | null;
}

export class PaginaCotizacionesDto {
  @ApiProperty({ type: [CotizacionDto] })
  items: CotizacionDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarCotizacionesDto extends ListarDocumentosCompraDto {
  @ApiPropertyOptional({
    description:
      'Solo cotizaciones aprobadas sin OT vigente (las que pueden originar una OT).',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  disponiblesParaOt?: boolean;
}

export class DatosCotizacionDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'Selecciona una obra.' })
  @Min(1, { message: 'Selecciona una obra.' })
  obraId: number;

  @ApiProperty({ example: 4 })
  @IsInt({ message: 'Selecciona un proveedor.' })
  @Min(1, { message: 'Selecciona un proveedor.' })
  proveedorId: number;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 60 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La referencia debe ser texto.' })
  @MaxLength(60, {
    message: 'La referencia debe tener como máximo 60 caracteres.',
  })
  referenciaProveedor?: string | null;

  @ApiProperty({ example: '2026-11-18' })
  @EsFechaIso()
  fecha: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-12-18' })
  @IsOptional()
  @EsFechaIso()
  validezHasta?: string | null;

  @ApiProperty({
    example: 'Instalación eléctrica del local',
    minLength: 2,
    maxLength: 1000,
  })
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(2, { message: 'Describe el alcance de la cotización.' })
  @MaxLength(1000, {
    message: 'La descripción debe tener como máximo 1000 caracteres.',
  })
  descripcion: string;

  @ApiPropertyOptional({
    description:
      'Categoría de gasto (catálogo `categoria_gasto`). Por defecto, «Subcontratos».',
  })
  @IsOptional()
  @IsInt({ message: 'La categoría debe ser un identificador numérico.' })
  @Min(1, { message: 'La categoría no es válida.' })
  categoriaGastoId?: number;

  @ApiProperty({
    example: 28000000,
    description: 'Monto neto en CLP (entero).',
  })
  @Type(() => Number)
  @IsInt({ message: 'El monto debe ser un número entero de pesos.' })
  @Min(1, { message: 'El monto debe ser mayor que cero.' })
  @Max(MONTO_MAXIMO, { message: 'El monto es demasiado alto.' })
  montoNeto: number;
}

export class CrearCotizacionDto extends DatosCotizacionDto {}

export class ActualizarCotizacionDto extends IntersectionType(
  PartialType(DatosCotizacionDto),
  VersionDto,
) {}
