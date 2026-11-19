import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ConsultaPaginadaDto } from '../../common/paginacion/pagina.js';
import { EsFechaIso } from '../../common/validacion/es-fecha.decorator.js';

export class ValorUfDto {
  @ApiProperty({
    example: '2026-11-19',
    description: 'Fecha del valor (AAAA-MM-DD).',
  })
  fecha: string;

  @ApiProperty({ example: 39284.87, description: 'Pesos chilenos por UF.' })
  valor: number;
}

export class PaginaValoresUfDto {
  @ApiProperty({ type: [ValorUfDto] })
  items: ValorUfDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 25 })
  tamanio: number;
}

export class ConsultarValorUfDto {
  @ApiPropertyOptional({
    example: '2026-11-19',
    description:
      'Fecha de la conversión (por defecto, hoy en Chile). Si ese día no tiene valor se usa el último anterior de hasta 7 días.',
  })
  @IsOptional()
  @EsFechaIso()
  fecha?: string;
}

export class ListarValoresUfDto extends ConsultaPaginadaDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Desde esta fecha (incluida).',
  })
  @IsOptional()
  @EsFechaIso()
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Hasta esta fecha (incluida).',
  })
  @IsOptional()
  @EsFechaIso()
  hasta?: string;
}

export class GuardarValorUfDto {
  @ApiProperty({
    example: 39284.87,
    description: 'Pesos por UF (hasta 4 decimales).',
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El valor debe ser un número con hasta 4 decimales.' },
  )
  @Min(0.0001, { message: 'El valor debe ser mayor que cero.' })
  @Max(10_000_000, { message: 'El valor es demasiado alto.' })
  valor: number;
}
