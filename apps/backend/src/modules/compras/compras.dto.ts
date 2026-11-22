import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VersionDto } from '../../common/maestros/contraparte.dto.js';
import { ConsultaPaginadaDto } from '../../common/paginacion/pagina.js';
import { recortar } from '../../common/validacion/texto.js';
import { CategoriaGastoResumenDto } from '../movimientos/movimientos.dto.js';
import { UsuarioResumenDto } from '../presupuestos/presupuestos.dto.js';
import { EstadoDocumentoCompra } from './compras.tipos.js';

export class ObraReferenciaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'CC-2026-01' })
  codigoCentroCosto: string;

  @ApiProperty({ example: 'Local Parque Norte' })
  nombre: string;

  @ApiProperty({
    description: 'La obra está cerrada: sus documentos son de solo lectura.',
  })
  cerrada: boolean;
}

export class ProveedorReferenciaDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: '76222333-3' })
  rut: string;

  @ApiProperty({ example: 'Instalaciones Sur Ltda.' })
  razonSocial: string;
}

/** Otro documento de compra relacionado (folio y estado). */
export class DocumentoReferenciaDto {
  @ApiProperty({ example: 8 })
  id: number;

  @ApiProperty({ example: 'COT-000008' })
  folio: string;

  @ApiProperty({
    enum: EstadoDocumentoCompra,
    enumName: 'EstadoDocumentoCompra',
  })
  estado: EstadoDocumentoCompra;
}

/** Datos comunes de cotizaciones, OT y OC: folio, partes, flujo de aprobación y trazabilidad. */
export class DocumentoCompraDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({
    example: 12,
    description: 'Correlativo global por tipo de documento.',
  })
  numero: number;

  @ApiProperty({ example: 'OC-000012', description: 'Folio visible.' })
  folio: string;

  @ApiProperty({ type: ObraReferenciaDto })
  obra: ObraReferenciaDto;

  @ApiProperty({ type: ProveedorReferenciaDto })
  proveedor: ProveedorReferenciaDto;

  @ApiProperty({ type: CategoriaGastoResumenDto })
  categoria: CategoriaGastoResumenDto;

  @ApiProperty({ example: 'Instalación eléctrica del local' })
  descripcion: string;

  @ApiProperty({
    enum: EstadoDocumentoCompra,
    enumName: 'EstadoDocumentoCompra',
  })
  estado: EstadoDocumentoCompra;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  creadoPor: UsuarioResumenDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  enviadoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  enviadoPor: UsuarioResumenDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Cuándo se aprobó o rechazó.',
  })
  resueltoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  resueltoPor: UsuarioResumenDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Motivo del rechazo (o comentario de la aprobación).',
  })
  motivoResolucion: string | null;

  @ApiProperty({ example: 3, description: 'Versión para control optimista.' })
  version: number;
}

// --- Entradas comunes del flujo ----------------------------------------------

const motivoOpcional = {
  description: 'Comentario opcional, queda en la bitácora.',
  maxLength: 500,
};

export class EnviarDocumentoCompraDto extends VersionDto {}

export class AprobarDocumentoCompraDto extends VersionDto {
  @ApiPropertyOptional(motivoOpcional)
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El comentario debe ser texto.' })
  @MaxLength(500, {
    message: 'El comentario debe tener como máximo 500 caracteres.',
  })
  motivo?: string;
}

export class RechazarDocumentoCompraDto extends VersionDto {
  @ApiProperty({
    description: 'Motivo del rechazo (obligatorio).',
    maxLength: 500,
  })
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser texto.' })
  @MinLength(3, { message: 'Indica el motivo del rechazo.' })
  @MaxLength(500, {
    message: 'El motivo debe tener como máximo 500 caracteres.',
  })
  motivo: string;
}

export class AnularDocumentoCompraDto extends VersionDto {
  @ApiProperty({
    description: 'Motivo de la anulación (obligatorio).',
    maxLength: 500,
  })
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser texto.' })
  @MinLength(3, { message: 'Indica el motivo de la anulación.' })
  @MaxLength(500, {
    message: 'El motivo debe tener como máximo 500 caracteres.',
  })
  motivo: string;
}

export class EliminarDocumentoCompraDto extends VersionDto {
  @ApiPropertyOptional(motivoOpcional)
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser texto.' })
  @MaxLength(500, {
    message: 'El motivo debe tener como máximo 500 caracteres.',
  })
  motivo?: string;
}

/** Filtros comunes de los listados de documentos de compra (del más reciente al más antiguo). */
export class ListarDocumentosCompraDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por folio (número), descripción o proveedor.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;

  @ApiPropertyOptional({ description: 'Filtra por obra.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La obra debe ser un identificador numérico.' })
  @Min(1, { message: 'La obra no es válida.' })
  obraId?: number;

  @ApiPropertyOptional({ description: 'Filtra por proveedor.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El proveedor debe ser un identificador numérico.' })
  @Min(1, { message: 'El proveedor no es válido.' })
  proveedorId?: number;

  @ApiPropertyOptional({
    enum: EstadoDocumentoCompra,
    enumName: 'EstadoDocumentoCompra',
  })
  @IsOptional()
  @IsEnum(EstadoDocumentoCompra, { message: 'El estado no es válido.' })
  estado?: EstadoDocumentoCompra;
}
