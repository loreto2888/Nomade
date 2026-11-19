import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../database/database.module.js';
import { SesionesModule } from '../sesiones/sesiones.module.js';
import { AdminInicialService } from './admin-inicial.service.js';
import { Usuario } from './usuario.entity.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosRepositorio } from './usuarios.repositorio.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    SesionesModule,
    DatabaseModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosRepositorio, UsuariosService, AdminInicialService],
  exports: [UsuariosRepositorio],
})
export class UsuariosModule {}
