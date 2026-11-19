import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ConsultaPaginadaDto } from '../../common/paginacion/pagina.js';
import { Rol, TemaInterfaz } from '../../common/permisos/rol.js';

const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const correoNormalizado = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const aBooleano = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class UsuarioDto {
  @ApiProperty({ example: 12, description: 'Identificador del usuario.' })
  id: number;

  @ApiProperty({
    example: 'camila.rojas@nomade.cl',
    description: 'Correo (inicio de sesión).',
  })
  correo: string;

  @ApiProperty({ example: 'Camila Rojas' })
  nombre: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol', example: Rol.Usuario })
  rol: Rol;

  @ApiProperty({
    description: 'Las cuentas no se eliminan: solo se desactivan.',
  })
  activo: boolean;

  @ApiProperty({
    description: 'Debe reemplazar su contraseña temporal al ingresar.',
  })
  debeCambiarClave: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Si está bloqueada por intentos fallidos, hasta cuándo.',
  })
  bloqueadoHasta: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  ultimoAccesoEn: string | null;

  @ApiProperty({
    enum: TemaInterfaz,
    enumName: 'TemaInterfaz',
    example: TemaInterfaz.Claro,
  })
  tema: TemaInterfaz;

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

export class PaginaUsuariosDto {
  @ApiProperty({ type: [UsuarioDto] })
  items: UsuarioDto[];

  @ApiProperty({
    description: 'Total de usuarios que cumplen el filtro.',
    example: 8,
  })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class UsuarioClaveTemporalDto {
  @ApiProperty({ type: UsuarioDto })
  usuario: UsuarioDto;

  @ApiProperty({
    description:
      'Contraseña temporal generada. Se muestra una sola vez; el usuario deberá cambiarla al ingresar.',
    example: 'Hq7mXk2pLw9RtNv4',
  })
  claveTemporal: string;
}

export class ListarUsuariosDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre o correo.' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;

  @ApiPropertyOptional({ enum: Rol, enumName: 'Rol' })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser "admin" o "usuario".' })
  rol?: Rol;

  @ApiPropertyOptional({
    description: 'Filtra por cuentas activas o desactivadas.',
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'El filtro "activo" debe ser true o false.' })
  activo?: boolean;
}

export class CrearUsuarioDto {
  @ApiProperty({ example: 'camila.rojas@nomade.cl' })
  @Transform(correoNormalizado)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  correo: string;

  @ApiProperty({ example: 'Camila Rojas', minLength: 2, maxLength: 100 })
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, {
    message: 'El nombre debe tener como máximo 100 caracteres.',
  })
  nombre: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol', example: Rol.Usuario })
  @IsEnum(Rol, { message: 'El rol debe ser "admin" o "usuario".' })
  rol: Rol;
}

export class ActualizarUsuarioDto {
  @ApiProperty({
    example: 3,
    description: 'Versión que el cliente tiene cargada (409 si no coincide).',
  })
  @IsInt({ message: 'La versión debe ser un número entero.' })
  @Min(1, { message: 'La versión debe ser al menos 1.' })
  version: number;

  @ApiPropertyOptional({ example: 'camila.rojas@nomade.cl' })
  @IsOptional()
  @Transform(correoNormalizado)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  correo?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, {
    message: 'El nombre debe tener como máximo 100 caracteres.',
  })
  nombre?: string;

  @ApiPropertyOptional({ enum: Rol, enumName: 'Rol' })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser "admin" o "usuario".' })
  rol?: Rol;
}

/** Cuerpo de las acciones sobre un usuario (activar, desactivar, restablecer contraseña). */
export class AccionUsuarioDto {
  @ApiProperty({
    example: 3,
    description: 'Versión que el cliente tiene cargada (409 si no coincide).',
  })
  @IsInt({ message: 'La versión debe ser un número entero.' })
  @Min(1, { message: 'La versión debe ser al menos 1.' })
  version: number;

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
