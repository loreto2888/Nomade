import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol, TemaInterfaz } from '../../common/permisos/rol.js';
import {
  MAX_LARGO_CLAVE,
  MIN_LARGO_CLAVE,
} from '../../common/seguridad/politica-clave.js';

const correoNormalizado = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class IniciarSesionDto {
  @ApiProperty({ example: 'camila.rojas@nomade.cl' })
  @Transform(correoNormalizado)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  correo: string;

  @ApiProperty({ format: 'password', maxLength: MAX_LARGO_CLAVE })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  @MaxLength(MAX_LARGO_CLAVE, { message: 'La contraseña es demasiado larga.' })
  clave: string;
}

export class CambiarClaveDto {
  @ApiProperty({
    format: 'password',
    description:
      'Contraseña actual (o la temporal entregada por el administrador).',
  })
  @IsString({ message: 'La contraseña actual es obligatoria.' })
  @MinLength(1, { message: 'La contraseña actual es obligatoria.' })
  @MaxLength(MAX_LARGO_CLAVE, {
    message: 'La contraseña actual es demasiado larga.',
  })
  claveActual: string;

  @ApiProperty({
    format: 'password',
    minLength: MIN_LARGO_CLAVE,
    maxLength: MAX_LARGO_CLAVE,
    description: `Nueva contraseña (mínimo ${MIN_LARGO_CLAVE} caracteres).`,
  })
  @IsString({ message: 'La nueva contraseña es obligatoria.' })
  @MinLength(MIN_LARGO_CLAVE, {
    message: `La nueva contraseña debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`,
  })
  @MaxLength(MAX_LARGO_CLAVE, {
    message: `La nueva contraseña debe tener como máximo ${MAX_LARGO_CLAVE} caracteres.`,
  })
  claveNueva: string;
}

export class ActualizarTemaDto {
  @ApiProperty({
    enum: TemaInterfaz,
    enumName: 'TemaInterfaz',
    example: TemaInterfaz.Oscuro,
  })
  @IsEnum(TemaInterfaz, { message: 'El tema debe ser "claro" u "oscuro".' })
  tema: TemaInterfaz;
}

export class UsuarioSesionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'camila.rojas@nomade.cl' })
  correo: string;

  @ApiProperty({ example: 'Camila Rojas' })
  nombre: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol', example: Rol.Usuario })
  rol: Rol;

  @ApiProperty({
    description:
      'Si es `true`, solo puede cambiar su contraseña hasta hacerlo.',
  })
  debeCambiarClave: boolean;

  @ApiProperty({ enum: TemaInterfaz, enumName: 'TemaInterfaz' })
  tema: TemaInterfaz;
}

export class SesionActualDto {
  @ApiProperty({ type: UsuarioSesionDto })
  usuario: UsuarioSesionDto;

  @ApiProperty({
    type: [String],
    description:
      'Códigos de permiso efectivos del rol (admin → todos; usuario → todos salvo administración).',
    example: ['oc.aprobar', 'lote.aprobar', 'eepp.aprobar'],
  })
  permisos: string[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Vencimiento absoluto de la sesión (8 h).',
  })
  expiraEn: string;
}
