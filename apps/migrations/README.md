# @nomade/migrations

Migraciones de PostgreSQL 18 de la plataforma Nómade, con [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).
Plan de referencia: `docs/plan-implementacion.md` §6.

```
apps/migrations/
├─ config/migrate.json     # configuración de node-pg-migrate para las migraciones
├─ config/seed.json        # igual, pero para seeds-dev/ con la tabla nomade.pgseeds
├─ migrations/             # migraciones SQL con prefijo de timestamp (se publican)
├─ seeds-dev/              # datos ficticios, solo para desarrollo (ver su README)
├─ docker/init-roles.sh    # crea los roles y el esquema al inicializar el contenedor postgres
├─ Dockerfile              # imagen one-shot (contexto de build = raíz del repo)
└─ .env.example            # DATABASE_URL de ejemplo
```

## Base de datos y roles

- Base de datos `nomade`, esquema de aplicación `nomade`. Puerto local 5437 (→ 5432 en el contenedor).
- `docker/init-roles.sh` se monta en `/docker-entrypoint-initdb.d/10-init-roles.sh` del contenedor
  oficial `postgres:18`. **Solo se ejecuta al inicializar un volumen vacío.** Si cambias una contraseña
  después, hazlo con `ALTER ROLE ... PASSWORD` o recrea el volumen (`npm run db:reset` en local).
  Necesita `POSTGRES_USER`, `POSTGRES_DB=nomade`, `NOMADE_OWNER_PASSWORD` y `NOMADE_APP_PASSWORD`,
  y se detiene con un error si falta alguna.

| Rol | Uso | Privilegios |
|---|---|---|
| `nomade_owner` | Migraciones (DDL) | Dueño de la base `nomade` y del esquema `nomade`. Sin superusuario. |
| `nomade_app` | Backend en ejecución (solo DML) | `CONNECT` a la base y `USAGE` sobre el esquema. Puede hacer SELECT/INSERT/UPDATE/DELETE en las tablas, usar las secuencias y ejecutar las funciones que cree `nomade_owner` en `nomade`, gracias a los privilegios por defecto de la migración base. No puede crear, alterar, borrar ni truncar tablas, ni crear tablas temporales, ni leer `pgmigrations`. |
| `PUBLIC` | — | Sin acceso a la base (`REVOKE ALL ON DATABASE`) y sin `CREATE` en `public`. |

Ambos roles tienen `search_path = nomade, public`. Las extensiones (`pgcrypto`, `citext`) quedan en `public`.

Para excepciones como la tabla de auditoría append-only (§6.2), la migración que la crea revoca lo que
sobra; por ejemplo, `REVOKE UPDATE, DELETE ON nomade.auditoria_evento FROM nomade_app;`.

## Conexión

Todo se conecta con la variable `DATABASE_URL` usando el rol **`nomade_owner`**:

| Entorno | `DATABASE_URL` |
|---|---|
| Local (host) | `postgres://nomade_owner:<pwd>@localhost:5437/nomade` |
| Despliegue (red de compose) | `postgres://nomade_owner:<pwd>@postgres:5432/nomade` |

- En local, copia `.env.example` a `apps/migrations/.env`. node-pg-migrate lo carga con `dotenv` y una
  variable ya definida en el entorno tiene prioridad. Los `.env` reales no se commitean.
- **Contraseñas URL-safe**: usa solo letras, dígitos y `-` `.` `_` `~`; por ejemplo, genera una con
  `openssl rand -hex 32`. Si usas otros caracteres (`@ : / ? # % &`…), debes escribirlos con
  percent-encoding en la URL. La contraseña debe ser la misma `NOMADE_OWNER_PASSWORD` con que se
  inicializó el volumen.

## Comandos

Siempre **desde la raíz del repo** (monorepo npm; las dependencias se instalan con `npm install` en la raíz):

| Script raíz | Script del workspace | Qué hace |
|---|---|---|
| `npm run db:migrate` | `migrate:up` | Aplica todas las migraciones pendientes. |
| `npm run db:migrate:down` | `migrate:down` | Revierte **una** migración (la última). |
| `npm run migrate:redo -w apps/migrations` | `migrate:redo` | Revierte la última y la vuelve a aplicar. |
| `npm run db:migration:create -- nombre-descriptivo` | `migrate:create` | Crea `migrations/<timestamp>_nombre-descriptivo.sql`. |
| `npm run db:seed` | `seed` | Aplica `seeds-dev/` (tabla de control `nomade.pgseeds`). **Solo desarrollo.** |

- node-pg-migrate convierte `_` en `-` en el nombre: `prueba_temporal` → `<timestamp>_prueba-temporal.sql`.
- También funcionan desde `apps/migrations` con `npm run <script-del-workspace>`.

La configuración está en `config/migrate.json` y `config/seed.json`:
- esquema `nomade` (`search_path` durante la migración);
- tabla de control `nomade.pgmigrations` (o `nomade.pgseeds` para los seeds);
- archivos SQL con nombre de timestamp;
- `check-order`: falla si aparece una migración más antigua que la última aplicada;
- advisory lock: dos ejecuciones simultáneas no se pisan, y la segunda falla de inmediato.

Por defecto, todas las migraciones pendientes corren en una sola transacción: si una falla, no se
aplica ninguna. Se ignoran los archivos `.md` y los que empiezan con punto.

## Escribir una migración

1. `npm run db:migration:create -- nombre` (en la raíz) y edita el archivo generado:

   ```sql
   -- Up Migration
   CREATE TABLE nomade.obra (...);

   -- Down Migration
   DROP TABLE nomade.obra;
   ```

   El `-- Down Migration` debe revertir exactamente lo que hace el up. Se permite `.ts` si la
   migración necesita lógica: genera el archivo con `db:migration:create`, cambia la extensión a `.ts` y
   exporta `up`/`down` con la API de node-pg-migrate. El archivo de configuración fija `sql` como
   lenguaje, así que el flag `-j` no tiene efecto.
2. Pruébala en local: `npm run db:migrate`, luego `npm run migrate:redo -w apps/migrations` (comprueba el
   down) y `npm run db:migrate` otra vez.
3. Inclúyela en el mismo PR que el código que la usa.

**Una migración publicada (mergeada a `main` o aplicada en un servidor) no se edita ni se borra.**
Cualquier corrección va en una migración nueva. No pongas contraseñas ni datos reales en migraciones.

### Convenciones (plan §6.2)

- Todo en el esquema `nomade`; tablas y columnas en `snake_case`.
- PK `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- Auditoría de fila: `created_at timestamptz NOT NULL DEFAULT now()`, `created_by`, `updated_at`
  y `updated_by`. Mantén `updated_at` con el trigger común:

  ```sql
  CREATE TRIGGER trg_obra_updated_at
    BEFORE UPDATE ON nomade.obra
    FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();
  ```

- `version integer NOT NULL DEFAULT 1` en todo documento editable (control optimista).
- Montos CLP en `numeric(18,0)`; porcentajes en `numeric(7,4)`; IVA parametrizado, no constante.
- Emails y textos sin distinción de mayúsculas en `citext`.
- Crea los objetos siempre como `nomade_owner`, para que `nomade_app` reciba los privilegios por defecto.

## Migración base

`migrations/1795053153867_base.sql` hace lo siguiente:
- crea las extensiones `pgcrypto` y `citext` (son *trusted*, así que las puede crear el dueño de la
  base sin ser superusuario);
- define los privilegios por defecto de `nomade_owner` en `nomade` para `nomade_app`: DML en tablas,
  `USAGE, SELECT` en secuencias y `EXECUTE` en funciones;
- crea la función de trigger `nomade.fn_set_updated_at()`.

No crea tablas de negocio. Su down revierte todo lo anterior.

## Despliegue (`dell-pc`)

`docker-compose.deploy.yml` construye la imagen como el servicio one-shot `migrations`, con el
**contexto de build en la raíz del repo** (`build: { context: ., dockerfile: apps/migrations/Dockerfile }`).
Desde la raíz:

```sh
docker build -f apps/migrations/Dockerfile -t nomade-migrations .
docker run --rm --network <red> -e DATABASE_URL=postgres://nomade_owner:<pwd>@postgres:5432/nomade nomade-migrations
```

- Multi-stage sobre `node:24-alpine`. La etapa `deps` copia solo `package.json`, `package-lock.json` y
  `.npmrc` de la raíz más el `package.json` de cada workspace (`npm ci` valida el lock contra todos), y
  ejecuta `npm ci -w apps/migrations --omit=dev --ignore-scripts`. La etapa final copia ese
  `node_modules` (≈15 MB: node-pg-migrate, pg, dotenv) y de esta carpeta solo `package.json`,
  `config/migrate.json` y `migrations/`.
- Corre como usuario `node` (no root), con `WORKDIR /app/apps/migrations` y comando `npm run migrate:up`.
- Aplica lo pendiente y termina con exit 0, o con 1 si algo falla. Si no hay nada pendiente,
  también termina con 0.
- El backend depende de este servicio con `service_completed_successfully`.
- La imagen **no** incluye `seeds-dev/`, `config/seed.json`, ningún `.env` ni código de otras apps.
  Las exclusiones del contexto están en el `.dockerignore` **de la raíz** (el único del repo para
  imágenes con contexto raíz); los `COPY` explícitos del Dockerfile son la segunda barrera.
- El backend se conecta como `nomade_app` y nunca ejecuta DDL.

Para probar la imagen contra la BD local de desarrollo (red `nomade_default` del compose local):

```sh
docker run --rm --network nomade_default -e DATABASE_URL=postgres://nomade_owner:<pwd>@postgres:5432/nomade nomade-migrations
```
