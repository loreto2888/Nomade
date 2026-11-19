import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Variables antes de cargar AppModule (ConfigModule valida al importarse).
// Si se define E2E_DATABASE_URL, también se prueba contra una BD real.
const BD_REAL = process.env.E2E_DATABASE_URL;
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL:
    BD_REAL ?? 'postgres://nomade_app:clave@127.0.0.1:1/nomade_inexistente',
  APP_ORIGIN: 'http://localhost:5177',
  SWAGGER_ENABLED: 'true',
  LOG_LEVEL: 'silent',
});

const { AppModule } = await import('../src/app.module.js');
const { configurarApp } = await import('../src/app.setup.js');
const { ConexionBaseDatos } =
  await import('../src/database/conexion-base-datos.js');

async function crearApp(
  conexion?: Partial<InstanceType<typeof ConexionBaseDatos>>,
) {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (conexion) {
    builder = builder.overrideProvider(ConexionBaseDatos).useValue(conexion);
  }
  const modulo = await builder.compile();
  const app = modulo.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configurarApp(app);
  await app.init();
  return app;
}

describe('API con BD simulada (e2e)', () => {
  let app: NestExpressApplication;
  const verificar = vi.fn<() => Promise<boolean>>();

  beforeAll(async () => {
    app = await crearApp({ verificar });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /api/health → 200 cuando la BD responde', async () => {
    verificar.mockResolvedValueOnce(true);
    const res = await http().get('/api/health').expect(200);

    expect(res.body).toEqual({
      estado: 'ok',
      baseDatos: 'ok',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      fecha: expect.any(String),
    });
    expect(new Date(res.body.fecha).toISOString()).toBe(res.body.fecha);
  });

  it('GET /api/health → 503 cuando la BD falla', async () => {
    verificar.mockResolvedValueOnce(false);
    const res = await http().get('/api/health').expect(503);
    expect(res.body).toMatchObject({ estado: 'error', baseDatos: 'error' });
  });

  it('propaga x-request-id y agrega headers de helmet', async () => {
    verificar.mockResolvedValueOnce(true);
    const res = await http()
      .get('/api/health')
      .set('x-request-id', 'prueba-123')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('prueba-123');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    // HTTP (COOKIE_SECURE=false): no se fuerza HTTPS.
    expect(res.headers['strict-transport-security']).toBeUndefined();
    expect(res.headers['content-security-policy']).not.toContain(
      'upgrade-insecure-requests',
    );
  });

  it('responde errores con el formato ErrorResponse', async () => {
    const res = await http().get('/api/no-existe').expect(404);
    expect(res.body).toEqual({
      codigo: 'NO_ENCONTRADO',
      mensaje: 'El recurso solicitado no existe.',
    });
  });

  it('rechaza con 403 un POST desde otro origen', async () => {
    const res = await http()
      .post('/api/health')
      .set('Origin', 'http://evil.example')
      .expect(403);
    expect(res.body).toEqual({
      codigo: 'ORIGEN_NO_PERMITIDO',
      mensaje: 'El origen de la solicitud no está permitido.',
    });
  });

  it('deja pasar un POST desde APP_ORIGIN o sin Origin', async () => {
    await http()
      .post('/api/health')
      .set('Origin', 'http://localhost:5177')
      .expect(404);
    await http().post('/api/health').expect(404);
    await http()
      .get('/api/health')
      .set('Origin', 'http://evil.example')
      .expect((r) => expect(r.status).not.toBe(403));
  });

  it('GET /api/docs-json expone obtenerSalud con tag salud', async () => {
    const res = await http().get('/api/docs-json').expect(200);
    const doc = res.body;

    expect(doc.info).toMatchObject({ title: 'Nómade API' });
    const operacion = doc.paths['/api/health'].get;
    expect(operacion.operationId).toBe('obtenerSalud');
    expect(operacion.tags).toEqual(['salud']);
    expect(Object.keys(operacion.responses)).toEqual(
      expect.arrayContaining(['200', '503']),
    );
    expect(doc.components.schemas).toHaveProperty('SaludDto');
    expect(doc.components.schemas).toHaveProperty('EstadoSalud');
    expect(doc.components.schemas).toHaveProperty('ErrorResponse');
    expect(doc.components.securitySchemes.nomade_session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'nomade_session',
    });
  });

  it('GET /api/docs sirve Swagger UI', async () => {
    const res = await http().get('/api/docs').expect(200);
    expect(res.text).toContain('swagger');
  });
});

describe('API sin BD disponible (e2e)', () => {
  it.skipIf(BD_REAL)('arranca igual y /api/health responde 503', async () => {
    const app = await crearApp();
    try {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(503);
      expect(res.body).toMatchObject({ estado: 'error', baseDatos: 'error' });
    } finally {
      await app.close();
    }
  });
});

describe.runIf(BD_REAL)('API con BD real (e2e)', () => {
  it('GET /api/health → 200', async () => {
    const app = await crearApp();
    try {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      expect(res.body).toMatchObject({ estado: 'ok', baseDatos: 'ok' });
    } finally {
      await app.close();
    }
  });
});
