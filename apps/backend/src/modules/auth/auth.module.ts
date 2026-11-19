import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AutorizacionGuard } from '../../common/permisos/autorizacion.guard.js';
import { SesionesModule } from '../sesiones/sesiones.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LimiteLoginGuard } from './limite-login.guard.js';
import { SessionGuard } from './session.guard.js';

@Module({
  imports: [
    // Las reglas concretas van en @Throttle de cada endpoint; este es el valor base.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
    SesionesModule,
    UsuariosModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LimiteLoginGuard,
    // El orden importa: primero la sesión, luego roles/permisos.
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AutorizacionGuard },
  ],
})
export class AuthModule {}
