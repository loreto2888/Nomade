# Nómade · backend

API de la plataforma Nómade: NestJS 12 (ESM), TypeScript estricto, TypeORM sobre PostgreSQL 18, logs con pino y contrato OpenAPI con `@nestjs/swagger`.

## Cómo correr

Necesitas Node 24 o superior y PostgreSQL con el esquema `nomade` y el rol `nomade_app`. Ambos los crean `docker compose` y `apps/migrations`. El repo es un monorepo npm: **todo se ejecuta desde la raíz** (un único `package-lock.json`).

```bash
cp apps/backend/.env.example apps/backend/.env   # ajusta DATABASE_URL (rol nomade_app)
npm install                                      # en la raíz
npm run db:up && npm run db:migrate              # PostgreSQL local migrado
npm run dev:backend                              # http://localhost:3007/api
```

Para agregar dependencias: `npm install <paquete> -w apps/backend` (desde la raíz). Los scripts de la tabla se ejecutan con `npm run <script> -w apps/backend`; `build`, `lint`, `typecheck`, `test` y `test:e2e` también corren desde la raíz para todos los workspaces.

| Script                 | Qué hace                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start:dev`            | Modo watch (`nest start --watch`).                                                                                                                         |
| `build` / `start:prod` | Compila a `dist/` (con el plugin de Swagger) y luego ejecuta `node dist/main.js`.                                                                          |
| `lint` / `format`      | ESLint (type-aware) + Prettier. Usa `lint:fix` y `format:check` para corregir o solo verificar.                                                            |
| `typecheck`            | `tsc --noEmit` (incluye las pruebas).                                                                                                                      |
| `test`                 | Pruebas unitarias con Vitest (`src/**/*.spec.ts`).                                                                                                         |
| `test:e2e`             | Pruebas e2e con supertest (`test/**/*.e2e-spec.ts`). Por defecto la BD está simulada. Si defines `E2E_DATABASE_URL`, además se prueban contra una BD real. |

Las pruebas usan **Vitest**, no Jest, porque Nest 12 se publica solo como ESM y Vitest es el runner por defecto de su CLI.

## Variables de entorno

Se validan con zod al arrancar. Si falta alguna o es inválida, el proceso termina con un mensaje en español. El archivo `.env` es opcional, y las variables del proceso tienen prioridad sobre él.

| Variable          | Por defecto       | Descripción                                                                                                                                                                                                                                                                                              |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | **obligatoria**   | `postgres://nomade_app:<pwd>@localhost:5437/nomade` (en despliegue, `@postgres:5432`).                                                                                                                                                                                                                   |
| `APP_ORIGIN`      | **obligatoria**   | Origen del frontend, sin barra final: `http://localhost:5177` o `http://dell-pc`.                                                                                                                                                                                                                        |
| `PORT`            | `3007`            | Puerto HTTP.                                                                                                                                                                                                                                                                                             |
| `NODE_ENV`        | `development`     | `development` \| `production` \| `test`. En `development` los logs se muestran legibles (pino-pretty).                                                                                                                                                                                                   |
| `COOKIE_SECURE`   | `false`           | Ponlo en `true` solo con HTTPS. Además activa HSTS y `upgrade-insecure-requests`.                                                                                                                                                                                                                        |
| `SWAGGER_ENABLED` | `false`           | Expone `/api/docs` y `/api/docs-json`.                                                                                                                                                                                                                                                                   |
| `LOG_LEVEL`       | `info`            | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`.                                                                                                                                                                                                                                |
| `ADJUNTOS_DIR`    | `./data/adjuntos` | Directorio de archivos adjuntos. Se crea al arrancar si no existe; si no se puede crear o escribir, el proceso termina. Una ruta relativa se resuelve contra el directorio de trabajo (`apps/backend` con `npm run dev:backend`, ignorado por git). En la imagen Docker vale `/data/adjuntos` (volumen). |

## Endpoints

| Ruta                 | Descripción                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`    | Devuelve 200 `{ estado, baseDatos, version, fecha }`. Si `SELECT 1` falla, responde 503 con `estado` y `baseDatos` en `"error"`.                                     |
| `GET /api/docs`      | Swagger UI (requiere `SWAGGER_ENABLED=true`).                                                                                                                        |
| `GET /api/docs-json` | Especificación OpenAPI. Desde aquí `openapi-generator-cli` genera el cliente; los `operationId` son los nombres de los métodos, por ejemplo `SaludApi.obtenerSalud`. |

## Comportamiento

- **Base de datos.** El backend nunca ejecuta migraciones ni sincroniza el esquema: de eso se encarga `apps/migrations`. TypeORM se configura con `manualInitialization`, y `ConexionBaseDatos` conecta sin bloquear el arranque. Si la BD no responde, la API arranca igual, `/api/health` responde 503 y se reintenta la conexión cada 5 s. Cuando ya hay conexión, el pool de `pg` se recupera solo de caídas posteriores.
- **Errores.** Todas las respuestas de error tienen la forma `ErrorResponse { codigo, mensaje, detalles? }`, con el mensaje en español y sin stack traces. Para errores propios usa `ErrorAplicacion` (`src/common/errores`).
- **Origen.** Un POST, PUT, PATCH o DELETE con header `Origin` distinto de `APP_ORIGIN` recibe 403 `ORIGEN_NO_PERMITIDO`.
- **Logs.** Se escriben en JSON a stdout con el id de correlación `x-request-id`: se reutiliza el que llega en la petición o se genera uno, y se devuelve en la respuesta. Las cookies y el header `authorization` se ocultan, y no se registran las peticiones a `/api/health`.
- **Proxy.** Se configura `trust proxy = 1`, porque delante hay un proxy (Vite en desarrollo, nginx en despliegue). Por eso no hay CORS.

## Docker

La imagen se construye con el **contexto en la raíz** del repo; aplica solo el `.dockerignore` de la raíz:

```bash
docker build -f apps/backend/Dockerfile -t nomade-backend .
docker run --rm -p 3007:3007 --network nomade_default   -e DATABASE_URL=postgres://nomade_app:<pwd>@postgres:5432/nomade   -e APP_ORIGIN=http://localhost:5177   -v nomade_adjuntos:/data/adjuntos nomade-backend
```

- Etapas sobre `node:24-alpine`: `deps` (todas las dependencias) → `build` (`nest build`) → `prod-deps` (`npm ci -w apps/backend --omit=dev`) → `runtime`.
- La imagen final solo contiene `/app/node_modules` de producción, `package.json` y `apps/backend/dist`. No incluye `.env`, tests, código fuente ni otras apps.
- Corre como `node`, expone el puerto 3007 y ejecuta `node apps/backend/dist/main.js` desde `/app`. Define `NODE_ENV=production`, `PORT=3007` y `ADJUNTOS_DIR=/data/adjuntos`.
- `/data/adjuntos` pertenece a `node` dentro de la imagen, así que un volumen nombrado nuevo hereda ese dueño. Con un _bind mount_ el directorio del host debe ser escribible por el UID 1000.
- `HEALTHCHECK` con `wget` contra `/api/health`.
- En `docker-compose.deploy.yml`: `build: { context: ., dockerfile: apps/backend/Dockerfile }`, volumen `adjuntos:/data/adjuntos`.
