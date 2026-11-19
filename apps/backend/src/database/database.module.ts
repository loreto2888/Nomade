import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Entorno } from '../config/entorno.js';
import { ConexionBaseDatos } from './conexion-base-datos.js';

/**
 * TypeORM sobre PostgreSQL. El esquema lo administra exclusivamente
 * apps/migrations: aquí nunca se sincroniza ni se ejecutan migraciones.
 *
 * `manualInitialization: true` evita que Nest bloquee (y luego aborte) el
 * arranque cuando la BD no está disponible; `ConexionBaseDatos` conecta y
 * reintenta en segundo plano, y `/api/health` responde 503 mientras tanto.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Entorno, true>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', { infer: true }),
        schema: 'nomade',
        synchronize: false,
        migrationsRun: false,
        autoLoadEntities: true,
        manualInitialization: true,
        connectTimeoutMS: 5_000,
        applicationName: 'nomade-backend',
        extra: { max: 10 },
      }),
    }),
  ],
  providers: [ConexionBaseDatos],
  exports: [ConexionBaseDatos],
})
export class DatabaseModule {}
