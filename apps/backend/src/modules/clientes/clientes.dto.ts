import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ActualizarContraparteDto,
  ContraparteDto,
  DatosContraparteDto,
  EliminarDto,
} from '../../common/maestros/contraparte.dto.js';
import { ConsultaOrdenablePaginadaDto } from '../../common/paginacion/orden.js';
import { recortar } from '../../common/validacion/texto.js';

export const CAMPOS_ORDEN_CLIENTES = [
  'razonSocial',
  'rut',
  'creadoEn',
] as const;

export class ClienteDto extends ContraparteDto {}

export class PaginaClientesDto {
  @ApiProperty({ type: [ClienteDto] })
  items: ClienteDto[];

  @ApiProperty({
    description: 'Total de clientes que cumplen el filtro.',
    example: 8,
  })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarClientesDto extends ConsultaOrdenablePaginadaDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por razón social, nombre de fantasía o RUT.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;

  @ApiPropertyOptional({ enum: CAMPOS_ORDEN_CLIENTES, default: 'razonSocial' })
  @IsOptional()
  @IsIn(CAMPOS_ORDEN_CLIENTES, {
    message: `Solo se puede ordenar por: ${CAMPOS_ORDEN_CLIENTES.join(', ')}.`,
  })
  ordenarPor?: (typeof CAMPOS_ORDEN_CLIENTES)[number];
}

export class CrearClienteDto extends DatosContraparteDto {}
export class ActualizarClienteDto extends ActualizarContraparteDto {}
export class EliminarClienteDto extends EliminarDto {}
