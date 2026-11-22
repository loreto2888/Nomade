import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
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
import { VersionDto } from '../../common/maestros/contraparte.dto.js';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';
import { recortar, recortarONulo } from '../../common/validacion/texto.js';
import { MovimientoDto } from '../movimientos/movimientos.dto.js';
import { UsuarioResumenDto } from '../presupuestos/presupuestos.dto.js';
import {
  DocumentoCompraDto,
  DocumentoReferenciaDto,
  ListarDocumentosCompraDto,
} from './compras.dto.js';
import { MAX_LINEAS_POR_OC, TipoOrdenCompra } from './compras.tipos.js';

const TOPE = 1_000_000_000_000;

export class LineaOrdenCompraDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 1 })
  numero: number;

  @ApiProperty({ example: 'Cemento especial 25 kg' })
  descripcion: string;

  @ApiProperty({ example: 'saco' })
  unidad: string;

  @ApiProperty({ example: 120 })
  cantidad: number;

  @ApiProperty({ example: 6500, description: 'CLP (hasta 4 decimales).' })
  precioUnitario: number;

  @ApiProperty({ example: 780000, description: 'Cantidad × precio, en pesos.' })
  total: number;
}

export class HitoReferenciaDto {
  @ApiProperty({ example: 21 })
  id: number;

  @ApiProperty({ example: 1 })
  numero: number;

  @ApiProperty({ example: 'Anticipo' })
  descripcion: string;

  @ApiProperty({ example: 30 })
  porcentaje: number;
}

export class OrdenCompraDto extends DocumentoCompraDto {
  @ApiProperty({ enum: TipoOrdenCompra, enumName: 'TipoOrdenCompra' })
  tipo: TipoOrdenCompra;

  @ApiProperty({ type: DocumentoReferenciaDto, nullable: true })
  ordenTrabajo: DocumentoReferenciaDto | null;

  @ApiProperty({ type: HitoReferenciaDto, nullable: true })
  hito: HitoReferenciaDto | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 20,
    description: 'OC parcial: porcentaje del monto de la OT.',
  })
  porcentaje: number | null;

  @ApiProperty({ example: '2026-11-20' })
  fecha: string;

  @ApiProperty({ type: String, nullable: true })
  fechaEntrega: string | null;

  @ApiProperty({ example: true })
  afectaIva: boolean;

  @ApiProperty({
    example: 19,
    description: 'Tasa de IVA vigente a la fecha de la OC.',
  })
  tasaIva: number;

  @ApiProperty({ example: 780000 })
  montoNeto: number;

  @ApiProperty({ example: 148200 })
  montoIva: number;

  @ApiProperty({ example: 928200 })
  montoTotal: number;

  @ApiProperty({ type: [LineaOrdenCompraDto] })
  lineas: LineaOrdenCompraDto[];

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  recibidoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  recibidoPor: UsuarioResumenDto | null;

  @ApiProperty({ type: String, nullable: true })
  fechaRecepcion: string | null;

  @ApiProperty({ type: String, nullable: true })
  observacionRecepcion: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  anuladoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  anuladoPor: UsuarioResumenDto | null;

  @ApiProperty({ type: String, nullable: true })
  motivoAnulacion: string | null;
}

export class OrdenCompraDetalleDto {
  @ApiProperty({ type: OrdenCompraDto })
  ordenCompra: OrdenCompraDto;

  @ApiProperty({
    type: [MovimientoDto],
    description:
      'Movimientos del libro generados por la OC (compromiso y su reversa).',
  })
  movimientos: MovimientoDto[];
}

export class PaginaOrdenesCompraDto {
  @ApiProperty({ type: [OrdenCompraDto] })
  items: OrdenCompraDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarOrdenesCompraDto extends ListarDocumentosCompraDto {
  @ApiPropertyOptional({ enum: TipoOrdenCompra, enumName: 'TipoOrdenCompra' })
  @IsOptional()
  @IsEnum(TipoOrdenCompra, { message: 'El tipo de OC no es válido.' })
  tipo?: TipoOrdenCompra;

  @ApiPropertyOptional({ description: 'Solo las OC parciales de esta OT.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La OT debe ser un identificador numérico.' })
  @Min(1, { message: 'La OT no es válida.' })
  ordenTrabajoId?: number;
}

export class DatosLineaDto {
  @ApiProperty({
    example: 'Cemento especial 25 kg',
    minLength: 2,
    maxLength: 300,
  })
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(2, { message: 'Describe el ítem.' })
  @MaxLength(300, {
    message: 'La descripción debe tener como máximo 300 caracteres.',
  })
  descripcion: string;

  @ApiProperty({ example: 'saco', maxLength: 20 })
  @Transform(recortar)
  @IsString({ message: 'La unidad debe ser texto.' })
  @MinLength(1, { message: 'Indica la unidad.' })
  @MaxLength(20, { message: 'La unidad debe tener como máximo 20 caracteres.' })
  unidad: string;

  @ApiProperty({
    example: 120,
    description: 'Mayor que cero, hasta 4 decimales.',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'La cantidad debe ser un número con hasta 4 decimales.' },
  )
  @Min(0.0001, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(TOPE, { message: 'La cantidad es demasiado alta.' })
  cantidad: number;

  @ApiProperty({ example: 6500, description: 'CLP, hasta 4 decimales.' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El precio unitario debe ser un número con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El precio unitario no puede ser negativo.' })
  @Max(TOPE, { message: 'El precio unitario es demasiado alto.' })
  precioUnitario: number;
}

class DatosOrdenCompraDto {
  @ApiPropertyOptional({
    description: 'Categoría de gasto. Por defecto: «Materiales» o la de la OT.',
  })
  @IsOptional()
  @IsInt({ message: 'La categoría debe ser un identificador numérico.' })
  @Min(1, { message: 'La categoría no es válida.' })
  categoriaGastoId?: number;

  @ApiPropertyOptional({
    example: '2026-11-20',
    description: 'Por defecto, hoy.',
  })
  @IsOptional()
  @EsFechaIso()
  fecha?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @EsFechaIso()
  fechaEntrega?: string | null;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(2, { message: 'Describe la compra.' })
  @MaxLength(1000, {
    message: 'La descripción debe tener como máximo 1000 caracteres.',
  })
  descripcion?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'false = OC exenta de IVA.',
  })
  @IsOptional()
  @IsBoolean({ message: 'Indica si la OC está afecta a IVA.' })
  afectaIva?: boolean;

  @ApiPropertyOptional({
    type: [DatosLineaDto],
    description:
      'OC de materiales: líneas en orden (reemplazan a las actuales).',
  })
  @IsOptional()
  @IsArray({ message: 'Las líneas deben ser una lista.' })
  @ArrayMaxSize(MAX_LINEAS_POR_OC, {
    message: `Una OC admite hasta ${MAX_LINEAS_POR_OC} líneas.`,
  })
  @ValidateNested({ each: true })
  @Type(() => DatosLineaDto)
  lineas?: DatosLineaDto[];

  @ApiPropertyOptional({
    example: 20,
    description:
      'OC parcial: porcentaje del monto de la OT (hasta 2 decimales).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El porcentaje debe ser un número con hasta 2 decimales.' },
  )
  @Min(0.01, { message: 'El porcentaje debe ser mayor que cero.' })
  @Max(100, { message: 'El porcentaje no puede superar 100.' })
  porcentaje?: number;
}

export class CrearOrdenCompraDto extends DatosOrdenCompraDto {
  @ApiProperty({ enum: TipoOrdenCompra, enumName: 'TipoOrdenCompra' })
  @IsEnum(TipoOrdenCompra, { message: 'Elige el tipo de OC.' })
  tipo: TipoOrdenCompra;

  @ApiPropertyOptional({ description: 'OC de materiales: obra.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona una obra.' })
  @Min(1, { message: 'Selecciona una obra.' })
  obraId?: number;

  @ApiPropertyOptional({ description: 'OC de materiales: proveedor.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona un proveedor.' })
  @Min(1, { message: 'Selecciona un proveedor.' })
  proveedorId?: number;

  @ApiPropertyOptional({ description: 'OC parcial: OT aprobada.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona una OT.' })
  @Min(1, { message: 'Selecciona una OT.' })
  ordenTrabajoId?: number;

  @ApiPropertyOptional({ description: 'OC parcial: hito de la OT.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona un hito.' })
  @Min(1, { message: 'Selecciona un hito.' })
  hitoId?: number;
}

export class ActualizarOrdenCompraDto extends DatosOrdenCompraDto {
  @ApiPropertyOptional({ description: 'OC de materiales: proveedor.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona un proveedor.' })
  @Min(1, { message: 'Selecciona un proveedor.' })
  proveedorId?: number;

  @ApiPropertyOptional({ description: 'OC parcial: hito de la misma OT.' })
  @IsOptional()
  @IsInt({ message: 'Selecciona un hito.' })
  @Min(1, { message: 'Selecciona un hito.' })
  hitoId?: number;

  @ApiProperty({
    example: 3,
    description: 'Versión que el cliente tiene cargada (409 si no coincide).',
  })
  @IsInt({ message: 'La versión debe ser un número entero.' })
  @Min(1, { message: 'La versión debe ser al menos 1.' })
  version: number;
}

export class RecibirOrdenCompraDto extends VersionDto {
  @ApiPropertyOptional({
    example: '2026-11-25',
    description: 'Por defecto, hoy.',
  })
  @IsOptional()
  @EsFechaIso()
  fechaRecepcion?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La observación debe ser texto.' })
  @MaxLength(500, {
    message: 'La observación debe tener como máximo 500 caracteres.',
  })
  observacion?: string | null;
}
