#!/bin/sh
# Respaldo periódico de Nómade (corre dentro del servicio `backup`, imagen postgres:18).
#  - pg_dump -Fc de la BD (PGHOST/PGUSER/PGPASSWORD/PGDATABASE vienen del compose)
#  - tar.gz de los adjuntos (ADJUNTOS_SRC, montado de solo lectura), si existe
#  - borra respaldos con más de BACKUP_RETENTION_DAYS días
#  - repite cada BACKUP_INTERVAL_HOURS horas
set -u

BACKUP_DIR="${BACKUP_DIR:-/backups}"
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ADJUNTOS_SRC="${ADJUNTOS_SRC:-/adjuntos}"
DB="${PGDATABASE:-nomade}"

log() { echo "[backup] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

run_backup() {
  ts="$(date '+%Y%m%d-%H%M%S')"
  dump="$BACKUP_DIR/${DB}-${ts}.dump"

  log "pg_dump de '$DB' -> $dump"
  if pg_dump -Fc -d "$DB" -f "$dump.partial"; then
    mv "$dump.partial" "$dump"
    log "OK BD ($(du -h "$dump" | cut -f1))"
  else
    rm -f "$dump.partial"
    log "ERROR: pg_dump falló"
  fi

  if [ -d "$ADJUNTOS_SRC" ]; then
    adj="$BACKUP_DIR/adjuntos-${ts}.tar.gz"
    if tar -czf "$adj.partial" -C "$ADJUNTOS_SRC" .; then
      mv "$adj.partial" "$adj"
      log "OK adjuntos ($(du -h "$adj" | cut -f1))"
    else
      rm -f "$adj.partial"
      log "ERROR: respaldo de adjuntos falló"
    fi
  fi

  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name "${DB}-*.dump" -o -name 'adjuntos-*.tar.gz' \) \
    -mtime +"$RETENTION_DAYS" -print -delete | sed 's/^/[backup] eliminado /'
}

mkdir -p "$BACKUP_DIR"
log "iniciado: cada ${INTERVAL_HOURS} h, retención ${RETENTION_DAYS} días, destino $BACKUP_DIR"

# Espera a que la BD acepte conexiones (depends_on ya exige healthy).
until pg_isready -q; do sleep 5; done

while true; do
  run_backup
  sleep "$((INTERVAL_HOURS * 3600))"
done
