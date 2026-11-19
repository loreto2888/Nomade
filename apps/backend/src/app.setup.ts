import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ErrorResponseDto } from './common/errores/error-response.dto.js';
import { FiltroExcepciones } from './common/errores/filtro-excepciones.js';
import { crearValidationPipe } from './common/errores/validacion.js';
import type { Entorno } from './config/entorno.js';
import { VERSION_APP } from './config/version.js';
import { COOKIE_SESION, PREFIJO_API } from './app.constantes.js';

export { COOKIE_SESION, PREFIJO_API };

/**
 * Configuración HTTP común a `main.ts` y a las pruebas e2e.
 */
export function configurarApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);

  app.setGlobalPrefix(PREFIJO_API);
  // Un proxy delante (Vite en desarrollo, nginx en despliegue).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Mientras se sirva por HTTP (COOKIE_SECURE=false, D-07) no se fuerza HTTPS:
  // sin HSTS ni `upgrade-insecure-requests`, que romperían Swagger UI en dell-pc.
  const https = config.get('COOKIE_SECURE', { infer: true });
  app.use(
    helmet({
      strictTransportSecurity: https,
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: https ? [] : null },
      },
    }),
  );
  app.useGlobalPipes(crearValidationPipe());
  app.useGlobalFilters(new FiltroExcepciones());
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    configurarSwagger(app);
  }
}

function configurarSwagger(app: NestExpressApplication): void {
  const opciones = new DocumentBuilder()
    .setTitle('Nómade API')
    .setDescription(
      'API de la plataforma de gestión financiera de obras Nómade.',
    )
    .setVersion(VERSION_APP)
    .addCookieAuth(
      COOKIE_SESION,
      { type: 'apiKey', in: 'cookie', name: COOKIE_SESION },
      COOKIE_SESION,
    )
    .build();

  const documento = SwaggerModule.createDocument(app, opciones, {
    operationIdFactory: (_controlador: string, metodo: string) => metodo,
    extraModels: [ErrorResponseDto],
  });

  SwaggerModule.setup(`${PREFIJO_API}/docs`, app, documento, {
    jsonDocumentUrl: `${PREFIJO_API}/docs-json`,
    yamlDocumentUrl: `${PREFIJO_API}/docs-yaml`,
  });
}
