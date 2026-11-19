import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ActualizarContraparteDto,
  ContraparteDto,
  DatosContraparteDto,
  EliminarDto,
  VersionDto,
} from '../../common/maestros/contraparte.dto.js';
import { ConsultaOrdenablePaginadaDto } from '../../common/paginacion/orden.js';
import { EsRut } from '../../common/validacion/es-rut.decorator.js';
import { correoNormalizado, recortar } from '../../common/validacion/texto.js';
import {
  CAMPOS_ORDEN_PROVEEDORES,
  TipoCuentaBancaria,
} from './proveedores.tipos.js';

export class ProveedorDto extends ContraparteDto {
  @ApiProperty({
    description:
      'Indica si el proveedor tiene cuentas bancarias registradas. El detalle solo lo ve el administrador.',
  })
  tieneDatosBancarios: boolean;
}

export class PaginaProveedoresDto {
  @ApiProperty({ type: [ProveedorDto] })
  items: ProveedorDto[];

  @ApiProperty({
    description: 'Total de proveedores que cumplen el filtro.',
    example: 30,
  })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarProveedoresDto extends ConsultaOrdenablePaginadaDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por razón social, nombre de fantasía o RUT.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;

  @ApiPropertyOptional({
    enum: CAMPOS_ORDEN_PROVEEDORES,
    default: 'razonSocial',
  })
  @IsOptional()
  @IsIn(CAMPOS_ORDEN_PROVEEDORES, {
    message: `Solo se puede ordenar por: ${CAMPOS_ORDEN_PROVEEDORES.join(', ')}.`,
  })
  ordenarPor?: (typeof CAMPOS_ORDEN_PROVEEDORES)[number];
}

export class CrearProveedorDto extends DatosContraparteDto {}
export class ActualizarProveedorDto extends ActualizarContraparteDto {}
export class EliminarProveedorDto extends EliminarDto {}

// ---------------------------------------------------------------------------
// Cuentas bancarias (solo admin)
// ---------------------------------------------------------------------------

export class CuentaBancariaDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 12 })
  proveedorId: number;

  @ApiProperty({ example: 'Banco de Chile' })
  banco: string;

  @ApiProperty({ enum: TipoCuentaBancaria, enumName: 'TipoCuentaBancaria' })
  tipoCuenta: TipoCuentaBancaria;

  @ApiProperty({ example: '00123456789' })
  numeroCuenta: string;

  @ApiProperty({ example: 'Materiales Cordillera SpA' })
  titular: string;

  @ApiProperty({ example: '76123456-0' })
  titularRut: string;

  @ApiProperty({ type: String, nullable: true })
  correoNotificacion: string | null;

  @ApiProperty({
    description: 'Cuenta preferida para los pagos del proveedor.',
  })
  principal: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn: string;

  @ApiProperty({ example: 1 })
  version: number;
}

export class DatosCuentaBancariaDto {
  @ApiProperty({ example: 'Banco de Chile', minLength: 2, maxLength: 60 })
  @Transform(recortar)
  @IsString({ message: 'El banco debe ser texto.' })
  @MinLength(2, { message: 'El banco debe tener al menos 2 caracteres.' })
  @MaxLength(60, { message: 'El banco debe tener como máximo 60 caracteres.' })
  banco: string;

  @ApiProperty({ enum: TipoCuentaBancaria, enumName: 'TipoCuentaBancaria' })
  @IsEnum(TipoCuentaBancaria, {
    message: 'El tipo de cuenta debe ser "corriente", "vista" o "ahorro".',
  })
  tipoCuenta: TipoCuentaBancaria;

  @ApiProperty({ example: '00123456789', description: '4 a 20 dígitos.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '') : value,
  )
  @Matches(/^[0-9]{4,20}$/, {
    message: 'El número de cuenta debe tener entre 4 y 20 dígitos.',
  })
  numeroCuenta: string;

  @ApiProperty({
    example: 'Materiales Cordillera SpA',
    minLength: 2,
    maxLength: 150,
  })
  @Transform(recortar)
  @IsString({ message: 'El titular debe ser texto.' })
  @MinLength(2, { message: 'El titular debe tener al menos 2 caracteres.' })
  @MaxLength(150, {
    message: 'El titular debe tener como máximo 150 caracteres.',
  })
  titular: string;

  @ApiProperty({ example: '76123456-0' })
  @EsRut()
  titularRut: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(correoNormalizado)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  correoNotificacion?: string | null;

  @ApiPropertyOptional({
    description:
      'La primera cuenta del proveedor queda como principal automáticamente.',
  })
  @IsOptional()
  @IsBoolean({
    message: 'El indicador "principal" debe ser verdadero o falso.',
  })
  principal?: boolean;
}

export class CrearCuentaBancariaDto extends DatosCuentaBancariaDto {}

export class ActualizarCuentaBancariaDto extends IntersectionType(
  PartialType(DatosCuentaBancariaDto),
  VersionDto,
) {}

export class EliminarCuentaBancariaDto extends EliminarDto {}
