# seeds-dev — datos ficticios SOLO para desarrollo

Esta carpeta contiene datos **ficticios** para trabajar en local (por ejemplo, las obras de
ejemplo del prototipo: Local Parque Norte, Oficinas Nueva Vista, Tienda Los Robles,
Habilitación Providencia).

- **Nunca** se ejecuta en producción ni en `dell-pc`: la imagen Docker de migraciones no incluye
  esta carpeta (ni el `Dockerfile` la copia ni el `.dockerignore` raíz la deja en el contexto).
- Nunca pongas aquí datos reales, RUT reales ni contraseñas.
- Se aplican con `npm run seed` (desde la raíz: `npm run db:seed`), **después** de `migrate:up`.
- Usan la misma herramienta que las migraciones (node-pg-migrate) pero con su propia tabla de
  control, `nomade.pgseeds`, independiente de `nomade.pgmigrations`. Cada seed se aplica una sola vez.
- Formato: archivos SQL con prefijo de timestamp y secciones `-- Up Migration` / `-- Down Migration`.
  Para crear uno:

  ```sh
  npx node-pg-migrate create -f config/seed.json nombre-del-seed
  ```

  (ejecutado dentro de `apps/migrations`). El `-- Down Migration` debe borrar lo que inserta el up.
- Los archivos `.md` y los que empiezan con punto se ignoran, así que esta carpeta puede no
  tener seeds y `npm run seed` igual termina bien ("No migrations to run!").
- Si un seed depende de tablas nuevas, primero debe existir la migración correspondiente.
  Para volver a cero: `npm run db:reset` en la raíz (borra el volumen) y luego `npm run db:seed`.
