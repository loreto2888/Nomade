# seeds-dev — datos ficticios SOLO para desarrollo

Seeds actuales:

- `1795070000100_maestros-ficticios.sql` — fase 2: 3 clientes, 3 proveedores (uno con una cuenta bancaria
  falsa), valores de la UF alrededor del 19-11-2026 y las 4 obras del prototipo (una de ellas en UF).
  Es idempotente: no duplica si los registros ya existen.
- `1795080000100_presupuesto-ficticio.sql` — fase 3: CC-001 con la versión 1 aprobada y vigente (partidas
  del prototipo) y la versión 2 en borrador; CC-002 con un borrador en UF. Requiere un usuario: arranca el
  backend una vez (crea el administrador inicial) antes de `npm run db:seed`; si no hay usuarios, falla con
  un mensaje claro y no queda marcado como aplicado.

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
