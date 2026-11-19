import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EsRut } from '../validacion/es-rut.decorator.js';
import {
  correoNormalizado,
  recortar,
  recortarONulo,
} from '../validacion/texto.js';

/** Datos editables de un cliente o proveedor. */
export class DatosContraparteDto {
  @ApiProperty({
    example: '76123456-0',
    description: 'RUT (se acepta con puntos; se guarda como 76123456-0).',
  })
  @EsRut()
  rut: string;

  @ApiProperty({
    example: 'Constructora Andes SpA',
    minLength: 2,
    maxLength: 150,
  })
  @Transform(recortar)
  @IsString({ message: 'La razón social debe ser texto.' })
  @MinLength(2, {
    message: 'La razón social debe tener al menos 2 caracteres.',
  })
  @MaxLength(150, {
    message: 'La razón social debe tener como máximo 150 caracteres.',
  })
  razonSocial: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 150 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'El nombre de fantasía debe ser texto.' })
  @MaxLength(150, {
    message: 'El nombre de fantasía debe tener como máximo 150 caracteres.',
  })
  nombreFantasia?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 150 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'El giro debe ser texto.' })
  @MaxLength(150, { message: 'El giro debe tener como máximo 150 caracteres.' })
  giro?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'El contacto debe ser texto.' })
  @MaxLength(100, {
    message: 'El contacto debe tener como máximo 100 caracteres.',
  })
  contactoNombre?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 254 })
  @IsOptional()
  @Transform(correoNormalizado)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  correo?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+56 2 2345 6789',
  })
  @IsOptional()
  @Transform(recortarONulo)
  @Matches(/^[0-9+()\-\s.]{6,30}$/, {
    message:
      'Ingresa un teléfono válido (solo dígitos, +, espacios, guiones y paréntesis).',
  })
  telefono?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @Transform(recortarONulo)
  @IsString({ message: 'La dirección debe ser texto.' })
  @MaxLength(200, {
    message: 'La dirección debe tener como máximo 200 caracteres.',
  })
  direccion?: string | null;
}

/** Cuerpo con la versión que el cliente tiene cargada (control optimista). */
export class VersionDto {
  @ApiProperty({
    example: 3,
    description: 'Versión que el cliente tiene cargada (409 si no coincide).',
  })
  @IsInt({ message: 'La versión debe ser un número entero.' })
  @Min(1, { message: 'La versión debe ser al menos 1.' })
  version: number;
}

/** Modificación parcial de un cliente o proveedor. */
export class ActualizarContraparteDto extends IntersectionType(
  PartialType(DatosContraparteDto),
  VersionDto,
) {}

/** Eliminación lógica con motivo opcional (queda en la bitácora). */
export class EliminarDto extends VersionDto {
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

/** Proyección pública de un cliente o proveedor. */
export class ContraparteDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: '76123456-0' })
  rut: string;

  @ApiProperty({ example: 'Constructora Andes SpA' })
  razonSocial: string;

  @ApiProperty({ type: String, nullable: true })
  nombreFantasia: string | null;

  @ApiProperty({ type: String, nullable: true })
  giro: string | null;

  @ApiProperty({ type: String, nullable: true })
  contactoNombre: string | null;

  @ApiProperty({ type: String, nullable: true })
  correo: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono: string | null;

  @ApiProperty({ type: String, nullable: true })
  direccion: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn: string;

  @ApiProperty({
    example: 3,
    description:
      'Versión para control optimista: se envía en cada modificación.',
  })
  version: number;
}
