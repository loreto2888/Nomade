import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { ObrasModule } from '../obras/obras.module.js';
import { PresupuestosModule } from '../presupuestos/presupuestos.module.js';
import { ImportacionFila } from './importacion-fila.entity.js';
import { ImportacionLote } from './importacion-lote.entity.js';
import { ImportacionesController } from './importaciones.controller.js';
import { ImportacionesRepositorio } from './importaciones.repositorio.js';
import { ImportacionesService } from './importaciones.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportacionLote, ImportacionFila]),
    ObrasModule,
    CatalogosModule,
    PresupuestosModule,
  ],
  controllers: [ImportacionesController],
  providers: [ImportacionesRepositorio, ImportacionesService, Reloj],
})
export class ImportacionesModule {}
