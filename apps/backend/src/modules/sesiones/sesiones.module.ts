import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sesion } from './sesion.entity.js';
import { SesionesService } from './sesiones.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sesion])],
  providers: [SesionesService],
  exports: [SesionesService],
})
export class SesionesModule {}
