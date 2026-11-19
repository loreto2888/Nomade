import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reloj } from '../../common/tiempo/reloj.js';
import { Parametro, ParametroValor } from './parametro.entity.js';
import { ParametrosController } from './parametros.controller.js';
import { ParametrosRepositorio } from './parametros.repositorio.js';
import { ParametrosService } from './parametros.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Parametro, ParametroValor])],
  controllers: [ParametrosController],
  providers: [ParametrosRepositorio, ParametrosService, Reloj],
  exports: [ParametrosService],
})
export class ParametrosModule {}
