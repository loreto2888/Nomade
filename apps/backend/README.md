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
| `APP_ORIGIN`      | **obligatoria**   | Origen del frontend, sin barra final: `http://localhost:5177` o la URL https del túnel (`https://nomade.coworlabs.cl`).                                                                                                                                                                                                                        |
| `PORT`            | `3007`            | Puerto HTTP.                                                                                                                                                                                                                                                                                             |
| `NODE_ENV`        | `development`     | `development` \| `production` \| `test`. En `development` los logs se muestran legibles (pino-pretty).                                                                                                                                                                                                   |
| `COOKIE_SECURE`   | `false`           | Ponlo en `true` con HTTPS (en el servidor, siempre). Marca la cookie de sesión como `Secure` y activa HSTS y `upgrade-insecure-requests`.                                                                                                                                                                                                                        |
| `SWAGGER_ENABLED` | `false`           | Expone `/api/docs` y `/api/docs-json`.                                                                                                                                                                                                                                                                   |
| `LOG_LEVEL`       | `info`            | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`.                                                                                                                                                                                                                                |
| `ADJUNTOS_DIR`    | `./data/adjuntos` | Directorio de archivos adjuntos. Se crea al arrancar si no existe; si no se puede crear o escribir, el proceso termina. Una ruta relativa se resuelve contra el directorio de trabajo (`apps/backend` con `npm run dev:backend`, ignorado por git). En la imagen Docker vale `/data/adjuntos` (volumen). |
| `ADMIN_EMAIL`     | —                 | Correo del primer administrador. Se crea al arrancar **solo si no existe ningún usuario**. Se define junto con `ADMIN_PASSWORD` (o ninguna de las dos). |
| `ADMIN_PASSWORD`  | —                 | Contraseña inicial (12 a 128 caracteres). La cuenta queda obligada a cambiarla en el primer ingreso. |
| `ADMIN_NAME`      | `Administrador`   | Nombre del primer administrador. |

## Endpoints

| Ruta                 | Descripción                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`    | Devuelve 200 `{ estado, baseDatos, version, fecha }`. Si `SELECT 1` falla, responde 503 con `estado` y `baseDatos` en `"error"`.                                     |
| `/api/auth/*`        | `POST login`, `POST logout`, `GET sesion`, `POST cambiar-clave`, `PATCH tema`. Solo `login` es público. |
| `/api/usuarios/*`    | CRUD de usuarios, `desactivar`, `activar` y `restablecer-clave` (solo admin). |
| `GET /api/auditoria` | Consulta paginada y filtrable de la bitácora (solo admin). |
| `/api/clientes/*`    | Listado paginado (búsqueda y orden), alta, `PATCH` con `version`, `POST :id/eliminar` (borrado lógico; 422 si tiene obras). |
| `/api/proveedores/*` | Igual que clientes. `GET/POST/PATCH …/:proveedorId/cuentas-bancarias` y `POST …/:cuentaId/eliminar` son **solo admin** y quedan auditados (consulta incluida). |
| `/api/obras/*`       | Listado (búsqueda, estado, cliente, orden), alta, `GET :id`, `GET :id/resumen` (ficha), `PATCH`, `POST :id/eliminar` (solo «en preparación»). |
| `/api/catalogos/:tipo` | `GET` (todos) lista los ítems; `POST`/`PATCH` (solo admin) agregan o editan. Tipos: `estado_obra`, `tipo_documento`, `categoria_gasto`, `familia_partida`. |
| `/api/parametros/*`  | Parámetros con valor vigente, historial y nuevas versiones con vigencia (solo admin). |
| `/api/uf/*`          | `GET valor?fecha=` (todos) valor de la UF aplicable; `GET` lista y `PUT :fecha` carga/corrige (solo admin). |
| `/api/adjuntos/*`    | `GET ?entidadTipo&entidadId`, `POST` (multipart `archivo`), `GET :id/descargar` (requiere sesión) y `POST :id/eliminar`. |
| `GET /api/docs`      | Swagger UI (requiere `SWAGGER_ENABLED=true`).                                                                                                                        |
| `GET /api/docs-json` | Especificación OpenAPI. Desde aquí `openapi-generator-cli` genera el cliente; los `operationId` son los nombres de los métodos, por ejemplo `SaludApi.obtenerSalud`. |

## Comportamiento

- **Base de datos.** El backend nunca ejecuta migraciones ni sincroniza el esquema: de eso se encarga `apps/migrations`. TypeORM se configura con `manualInitialization`, y `ConexionBaseDatos` conecta sin bloquear el arranque. Si la BD no responde, la API arranca igual, `/api/health` responde 503 y se reintenta la conexión cada 5 s. Cuando ya hay conexión, el pool de `pg` se recupera solo de caídas posteriores.
- **Errores.** Todas las respuestas de error tienen la forma `ErrorResponse { codigo, mensaje, detalles? }`, con el mensaje en español y sin stack traces. Para errores propios usa `ErrorAplicacion` (`src/common/errores`).
- **Origen.** Un POST, PUT, PATCH o DELETE con header `Origin` distinto de `APP_ORIGIN` (o sin `Origin` pero con `Sec-Fetch-Site: cross-site`) recibe 403 `ORIGEN_NO_PERMITIDO`.
- **Identidad y acceso (fase 1).** Sesión opaca en BD (token aleatorio en la cookie `httpOnly`, `SameSite=Strict`, `Secure` según `COOKIE_SECURE`; en BD solo su SHA-256): 8 h máximo y 30 min de inactividad. `SessionGuard` global exige sesión salvo en `@Publico()` y, si la cuenta debe cambiar su contraseña, bloquea todo salvo `@PermitirConCambioClave()`. `AutorizacionGuard` aplica `@Roles(...)` y `@RequierePermiso('codigo')` contra el mapa de `src/common/permisos` (admin → todo; usuario → todo salvo administración). Contraseñas con argon2id (`node:crypto`, Node ≥ 24.7), mínimo 12 caracteres; 5 intentos fallidos bloquean la cuenta 15 min (423) y el login tiene límite de tasa por IP (10/min, `@nestjs/throttler`). Los usuarios nunca se eliminan; un admin no puede quitarse el rol ni desactivarse y siempre queda ≥ 1 admin activo (422). Las modificaciones exigen `version` (409 `CONFLICTO_VERSION` con la versión vigente).
- **Auditoría.** `@Auditar({ accion, entidad })` + `AuditoriaInterceptor` registran actor, acción, entidad, id, antes/después sin datos sensibles, motivo, IP y `x-request-id` en `nomade.auditoria_evento` (append-only: `nomade_app` solo puede `INSERT`/`SELECT`). Los servicios aportan antes/después con `ContextoAuditoria`.
- **Maestros y obras (fase 2).** Clientes, proveedores, obras, parámetros, catálogos y adjuntos con `version` (409), borrado lógico (`eliminado_en`; el RUT/centro de costo de un registro eliminado se libera) y bitácora en cada alta, cambio y baja. El RUT se valida con módulo 11 (`src/common/validacion/rut.ts`, y `nomade.fn_rut_valido` en la BD). Los montos de una obra se guardan en su moneda original; en UF el equivalente en CLP es una fotografía con el valor de la UF del día (`src/common/dinero`, aritmética exacta con `BigInt`); si ese día no hay valor se usa el último de hasta 7 días antes y, si no, 422 `UF_NO_DISPONIBLE`. Los parámetros se versionan con inicio de vigencia (`ParametrosService.valorNumerico('iva', fecha)` lo usarán las fases siguientes). Los adjuntos (PDF/JPG/PNG/XLSX/CSV, ≤ 20 MB, D-16) se validan por extensión **y contenido**, se guardan en `ADJUNTOS_DIR` con una clave generada (`AAAA/MM/uuid.ext`) y solo se descargan con sesión.
- **Autoaprobación (D-10).** `puedeAprobar` / `exigirPuedeAprobar` (`src/common/permisos/autoaprobacion.ts`): el `usuario` no aprueba lo que creó; el `admin` sí. Aún no hay documentos aprobables; los usarán las fases 4 en adelante.
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
