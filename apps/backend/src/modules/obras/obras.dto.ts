import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  EliminarDto,
  VersionDto,
} from '../../common/maestros/contraparte.dto.js';
import { ConsultaOrdenablePaginadaDto } from '../../common/paginacion/orden.js';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';
import { recortar, recortarONulo } from '../../common/validacion/texto.js';
import { ValorUfDto } from '../uf/uf.dto.js';
import {
  CAMPOS_ORDEN_OBRAS,
  MonedaContrato,
  type CampoOrdenObras,
} from './obras.tipos.js';

export class ClienteResumenDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: '76123456-0' })
  rut: string;

  @ApiProperty({ example: 'Grupo Andino SpA' })
  razonSocial: string;
}

export class EstadoObraDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'activa', description: 'Código estable del estado.' })
  codigo: string;

  @ApiProperty({ example: 'Activa' })
  nombre: string;
}

export class ObraDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: 'CC-001',
    description: 'Centro de costo (único entre las obras vigentes).',
  })
  codigoCentroCosto: string;

  @ApiProperty({ example: 'Local Parque Norte' })
  nombre: string;

  @ApiProperty({ type: ClienteResumenDto })
  cliente: ClienteResumenDto;

  @ApiProperty({ type: EstadoObraDto })
  estado: EstadoObraDto;

  @ApiProperty({ type: String, nullable: true, example: 'Camila Rojas' })
  responsable: string | null;

  @ApiProperty({ type: String, nullable: true })
  direccion: string | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-03-01' })
  fechaInicio: string | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-12-15' })
  fechaTermino: string | null;

  @ApiProperty({ enum: MonedaContrato, enumName: 'MonedaContrato' })
  monedaContrato: MonedaContrato;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 185000000,
    description:
      'Monto del contrato en su moneda original (CLP enteros; UF hasta 4 decimales).',
  })
  montoContrato: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Equivalente en CLP. En contratos en UF es una fotografía con el valor de la UF de `fechaValorUf`.',
  })
  montoContratoClp: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Fecha del valor de la UF usado en la conversión.',
  })
  fechaValorUf: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Valor de la UF usado en la conversión.',
  })
  valorUf: number | null;

  @ApiProperty({ type: String, nullable: true })
  observaciones: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn: string;

  @ApiProperty({ example: 1, description: 'Versión para control optimista.' })
  version: number;
}

export class PaginaObrasDto {
  @ApiProperty({ type: [ObraDto] })
  items: ObraDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

/** Ficha 360° (pestaña Resumen): la obra más datos derivados. */
export class ResumenObraDto {
  @ApiProperty({ type: ObraDto })
  obra: ObraDto;

  @ApiProperty({ example: 2, description: 'Adjuntos vigentes de la obra.' })
  cantidadAdjuntos: number;

  @ApiProperty({
    type: ValorUfDto,
    nullable: true,
    description:
      'Valor de la UF aplicable hoy; `null` si no hay valores cargados.',
  })
  valorUfHoy: ValorUfDto | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Monto del contrato en CLP al valor de la UF de hoy (solo contratos en UF).',
  })
  montoContratoClpHoy: number | null;
}

export class ListarObrasDto extends ConsultaOrdenablePaginadaDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por nombre, centro de costo, responsable o cliente.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Filtra por estado de obra (id del catálogo).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El estado debe ser un identificador numérico.' })
  estadoId?: number;

  @ApiPropertyOptional({ description: 'Filtra por cliente.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El cliente debe ser un identificador numérico.' })
  clienteId?: number;

  @ApiPropertyOptional({
    enum: CAMPOS_ORDEN_OBRAS,
    default: 'codigoCentroCosto',
  })
  @IsOptional()
  @IsIn(CAMPOS_ORDEN_OBRAS, {
    message: `Solo se puede ordenar por: ${CAMPOS_ORDEN_OBRAS.join(', ')}.`,
  })
  ordenarPor?: CampoOrdenObras;
}

const mayusculas = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class DatosObraDto {
  @ApiProperty({
    example: 'CC-001',
    description:
      'Centro de costo único: letras mayúsculas, dígitos, punto, guion o guion bajo (2 a 20 caracteres).',
  })
  @Transform(mayusculas)
  @Matches(/^[A-Z0-9][A-Z0-9._-]{1,19}$/, {
    message:
      'El centro de costo debe tener 2 a 20 caracteres: letras, dígitos, punto, guion o guion bajo.',
  })
  codigoCentroCosto: string;

  @ApiProperty({ example: 'Local Parque Norte', minLength: 2, maxLength: 150 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(150, {
    message: 'El nombre debe tener como máximo 150 caracteres.',
  })
  nombre: string;

  @ApiProperty({ example: 5, description: 'Cliente vigente (mandante).' })
  @IsInt({ message: 'Selecciona un cliente.' })
  @Min(1, { message: 'Selecciona un cliente.' })
  clienteId: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Estado de obra (catálogo `estado_obra`). Por defecto, "en preparación".',
  })
  @IsOptional()
  @IsInt({ message: 'Selecciona un estado.' })
  @Min(1, { message: 'Selecciona un estado.' })
  estadoId?: number;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'El responsable debe ser texto.' })
  @MaxLength(100, {
    message: 'El responsable debe tener como máximo 100 caracteres.',
  })
  responsable?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La dirección debe ser texto.' })
  @MaxLength(200, {
    message: 'La dirección debe tener como máximo 200 caracteres.',
  })
  direccion?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-03-01' })
  @IsOptional()
  @Transform(recortarONulo)
  @EsFechaIso('Ingresa una fecha de inicio válida.')
  fechaInicio?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-12-15' })
  @IsOptional()
  @Transform(recortarONulo)
  @EsFechaIso('Ingresa una fecha de término válida.')
  fechaTermino?: string | null;

  @ApiPropertyOptional({
    enum: MonedaContrato,
    enumName: 'MonedaContrato',
    default: MonedaContrato.Clp,
    description: 'Moneda en la que está pactado el contrato.',
  })
  @IsOptional()
  @IsEnum(MonedaContrato, { message: 'La moneda debe ser "CLP" o "UF".' })
  monedaContrato?: MonedaContrato;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 185000000,
    description:
      'Monto del contrato en `monedaContrato`. CLP: enteros; UF: hasta 4 decimales.',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El monto debe ser un número con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El monto no puede ser negativo.' })
  @Max(1_000_000_000_000, { message: 'El monto es demasiado alto.' })
  montoContrato?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Solo contratos en UF: fecha cuyo valor de UF se usa para el equivalente en CLP (por defecto, hoy).',
  })
  @IsOptional()
  @Transform(recortarONulo)
  @EsFechaIso('Ingresa una fecha válida para la conversión de la UF.')
  fechaConversionUf?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'Las observaciones deben ser texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones deben tener como máximo 1000 caracteres.',
  })
  observaciones?: string | null;
}

export class CrearObraDto extends DatosObraDto {}

export class ActualizarObraDto extends IntersectionType(
  PartialType(DatosObraDto),
  VersionDto,
) {}

export class EliminarObraDto extends EliminarDto {}
