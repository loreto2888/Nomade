import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { UfController } from './uf.controller.js';
import { UfRepositorio } from './uf.repositorio.js';
import { UfService } from './uf.service.js';
import { ValorUf } from './valor-uf.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ValorUf])],
  controllers: [UfController],
  providers: [UfRepositorio, UfService, Reloj],
  exports: [UfService],
})
export class UfModule {}
