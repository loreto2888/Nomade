import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import {
  EliminarDto,
  VersionDto,
} from '../../common/maestros/contraparte.dto.js';
import { ConsultaPaginadaDto } from '../../common/paginacion/pagina.js';
import { aBooleano } from '../../common/validacion/texto.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { UsuarioResumenDto } from '../presupuestos/presupuestos.dto.js';
import { EstadoImportacion, TipoImportacion } from './importaciones.tipos.js';

export class ObraImportacionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'CC-001' })
  codigoCentroCosto: string;

  @ApiProperty({ example: 'Local Parque Norte' })
  nombre: string;
}

export class ImportacionLoteDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ enum: TipoImportacion, enumName: 'TipoImportacion' })
  tipo: TipoImportacion;

  @ApiProperty({ enum: EstadoImportacion, enumName: 'EstadoImportacion' })
  estado: EstadoImportacion;

  @ApiProperty({
    type: ObraImportacionDto,
    nullable: true,
    description: 'Obra de destino.',
  })
  obra: ObraImportacionDto | null;

  @ApiProperty({ example: 'presupuesto-obra.xlsx' })
  nombreArchivo: string;

  @ApiProperty({ example: 48213, description: 'Tamaño del archivo en bytes.' })
  tamanioBytes: number;

  @ApiProperty({ example: 120 })
  totalFilas: number;

  @ApiProperty({ example: 118 })
  filasValidas: number;

  @ApiProperty({
    example: 2,
    description: 'Con errores: mientras haya alguna no se puede confirmar.',
  })
  filasConError: number;

  @ApiProperty({
    example: 185000000,
    description: 'Suma de las filas válidas en la moneda de la obra.',
  })
  montoTotal: number;

  @ApiProperty({
    enum: MonedaContrato,
    enumName: 'MonedaContrato',
    nullable: true,
  })
  moneda: MonedaContrato | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Versión de presupuesto creada al confirmar.',
  })
  presupuestoVersionId: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  confirmadoEn: string | null;

  @ApiProperty({ type: UsuarioResumenDto, nullable: true })
  creadoPor: UsuarioResumenDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ example: 1, description: 'Versión para control optimista.' })
  version: number;
}

export class PaginaImportacionesDto {
  @ApiProperty({ type: [ImportacionLoteDto] })
  items: ImportacionLoteDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarImportacionesDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({ description: 'Filtra por obra de destino.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La obra debe ser un identificador numérico.' })
  @Min(1, { message: 'La obra no es válida.' })
  obraId?: number;

  @ApiPropertyOptional({
    enum: EstadoImportacion,
    enumName: 'EstadoImportacion',
  })
  @IsOptional()
  @IsEnum(EstadoImportacion, {
    message:
      'El estado debe ser "previsualizado", "confirmado" o "descartado".',
  })
  estado?: EstadoImportacion;
}

/** Campos de texto del formulario multipart; el archivo viaja en `archivo`. */
export class SubirImportacionPresupuestoDto {
  @ApiProperty({
    example: 1,
    description: 'Obra a la que se importa el presupuesto.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Selecciona la obra de destino.' })
  @Min(1, { message: 'Selecciona la obra de destino.' })
  obraId: number;
}

export class DatosFilaImportacionDto {
  @ApiProperty({ type: String, nullable: true })
  codigo: string | null;

  @ApiProperty({ type: String, nullable: true })
  familia: string | null;

  @ApiProperty({ type: String, nullable: true })
  descripcion: string | null;

  @ApiProperty({ type: String, nullable: true })
  unidad: string | null;

  @ApiProperty({ type: String, nullable: true })
  cantidad: string | null;

  @ApiProperty({ type: String, nullable: true })
  precioUnitario: string | null;
}

export class ErrorFilaImportacionDto {
  @ApiProperty({
    example: 'cantidad',
    description: 'Columna con el problema (o `fila` si es general).',
  })
  campo: string;

  @ApiProperty({ example: 'La cantidad debe ser mayor que cero.' })
  mensaje: string;
}

export class FilaImportacionDto {
  @ApiProperty({ example: 2, description: 'Número de fila en la planilla.' })
  numeroFila: number;

  @ApiProperty({ type: DatosFilaImportacionDto })
  datos: DatosFilaImportacionDto;

  @ApiProperty()
  valida: boolean;

  @ApiProperty({ type: [ErrorFilaImportacionDto] })
  errores: ErrorFilaImportacionDto[];
}

export class PaginaFilasImportacionDto {
  @ApiProperty({ type: [FilaImportacionDto] })
  items: FilaImportacionDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ListarFilasImportacionDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({
    description: 'Solo las filas con errores.',
    default: false,
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'soloErrores debe ser "true" o "false".' })
  soloErrores?: boolean;
}

export class ConfirmarImportacionDto extends VersionDto {}

export class DescartarImportacionDto extends EliminarDto {}
