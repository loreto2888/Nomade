import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
import { recortar, recortarONulo } from '../../common/validacion/texto.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { TOPE_FACTOR } from './calculo.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';
import { Type } from 'class-transformer';

export class UsuarioResumenDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Camila Rojas' })
  nombre: string;
}

export class FamiliaResumenDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'obra_gruesa', description: 'Código del catálogo.' })
  codigo: string;

  @ApiProperty({ example: 'Obra gruesa' })
  nombre: string;
}

export class PresupuestoVersionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 1 })
  obraId: number;

  @ApiProperty({
    example: 2,
    description: 'Correlativo de la versión en la obra.',
  })
  numero: number;

  @ApiProperty({ enum: EstadoPresupuesto, enumName: 'EstadoPresupuesto' })
  estado: EstadoPresupuesto;

  @ApiProperty({
    description:
      'Única versión aprobada que rige la obra. Una aprobada que ya no es vigente fue reemplazada por otra.',
  })
  vigente: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Adicionales de terminaciones',
  })
  descripcion: string | null;

  @ApiProperty({
    enum: MonedaContrato,
    enumName: 'MonedaContrato',
    description: 'Moneda de los precios y totales de las partidas.',
  })
  moneda: MonedaContrato;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Versiones en UF: valor de la UF con que se convierte a CLP.',
  })
  valorUf: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Fecha del valor de la UF.',
  })
  fechaValorUf: string | null;

  @ApiProperty({
    example: 185000000,
    description: 'Total en la moneda de la versión.',
  })
  total: number;

  @ApiProperty({ example: 185000000, description: 'Total en pesos (CLP).' })
  totalClp: number;

  @ApiProperty({ example: 24 })
  cantidadPartidas: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Versión desde la que se copió.',
  })
  copiadaDeId: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Número de la versión desde la que se copió.',
  })
  copiadaDeNumero: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Lote de importación del que nació.',
  })
  importacionLoteId: number | null;

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

  @ApiProperty({
    type: UsuarioResumenDto,
    nullable: true,
    description: 'Quién aprobó o rechazó.',
  })
  resueltoPor: UsuarioResumenDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Motivo del rechazo (o comentario de la aprobación).',
  })
  motivoResolucion: string | null;

  @ApiProperty({ example: 4, description: 'Versión para control optimista.' })
  version: number;
}

export class PartidaDto {
  @ApiProperty({ example: 31 })
  id: number;

  @ApiProperty({ example: 12 })
  versionId: number;

  @ApiProperty({ example: 1, description: 'Posición dentro de la versión.' })
  orden: number;

  @ApiProperty({
    example: '1.2.3',
    description: 'Código (la jerarquía se expresa con puntos).',
  })
  codigo: string;

  @ApiProperty({ type: FamiliaResumenDto })
  familia: FamiliaResumenDto;

  @ApiProperty({ example: 'Radier de hormigón e=10 cm' })
  descripcion: string;

  @ApiProperty({ example: 'm2' })
  unidad: string;

  @ApiProperty({ example: 120.5 })
  cantidad: number;

  @ApiProperty({ example: 18500, description: 'En la moneda de la versión.' })
  precioUnitario: number;

  @ApiProperty({
    example: 2229250,
    description: 'Cantidad × precio, en la moneda de la versión.',
  })
  total: number;

  @ApiProperty({ example: 2229250, description: 'Total en pesos (CLP).' })
  totalClp: number;

  @ApiProperty({ example: 1, description: 'Versión para control optimista.' })
  version: number;
}

export class TotalFamiliaDto {
  @ApiProperty({ type: FamiliaResumenDto })
  familia: FamiliaResumenDto;

  @ApiProperty({ example: 8 })
  cantidadPartidas: number;

  @ApiProperty({
    example: 45000000,
    description: 'En la moneda de la versión.',
  })
  total: number;

  @ApiProperty({ example: 45000000, description: 'En pesos (CLP).' })
  totalClp: number;
}

export class PresupuestoDetalleDto {
  @ApiProperty({ type: PresupuestoVersionDto })
  version: PresupuestoVersionDto;

  @ApiProperty({ type: [PartidaDto] })
  partidas: PartidaDto[];

  @ApiProperty({
    type: [TotalFamiliaDto],
    description: 'Totales por familia, en el orden del catálogo.',
  })
  totalesPorFamilia: TotalFamiliaDto[];
}

export class CrearPresupuestoDto {
  @ApiPropertyOptional({
    description:
      'Versión (de la misma obra) desde la que se copian las partidas. Sin ella, la versión nace vacía.',
  })
  @IsOptional()
  @IsInt({
    message: 'La versión de origen debe ser un identificador numérico.',
  })
  @Min(1, { message: 'La versión de origen no es válida.' })
  copiarDeId?: number;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(200, {
    message: 'La descripción debe tener como máximo 200 caracteres.',
  })
  descripcion?: string | null;
}

export class ActualizarPresupuestoDto extends VersionDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(200, {
    message: 'La descripción debe tener como máximo 200 caracteres.',
  })
  descripcion?: string | null;
}

export class EliminarPresupuestoDto extends EliminarDto {}

export class EnviarPresupuestoDto extends VersionDto {}

export class AprobarPresupuestoDto extends VersionDto {
  @ApiPropertyOptional({
    description: 'Comentario opcional, queda en la bitácora.',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El comentario debe ser texto.' })
  @MaxLength(500, {
    message: 'El comentario debe tener como máximo 500 caracteres.',
  })
  motivo?: string;
}

export class RechazarPresupuestoDto extends VersionDto {
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

export class DatosPartidaDto {
  @ApiProperty({
    example: '1.2.3',
    description:
      'Código de la partida, único en la versión: 1 a 30 caracteres (letras, dígitos, punto, guion o guion bajo).',
  })
  @Transform(recortar)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/, {
    message:
      'El código debe tener 1 a 30 caracteres: letras, dígitos, punto, guion o guion bajo.',
  })
  codigo: string;

  @ApiProperty({
    example: 3,
    description: 'Familia (catálogo `familia_partida`).',
  })
  @IsInt({ message: 'Selecciona una familia.' })
  @Min(1, { message: 'Selecciona una familia.' })
  familiaId: number;

  @ApiProperty({
    example: 'Radier de hormigón e=10 cm',
    minLength: 2,
    maxLength: 300,
  })
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(2, { message: 'La descripción debe tener al menos 2 caracteres.' })
  @MaxLength(300, {
    message: 'La descripción debe tener como máximo 300 caracteres.',
  })
  descripcion: string;

  @ApiProperty({ example: 'm2', maxLength: 20 })
  @Transform(recortar)
  @IsString({ message: 'La unidad debe ser texto.' })
  @MinLength(1, { message: 'Indica la unidad.' })
  @MaxLength(20, { message: 'La unidad debe tener como máximo 20 caracteres.' })
  unidad: string;

  @ApiProperty({
    example: 120.5,
    description: 'Mayor que cero, hasta 4 decimales.',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'La cantidad debe ser un número con hasta 4 decimales.' },
  )
  @Min(0.0001, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(TOPE_FACTOR, { message: 'La cantidad es demasiado alta.' })
  cantidad: number;

  @ApiProperty({
    example: 18500,
    description:
      'Precio por unidad en la moneda de la versión (CLP: entero; UF: hasta 4 decimales).',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El precio unitario debe ser un número con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El precio unitario no puede ser negativo.' })
  @Max(TOPE_FACTOR, { message: 'El precio unitario es demasiado alto.' })
  precioUnitario: number;
}

export class CrearPartidaDto extends DatosPartidaDto {}

export class ActualizarPartidaDto extends IntersectionType(
  PartialType(DatosPartidaDto),
  VersionDto,
) {}

export class EliminarPartidaDto extends VersionDto {}

export class CompararPresupuestoDto {
  @ApiPropertyOptional({
    description:
      'Versión base contra la que se compara. Por defecto, la versión aprobada vigente de la obra.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La versión base debe ser un identificador numérico.' })
  @Min(1, { message: 'La versión base no es válida.' })
  baseId?: number;
}

export class PartidaComparadaDto {
  @ApiProperty({ example: '1.2.3' })
  codigo: string;

  @ApiProperty({
    enum: ['nueva', 'eliminada', 'modificada', 'sin_cambios'],
    enumName: 'TipoCambioPartida',
  })
  cambio: 'nueva' | 'eliminada' | 'modificada' | 'sin_cambios';

  @ApiProperty({
    type: String,
    description:
      'Descripción (de la versión comparada o, si fue eliminada, de la base).',
  })
  descripcion: string;

  @ApiProperty({
    type: PartidaDto,
    nullable: true,
    description: 'Partida en la versión base.',
  })
  base: PartidaDto | null;

  @ApiProperty({
    type: PartidaDto,
    nullable: true,
    description: 'Partida en la versión comparada.',
  })
  nueva: PartidaDto | null;

  @ApiProperty({
    description: 'Total en CLP de la versión comparada menos el de la base.',
  })
  diferenciaClp: number;
}

export class ComparacionPresupuestoDto {
  @ApiProperty({
    type: PresupuestoVersionDto,
    description: 'Versión base (por defecto, la vigente).',
  })
  base: PresupuestoVersionDto;

  @ApiProperty({
    type: PresupuestoVersionDto,
    description: 'Versión comparada.',
  })
  nueva: PresupuestoVersionDto;

  @ApiProperty({ type: [PartidaComparadaDto] })
  filas: PartidaComparadaDto[];

  @ApiProperty() totalBaseClp: number;
  @ApiProperty() totalNuevoClp: number;
  @ApiProperty() diferenciaClp: number;
  @ApiProperty() nuevas: number;
  @ApiProperty() eliminadas: number;
  @ApiProperty() modificadas: number;
  @ApiProperty() sinCambios: number;
}
