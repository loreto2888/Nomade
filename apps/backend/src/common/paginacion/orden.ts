import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ConsultaPaginadaDto } from './pagina.js';

export const DIRECCIONES_ORDEN = ['asc', 'desc'] as const;
export type DireccionOrden = (typeof DIRECCIONES_ORDEN)[number];

/** Paginación con dirección de orden; cada listado agrega su propio `ordenarPor`. */
export class ConsultaOrdenablePaginadaDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({
    enum: DIRECCIONES_ORDEN,
    enumName: 'DireccionOrden',
    default: 'asc',
  })
  @IsOptional()
  @IsIn(DIRECCIONES_ORDEN, {
    message: 'La dirección de orden debe ser "asc" o "desc".',
  })
  direccion?: DireccionOrden;
}

/** `ASC`/`DESC` de TypeORM a partir del filtro. */
export const sentidoSql = (direccion: DireccionOrden | undefined) =>
  direccion === 'desc' ? 'DESC' : 'ASC';
