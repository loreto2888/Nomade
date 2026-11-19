# Nómade

Plataforma web de administración y control financiero de obras de Constructora Nómade (obras, presupuestos, compras, pagos, ingresos, costos, conciliación y cierres). Monorepo con npm workspaces.

- Plan técnico: [`docs/plan-implementacion.md`](docs/plan-implementacion.md)
- Despliegue en el servidor `dell-pc`: [`deploy/README.md`](deploy/README.md)
- Prototipo navegable (referencia visual): [`apps/prototipo/README.md`](apps/prototipo/README.md)

## Requisitos

- Node.js 24 o superior (`.nvmrc`) y npm 11 o superior.
- Docker con Compose v2 (PostgreSQL local).
- Java 17 o superior, solo para `npm run api:generate`.
- Puertos libres: 5437 (PostgreSQL), 3007 (backend) y 5177 (frontend).

## Estructura

```
apps/
  backend/      API NestJS + TypeORM               (workspace)
  frontend/     React + Vite + MUI                 (workspace)
  migrations/   node-pg-migrate: esquema y seeds   (workspace)
  prototipo/    prototipo navegable antiguo        (fuera de los workspaces; lockfile propio)
deploy/         backup y guía de despliegue
docs/           plan y propuesta
docker-compose.yml          PostgreSQL local (proyecto "nomade")
docker-compose.deploy.yml   despliegue completo en dell-pc
```

Un solo `package-lock.json` en la raíz para los tres workspaces.

## Primer arranque

1. Copiar los archivos de entorno y reemplazar los placeholders. Las contraseñas deben ser URL-safe, por ejemplo `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`, y deben **coincidir** entre los tres archivos:

   | Copiar | a | Contenido |
   |---|---|---|
   | `.env.example` | `.env` | contraseñas de PostgreSQL local (`postgres`, `nomade_owner`, `nomade_app`) |
   | `apps/migrations/.env.example` | `apps/migrations/.env` | `DATABASE_URL` con `nomade_owner` |
   | `apps/backend/.env.example` | `apps/backend/.env` | `DATABASE_URL` con `nomade_app`, `APP_ORIGIN`, Swagger, `ADJUNTOS_DIR` (opcional) |
   | `apps/frontend/.env.example` | `apps/frontend/.env` | opcional (destino del proxy `/api`) |

2. Instalar dependencias y arrancar todo:

   ```sh
   npm install
   npm run full
   ```

   `full` levanta PostgreSQL y espera el healthcheck, aplica las migraciones y luego inicia el backend (http://localhost:3007, Swagger en `/api/docs`) y el frontend (http://localhost:5177) con `concurrently -k`: si uno de los dos termina, se detiene el otro. La tarjeta «Estado del sistema» de Inicio debe mostrar **API: OK** y **Base de datos: OK**. La base de datos sigue corriendo al salir; se detiene con `npm run db:down`.

Las dependencias se agregan siempre desde la raíz: `npm install <paquete> -w apps/<app>`.

## Cliente API (OpenAPI)

El frontend usa un cliente `typescript-axios` generado desde el Swagger del backend y **versionado** en `apps/frontend/src/api/generated`. Cuando cambie un controlador o DTO del backend:

```sh
npm run dev:backend      # terminal 1 (Swagger habilitado en apps/backend/.env)
npm run api:generate     # terminal 2, desde la raíz
```

Commitea `apps/frontend/src/api/generated` **en el mismo commit** que el cambio del backend. La generación es determinista (sin cambios en el backend no hay diff). Detalles: [`apps/frontend/README.md`](apps/frontend/README.md#cliente-api-generado).

## Scripts raíz

| Script | Qué hace |
|---|---|
| `full` | `db:up` → `db:migrate` → backend + frontend en paralelo |
| `dev:backend` / `dev:frontend` | solo uno de los dos, en modo watch |
| `db:up` / `db:down` | levanta o detiene PostgreSQL local |
| `db:migrate` / `db:migrate:down` | aplica todas las migraciones o revierte la última |
| `db:migration:create -- <nombre>` | crea una migración SQL nueva |
| `db:seed` | carga los datos ficticios de `apps/migrations/seeds-dev` (solo local) |
| `db:reset` | **borra el volumen** y recrea la BD con las migraciones |
| `api:generate` | regenera el cliente OpenAPI del frontend (requiere el backend corriendo) |
| `prototipo` | inicia el prototipo antiguo (http://localhost:3000) |
| `build` / `lint` / `typecheck` / `test` / `test:e2e` | se ejecutan en todos los workspaces que tengan el script |

Los archivos `.env` reales nunca se versionan.

## Migraciones

Todo desde la raíz, contra la BD local (`localhost:5437`, rol `nomade_owner` de `apps/migrations/.env`):

```sh
npm run db:migrate                         # aplica las pendientes
npm run db:migrate:down                    # revierte la última
npm run db:migration:create -- nombre      # crea apps/migrations/migrations/<timestamp>_nombre.sql
npm run db:seed                            # datos ficticios de seeds-dev (solo local)
```

Convenciones, roles y detalles: [`apps/migrations/README.md`](apps/migrations/README.md).

## Imágenes Docker

Todas las imágenes se construyen con el **contexto en la raíz** del repo (un único `package-lock.json`) y el Dockerfile de cada app:

```sh
docker build -f apps/migrations/Dockerfile -t nomade-migrations .
docker build -f apps/backend/Dockerfile    -t nomade-backend .
docker build -f apps/frontend/Dockerfile   -t nomade-frontend .
```

El `.dockerignore` de la raíz es el único que aplica: excluye `.git`, todos los `node_modules`, `dist`, `coverage`, `.env*`, logs, `apps/prototipo`, `docs`, `deploy`, `data`, `backups` y `apps/migrations/seeds-dev`. Cada Dockerfile copia solo lo que necesita. `docker-compose.deploy.yml` usa `build: { context: ., dockerfile: apps/<app>/Dockerfile }` en `migrations`, `backend` y `web`.

## Despliegue

En el servidor `dell-pc` (Linux, Docker Compose v2), desde el repo clonado:

```sh
cp .env.deploy.example .env && chmod 600 .env      # cambiar TODAS las contraseñas
docker compose -f docker-compose.deploy.yml --env-file .env up -d --build --wait
```

Orden: `postgres` (healthy) → `migrations` (exit 0) → `backend` (healthy) → `web` (nginx, puerto `WEB_PORT`, por defecto 80) + `backup` (dump diario). Swagger queda deshabilitado (`/api/docs-json` → 404). Actualización, logs, respaldo y restauración: [`deploy/README.md`](deploy/README.md).

Para probar el despliegue en una máquina de desarrollo sin chocar con el entorno local, usa otro nombre de proyecto y otro puerto (p. ej. `-p nomade-deploycheck`, `WEB_PORT=58081`, `BACKUP_DIR` en una carpeta temporal) y termina con `down -v --rmi local`.
