import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { ObrasModule } from '../obras/obras.module.js';
import { Movimiento } from './movimiento.entity.js';
import { MovimientosController } from './movimientos.controller.js';
import { MovimientosRepositorio } from './movimientos.repositorio.js';
import { MovimientosService } from './movimientos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movimiento]),
    ObrasModule,
    CatalogosModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosRepositorio, MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
