-- Up Migration

-- Fase 1 — Identidad y acceso: usuarios, sesiones y bitácora de auditoría.
-- Se ejecuta como nomade_owner. Los privilegios por defecto de la migración base
-- otorgan SELECT/INSERT/UPDATE/DELETE a nomade_app sobre las tablas nuevas;
-- aquí se restringen donde corresponde (auditoría append-only).

-- ---------------------------------------------------------------------------
-- usuario
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.usuario (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correo             public.citext NOT NULL,
  nombre             text        NOT NULL,
  rol                text        NOT NULL,
  clave_hash         text        NOT NULL,
  activo             boolean     NOT NULL DEFAULT true,
  debe_cambiar_clave boolean     NOT NULL DEFAULT true,
  intentos_fallidos  integer     NOT NULL DEFAULT 0,
  bloqueado_hasta    timestamptz,
  clave_cambiada_en  timestamptz,
  ultimo_acceso_en   timestamptz,
  tema               text        NOT NULL DEFAULT 'claro',
  version            integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         bigint REFERENCES nomade.usuario (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_usuario_rol CHECK (rol IN ('admin', 'usuario')),
  CONSTRAINT ck_usuario_tema CHECK (tema IN ('claro', 'oscuro')),
  CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos >= 0),
  CONSTRAINT ck_usuario_nombre CHECK (length(btrim(nombre)) >= 2)
);

-- citext: la unicidad ignora mayúsculas/minúsculas.
CREATE UNIQUE INDEX ux_usuario_correo ON nomade.usuario (correo);
CREATE INDEX ix_usuario_rol_activo ON nomade.usuario (rol) WHERE activo;

CREATE TRIGGER trg_usuario_updated_at
  BEFORE UPDATE ON nomade.usuario
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.usuario IS 'Cuentas de la plataforma. Nunca se eliminan: solo se desactivan (D-11).';
COMMENT ON COLUMN nomade.usuario.clave_hash IS 'Hash argon2id en formato PHC.';
COMMENT ON COLUMN nomade.usuario.tema IS 'Preferencia de tema de la interfaz: claro | oscuro (D-12).';

-- ---------------------------------------------------------------------------
-- sesion
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.sesion (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id            bigint      NOT NULL REFERENCES nomade.usuario (id),
  token_hash            text        NOT NULL,
  creada_en             timestamptz NOT NULL DEFAULT now(),
  expira_en             timestamptz NOT NULL,
  ultima_actividad_en   timestamptz NOT NULL DEFAULT now(),
  revocada_en           timestamptz,
  ip                    text,
  agente_usuario        text,
  CONSTRAINT ck_sesion_expira CHECK (expira_en > creada_en)
);

-- El token opaco solo existe en la cookie; en la BD se guarda su SHA-256.
CREATE UNIQUE INDEX ux_sesion_token_hash ON nomade.sesion (token_hash);
CREATE INDEX ix_sesion_usuario_activa ON nomade.sesion (usuario_id) WHERE revocada_en IS NULL;
CREATE INDEX ix_sesion_expira_en ON nomade.sesion (expira_en);

COMMENT ON TABLE nomade.sesion IS 'Sesiones opacas: 8 h máximo y 30 min de inactividad (D-11).';

-- ---------------------------------------------------------------------------
-- auditoria_evento (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.auditoria_evento (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ocurrido_en     timestamptz NOT NULL DEFAULT now(),
  usuario_id      bigint REFERENCES nomade.usuario (id),
  -- Copia del actor al momento del evento (el nombre/correo pueden cambiar).
  usuario_correo  text,
  usuario_nombre  text,
  accion          text        NOT NULL,
  entidad         text        NOT NULL,
  entidad_id      text,
  antes           jsonb,
  despues         jsonb,
  motivo          text,
  ip              text,
  id_correlacion  text,
  CONSTRAINT ck_auditoria_accion CHECK (length(accion) > 0),
  CONSTRAINT ck_auditoria_entidad CHECK (length(entidad) > 0)
);

CREATE INDEX ix_auditoria_ocurrido_en ON nomade.auditoria_evento (ocurrido_en DESC, id DESC);
CREATE INDEX ix_auditoria_usuario ON nomade.auditoria_evento (usuario_id, ocurrido_en DESC);
CREATE INDEX ix_auditoria_entidad ON nomade.auditoria_evento (entidad, entidad_id);
CREATE INDEX ix_auditoria_accion ON nomade.auditoria_evento (accion);

-- Append-only real: la aplicación solo puede insertar y consultar.
REVOKE UPDATE, DELETE, TRUNCATE ON nomade.auditoria_evento FROM nomade_app;

-- Defensa adicional: ni siquiera un UPDATE/DELETE de otro rol modifica la bitácora.
CREATE FUNCTION nomade.fn_auditoria_inmutable()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora de auditoría es de solo anexado (append-only).'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON nomade.auditoria_evento
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_auditoria_inmutable();

COMMENT ON TABLE nomade.auditoria_evento IS 'Bitácora de auditoría append-only: actor, acción, entidad, antes/después, motivo, IP.';

-- Down Migration

DROP TABLE nomade.auditoria_evento;
DROP FUNCTION nomade.fn_auditoria_inmutable();
DROP TABLE nomade.sesion;
DROP TABLE nomade.usuario;
