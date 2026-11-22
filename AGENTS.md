# Instrucciones para agentes

## Git

- Hacer commit y push directamente a `main`. No crear ramas ni pull requests salvo que se pida explícitamente.
- «Desarrollo» es la rama `main`: «push a desarrollo» significa push a `main`.
- Mensajes de commit en español (D-18).

## Despliegue (redesplegar)

- El servidor `dell-pc` es esta misma máquina: el despliegue corre desde este directorio (`/home/usuario/nomade`) con el proyecto Docker Compose `nomade` (contenedores `nomade-postgres-1`, `nomade-migrations-1`, `nomade-backend-1`, `nomade-web-1`, `nomade-backup-1`).
- «Redesplegar» = con `main` al día y subido:

  ```sh
  docker compose -f docker-compose.deploy.yml --env-file .env up -d --build
  docker compose -f docker-compose.deploy.yml ps
  ```

  Las migraciones pendientes se aplican solas (servicio `migrations`); revisar `docker compose -f docker-compose.deploy.yml logs migrations` si el backend no arranca. Detalles en `deploy/README.md`.
- No usar `docker compose up` con `docker-compose.yml` (local) en esta máquina: comparte el nombre de proyecto `nomade` con el despliegue. Para probar contra una base de datos, levantar un contenedor PostgreSQL temporal aparte (otro nombre y otro puerto) y detenerlo al terminar.
- El `.env` raíz es el del despliegue (secretos): no leerlo en voz alta, no commitearlo ni modificarlo sin pedirlo.
- No hay Java en el servidor: para `npm run api:generate` usar la imagen `openapitools/openapi-generator-cli:v7.27.0` (misma versión que `apps/frontend/openapitools.json`).
