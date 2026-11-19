#!/bin/sh
# Inicialización de roles y esquema de Nómade.
#
# Lo ejecuta el entrypoint de la imagen oficial postgres UNA sola vez, al
# inicializar un volumen vacío (montado en /docker-entrypoint-initdb.d/).
# Si el volumen ya existe, este script no se vuelve a ejecutar.
#
# Variables requeridas:
#   POSTGRES_USER, POSTGRES_DB    (las define la imagen / compose; POSTGRES_DB=nomade)
#   NOMADE_OWNER_PASSWORD         contraseña del rol nomade_owner (migraciones, DDL)
#   NOMADE_APP_PASSWORD           contraseña del rol nomade_app   (backend, solo DML)
set -e

init_roles_fail() {
  echo "init-roles.sh: ERROR: $1" >&2
  exit 1
}

[ -n "${POSTGRES_USER:-}" ] || init_roles_fail "falta la variable POSTGRES_USER"
[ -n "${POSTGRES_DB:-}" ] || init_roles_fail "falta la variable POSTGRES_DB (debe ser 'nomade')"
[ -n "${NOMADE_OWNER_PASSWORD:-}" ] || init_roles_fail "falta la variable NOMADE_OWNER_PASSWORD"
[ -n "${NOMADE_APP_PASSWORD:-}" ] || init_roles_fail "falta la variable NOMADE_APP_PASSWORD"

echo "init-roles.sh: creando roles nomade_owner / nomade_app y esquema nomade en la base '${POSTGRES_DB}'"

# Las contraseñas y el nombre de la base viajan como variables de psql
# (:'var' = literal, :"var" = identificador), así que los caracteres especiales
# no rompen el SQL. El heredoc va entre comillas: el shell no expande nada.
psql -v ON_ERROR_STOP=1 \
  --no-psqlrc \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v owner_password="$NOMADE_OWNER_PASSWORD" \
  -v app_password="$NOMADE_APP_PASSWORD" <<'EOSQL'
CREATE ROLE nomade_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'owner_password';
CREATE ROLE nomade_app   LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';

ALTER DATABASE :"db" OWNER TO nomade_owner;

REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO nomade_owner, nomade_app;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA nomade AUTHORIZATION nomade_owner;
GRANT USAGE ON SCHEMA nomade TO nomade_app;

ALTER ROLE nomade_owner SET search_path = nomade, public;
ALTER ROLE nomade_app   SET search_path = nomade, public;
EOSQL

echo "init-roles.sh: listo"
