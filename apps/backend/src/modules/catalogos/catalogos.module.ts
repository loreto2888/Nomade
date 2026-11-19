import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalogo } from './catalogo.entity.js';
import { CatalogosController } from './catalogos.controller.js';
import { CatalogosRepositorio } from './catalogos.repositorio.js';
import { CatalogosService } from './catalogos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Catalogo])],
  controllers: [CatalogosController],
  providers: [CatalogosRepositorio, CatalogosService],
  exports: [CatalogosRepositorio],
})
export class CatalogosModule {}
