import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { configurarApp } from './app.setup.js';
import { prepararDirectorioAdjuntos } from './config/adjuntos.js';
import { validarEntorno } from './config/entorno.js';

async function bootstrap(): Promise<void> {
  // Falla rápido, antes de cargar Nest, si la configuración es inválida.
  // Igual que ConfigModule: las variables del proceso tienen prioridad sobre .env.
  if (existsSync('.env')) process.loadEnvFile('.env');
  const entorno = validarEntorno(process.env);
  const adjuntos = prepararDirectorioAdjuntos(entorno.ADJUNTOS_DIR);

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configurarApp(app);

  await app.listen(entorno.PORT);
  const logger = app.get(Logger);
  logger.log(`Directorio de adjuntos: ${adjuntos}`);
  logger.log(`Backend Nómade escuchando en el puerto ${entorno.PORT}`);
}

try {
  await bootstrap();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
