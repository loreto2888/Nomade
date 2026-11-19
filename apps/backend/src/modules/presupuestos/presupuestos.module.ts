import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { ObrasModule } from '../obras/obras.module.js';
import { UfModule } from '../uf/uf.module.js';
import { Partida } from './partida.entity.js';
import { PresupuestoVersion } from './presupuesto-version.entity.js';
import { PresupuestosController } from './presupuestos.controller.js';
import { PresupuestosRepositorio } from './presupuestos.repositorio.js';
import { PresupuestosService } from './presupuestos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PresupuestoVersion, Partida]),
    ObrasModule,
    CatalogosModule,
    UfModule,
  ],
  controllers: [PresupuestosController],
  providers: [PresupuestosRepositorio, PresupuestosService, Reloj],
  exports: [PresupuestosService],
})
export class PresupuestosModule {}
