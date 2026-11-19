import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { ClientesModule } from '../clientes/clientes.module.js';
import { UfModule } from '../uf/uf.module.js';
import { Obra } from './obra.entity.js';
import { ObrasController } from './obras.controller.js';
import { ObrasRepositorio } from './obras.repositorio.js';
import { ObrasService } from './obras.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Obra]),
    ClientesModule,
    CatalogosModule,
    UfModule,
  ],
  controllers: [ObrasController],
  providers: [ObrasRepositorio, ObrasService, Reloj],
  exports: [ObrasRepositorio],
})
export class ObrasModule {}
