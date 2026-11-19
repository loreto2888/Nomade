-- Up Migration

-- Migración base de Nómade.
-- Requisitos (los crea docker/init-roles.sh al inicializar PostgreSQL):
--   * roles nomade_owner (dueño de la BD y del esquema) y nomade_app (solo DML);
--   * esquema nomade (AUTHORIZATION nomade_owner).
-- Se ejecuta como nomade_owner. No crea tablas de negocio.

-- Extensiones. pgcrypto y citext son "trusted" desde PostgreSQL 13: las puede
-- crear el dueño de la base sin ser superusuario. Quedan en public (incluido en
-- el search_path de ambos roles) para no mezclar sus objetos con los de la app.
CREATE EXTENSION pgcrypto WITH SCHEMA public;
CREATE EXTENSION citext WITH SCHEMA public;

-- Privilegios por defecto: todo objeto que nomade_owner cree en el esquema
-- nomade a partir de ahora queda accesible para nomade_app (solo DML, sin DDL).
ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nomade_app;

ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  GRANT USAGE, SELECT ON SEQUENCES TO nomade_app;

ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  GRANT EXECUTE ON FUNCTIONS TO nomade_app;

-- Función de trigger común: mantiene updated_at en cada UPDATE.
-- Uso en tablas futuras:
--   CREATE TRIGGER trg_<tabla>_updated_at
--     BEFORE UPDATE ON nomade.<tabla>
--     FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();
CREATE FUNCTION nomade.fn_set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION nomade.fn_set_updated_at() IS
  'Trigger BEFORE UPDATE: asigna updated_at = now().';

-- Down Migration

DROP FUNCTION nomade.fn_set_updated_at();

ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  REVOKE EXECUTE ON FUNCTIONS FROM nomade_app;

ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  REVOKE USAGE, SELECT ON SEQUENCES FROM nomade_app;

ALTER DEFAULT PRIVILEGES FOR ROLE nomade_owner IN SCHEMA nomade
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM nomade_app;

DROP EXTENSION citext;
DROP EXTENSION pgcrypto;
