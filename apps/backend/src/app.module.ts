import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { OrigenMiddleware } from './common/seguridad/origen.middleware.js';
import { validarEntorno, type Entorno } from './config/entorno.js';
import { crearConfigLogger } from './config/logger.config.js';
import { DatabaseModule } from './database/database.module.js';
import { SaludModule } from './modules/salud/salud.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // En pruebas no se lee .env: las variables las define cada test.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      envFilePath: ['.env'],
      validate: validarEntorno,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Entorno, true>) =>
        crearConfigLogger({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
        }),
    }),
    DatabaseModule,
    SaludModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(OrigenMiddleware).forRoutes('{*ruta}');
  }
}
