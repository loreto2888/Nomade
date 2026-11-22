import { ApiProperty } from '@nestjs/swagger';
import { OrigenMovimiento, TipoMovimiento } from './movimientos.tipos.js';

export class CategoriaGastoResumenDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'subcontratos' })
  codigo: string;

  @ApiProperty({ example: 'Subcontratos' })
  nombre: string;
}

export class MovimientoDto {
  @ApiProperty({ example: 41 })
  id: number;

  @ApiProperty({ example: '2026-11-20', description: 'Fecha contable.' })
  fecha: string;

  @ApiProperty({ enum: TipoMovimiento, enumName: 'TipoMovimiento' })
  tipo: TipoMovimiento;

  @ApiProperty({ enum: OrigenMovimiento, enumName: 'OrigenMovimiento' })
  origenTipo: OrigenMovimiento;

  @ApiProperty({ example: 12 })
  origenId: number;

  @ApiProperty({
    example: 1200000,
    description: 'CLP con signo: las reversas son negativas.',
  })
  montoClp: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Movimiento que esta reversa anula.',
  })
  reversaDeId: number | null;

  @ApiProperty({ example: 'Compromiso OC-000012' })
  descripcion: string;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn: string;
}

export class CompromisoCategoriaDto {
  @ApiProperty({ type: CategoriaGastoResumenDto, nullable: true })
  categoria: CategoriaGastoResumenDto | null;

  @ApiProperty({ example: 12500000 })
  totalClp: number;
}

export class ResumenCompromisosDto {
  @ApiProperty({ example: 1 })
  obraId: number;

  @ApiProperty({
    example: 18700000,
    description:
      'Compromisos vigentes de la obra (OC aprobadas o recibidas, neto de anulaciones), CLP neto.',
  })
  totalClp: number;

  @ApiProperty({ type: [CompromisoCategoriaDto] })
  porCategoria: CompromisoCategoriaDto[];
}
