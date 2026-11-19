import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaEvento } from './auditoria-evento.entity.js';
import { AuditoriaController } from './auditoria.controller.js';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import { AuditoriaService } from './auditoria.service.js';

/** Global: cualquier módulo puede registrar eventos con `AuditoriaService`. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaEvento])],
  controllers: [AuditoriaController],
  providers: [
    AuditoriaService,
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
