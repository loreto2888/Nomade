# Despliegue de Nómade en `dell-pc`

Despliegue completo con `docker-compose.deploy.yml`: `postgres` → `migrations` (one-shot) → `backend` → `web` (nginx, puerto `WEB_PORT`, 5178 por defecto) + `backup`.

> ℹ️ **Acceso solo por Cloudflare Tunnel (HTTPS, D-16).** El túnel apunta al puerto `WEB_PORT` (5178). En `.env`: `APP_ORIGIN` = URL https del túnel (`https://nomade.coworlabs.cl`) y `COOKIE_SECURE=true`. El primer administrador se crea al arrancar con `ADMIN_EMAIL`/`ADMIN_PASSWORD` si no hay usuarios (debe cambiar la clave al ingresar).

## Requisitos del servidor

- Linux con **Docker Engine** y el plugin **Docker Compose v2** (`docker compose version`).
- Puerto 5178 libre (o cambiar `WEB_PORT`).
- Salida a internet para `docker pull` y `npm ci` durante el build.
- Acceso al repositorio git.
- Cloudflare Tunnel configurado hacia `http://localhost:5178` (o el `WEB_PORT` elegido).

## Primer despliegue

```sh
git clone <repo> nomade && cd nomade
cp .env.deploy.example .env && chmod 600 .env
# Editar .env: cada contraseña con `openssl rand -hex 24` (URL-safe)
docker compose -f docker-compose.deploy.yml --env-file .env up -d --build
docker compose -f docker-compose.deploy.yml ps
```

La primera vez, postgres ejecuta `apps/migrations/docker/init-roles.sh` (crea `nomade_owner` y `nomade_app`). Ese script **no vuelve a correr** con el volumen ya inicializado: si cambias contraseñas después, usa `ALTER ROLE … PASSWORD …` y actualiza `.env`.

## Actualización

```sh
git pull
docker compose -f docker-compose.deploy.yml --env-file .env up -d --build
```

Las migraciones pendientes se aplican solas; si fallan, el backend no arranca (revisar logs de `migrations`).

## Logs

```sh
docker compose -f docker-compose.deploy.yml logs -f backend
docker compose -f docker-compose.deploy.yml logs migrations
docker compose -f docker-compose.deploy.yml logs backup
```

Rotación: json-file, 10 MB × 5 archivos por contenedor.

## Respaldo

El servicio `backup` (siempre activo) ejecuta `deploy/backup.sh` al arrancar y luego cada `BACKUP_INTERVAL_HOURS` (24 h):

- `nomade-AAAAMMDD-HHMMSS.dump`: `pg_dump -Fc` de la BD `nomade`.
- `adjuntos-AAAAMMDD-HHMMSS.tar.gz`: copia del volumen de adjuntos.
- Borra archivos con más de `BACKUP_RETENTION_DAYS` (30) días.
- Destino: `BACKUP_DIR` (por defecto `./backups`). Idealmente, apúntalo a otro disco o NAS. Los archivos quedan con dueño root.

Respaldo manual inmediato: `docker compose -f docker-compose.deploy.yml restart backup`.

Los roles (`nomade_owner`, `nomade_app`) **no** van en el dump: los crea `init-roles.sh`.

## Restauración

Prueba la restauración antes del corte (plan §13).

```sh
C="docker compose -f docker-compose.deploy.yml --env-file .env"
$C stop web backend backup

# 1) Base de datos (el dump queda visible en /backups dentro del servicio backup)
$C run --rm --no-deps --entrypoint sh backup -c \
  'pg_restore --clean --if-exists --no-owner --role=nomade_owner -d nomade /backups/nomade-AAAAMMDD-HHMMSS.dump'

# 2) Adjuntos (opcional)
$C run --rm --no-deps -v nomade_adjuntos:/restore --entrypoint sh backup -c \
  'rm -rf /restore/* && tar -xzf /backups/adjuntos-AAAAMMDD-HHMMSS.tar.gz -C /restore'

$C up -d
```

Notas:

- `--no-owner --role=nomade_owner` deja los objetos con dueño `nomade_owner`, como los crean las migraciones. Si se restaura en un servidor nuevo, primero hay que levantar `postgres` una vez para que `init-roles.sh` cree los roles.
- Los permisos de `nomade_app` dependen de los `GRANT` y `DEFAULT PRIVILEGES` que definen `init-roles.sh` y las migraciones. Después de restaurar, verifica que el backend responda en `/api/health` y que el login funcione.
- Para restaurar en local (Windows), usa `pg_restore` contra `localhost:5437` con el mismo comando.
