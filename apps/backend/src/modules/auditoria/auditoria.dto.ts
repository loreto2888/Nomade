import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ConsultaPaginadaDto } from '../../common/paginacion/pagina.js';

const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class EventoAuditoriaDto {
  @ApiProperty({ example: 1042 })
  id: number;

  @ApiProperty({ type: String, format: 'date-time' })
  ocurridoEn: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Actor; vacío si el evento no tiene sesión (p. ej. intento de ingreso fallido).',
  })
  usuarioId: number | null;

  @ApiProperty({ type: String, nullable: true })
  usuarioCorreo: string | null;

  @ApiProperty({ type: String, nullable: true })
  usuarioNombre: string | null;

  @ApiProperty({
    example: 'usuario.crear',
    description: 'Acción en formato `entidad.verbo`.',
  })
  accion: string;

  @ApiProperty({ example: 'usuario' })
  entidad: string;

  @ApiProperty({ type: String, nullable: true, example: '12' })
  entidadId: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Valores relevantes antes del cambio (sin datos sensibles).',
  })
  antes: Record<string, unknown> | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Valores relevantes después del cambio (sin datos sensibles).',
  })
  despues: Record<string, unknown> | null;

  @ApiProperty({ type: String, nullable: true })
  motivo: string | null;

  @ApiProperty({ type: String, nullable: true })
  ip: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Id de correlación del request (`x-request-id`).',
  })
  idCorrelacion: string | null;
}

export class PaginaAuditoriaDto {
  @ApiProperty({ type: [EventoAuditoriaDto] })
  items: EventoAuditoriaDto[];

  @ApiProperty({ example: 230 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ConsultarAuditoriaDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({
    description: 'Desde (ISO 8601, inclusivo).',
    example: '2026-11-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha "desde" debe tener formato ISO 8601.' },
  )
  desde?: string;

  @ApiPropertyOptional({
    description: 'Hasta (ISO 8601). Si es solo fecha, incluye todo ese día.',
    example: '2026-11-30',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha "hasta" debe tener formato ISO 8601.' },
  )
  hasta?: string;

  @ApiPropertyOptional({ description: 'Filtra por actor.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El usuario debe ser un número entero.' })
  @Min(1, { message: 'El usuario debe ser un identificador válido.' })
  usuarioId?: number;

  @ApiPropertyOptional({
    description: 'Acción exacta o prefijo terminado en punto (`usuario.`).',
    example: 'usuario.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La acción debe ser texto.' })
  @MaxLength(100, { message: 'La acción es demasiado larga.' })
  accion?: string;

  @ApiPropertyOptional({ example: 'usuario' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La entidad debe ser texto.' })
  @MaxLength(100, { message: 'La entidad es demasiado larga.' })
  entidad?: string;

  @ApiPropertyOptional({ description: 'Identificador del registro afectado.' })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El identificador debe ser texto.' })
  @MaxLength(100, { message: 'El identificador es demasiado largo.' })
  entidadId?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda libre en acción, entidad, actor y motivo.',
  })
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda es demasiado larga.' })
  q?: string;
}
