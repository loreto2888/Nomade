import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adjunto } from './adjunto.entity.js';
import { AlmacenArchivos, AlmacenLocal } from './almacen-archivos.js';
import { AdjuntosController } from './adjuntos.controller.js';
import { AdjuntosRepositorio } from './adjuntos.repositorio.js';
import { AdjuntosService } from './adjuntos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Adjunto])],
  controllers: [AdjuntosController],
  providers: [
    AdjuntosRepositorio,
    AdjuntosService,
    { provide: AlmacenArchivos, useClass: AlmacenLocal },
  ],
  exports: [AdjuntosService],
})
export class AdjuntosModule {}
