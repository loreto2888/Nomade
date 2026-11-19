import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const TAMANIO_PAGINA_POR_DEFECTO = 25;
export const TAMANIO_PAGINA_MAXIMO = 100;

/** Parámetros de paginación comunes a los listados (paginación en servidor). */
export class ConsultaPaginadaDto {
  @ApiPropertyOptional({
    description: 'Número de página (desde 1).',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser al menos 1.' })
  pagina: number = 1;

  @ApiPropertyOptional({
    description: 'Registros por página.',
    default: TAMANIO_PAGINA_POR_DEFECTO,
    minimum: 1,
    maximum: TAMANIO_PAGINA_MAXIMO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tamaño de página debe ser un número entero.' })
  @Min(1, { message: 'El tamaño de página debe ser al menos 1.' })
  @Max(TAMANIO_PAGINA_MAXIMO, {
    message: `El tamaño de página no puede superar ${TAMANIO_PAGINA_MAXIMO}.`,
  })
  tamanio: number = TAMANIO_PAGINA_POR_DEFECTO;
}

/** Calcula `skip`/`take` de TypeORM. */
export function rangoPagina(consulta: { pagina: number; tamanio: number }): {
  skip: number;
  take: number;
} {
  return {
    skip: (consulta.pagina - 1) * consulta.tamanio,
    take: consulta.tamanio,
  };
}
