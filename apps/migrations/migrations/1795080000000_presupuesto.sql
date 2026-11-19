-- Up Migration

-- Fase 3 — Presupuesto: versiones de presupuesto por obra, partidas e importación masiva con
-- previsualización (lote + filas). Se ejecuta como nomade_owner; los privilegios por defecto de la
-- migración base otorgan SELECT/INSERT/UPDATE/DELETE a nomade_app sobre las tablas nuevas.
--
-- Convenciones (plan §6.2, D-13): PK bigint identity, snake_case, auditoría created_*/updated_*,
-- `version` para el control optimista. Montos CLP en numeric(18,0) y UF en numeric(18,4).

-- ---------------------------------------------------------------------------
-- importacion_lote / importacion_fila: carga masiva (P24) con previsualización.
-- Se crean antes que el presupuesto porque una versión puede nacer de un lote confirmado.
-- `tipo` hoy solo admite 'presupuesto'; los demás tipos del prototipo (proveedores, movimientos)
-- ampliarán `ck_importacion_lote_tipo` en su fase.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.importacion_lote (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo                  text        NOT NULL,
  estado                text        NOT NULL DEFAULT 'previsualizado',
  -- Obra de destino (en los lotes de presupuestos es obligatoria).
  obra_id               bigint      REFERENCES nomade.obra (id),
  nombre_archivo        text        NOT NULL,
  tamanio_bytes         bigint      NOT NULL,
  sha256                text        NOT NULL,
  total_filas           integer     NOT NULL,
  filas_validas         integer     NOT NULL,
  filas_con_error       integer     NOT NULL,
  -- Suma de los totales de las filas válidas, en la moneda de la obra (referencial para la vista previa).
  monto_total           numeric(18, 4) NOT NULL DEFAULT 0,
  moneda                text,
  -- Versión de presupuesto creada al confirmar.
  presupuesto_version_id bigint,
  confirmado_en         timestamptz,
  confirmado_por        bigint REFERENCES nomade.usuario (id),
  descartado_en         timestamptz,
  descartado_por        bigint REFERENCES nomade.usuario (id),
  version               integer     NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            bigint REFERENCES nomade.usuario (id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_importacion_lote_tipo CHECK (tipo IN ('presupuesto')),
  CONSTRAINT ck_importacion_lote_estado CHECK (estado IN ('previsualizado', 'confirmado', 'descartado')),
  CONSTRAINT ck_importacion_lote_obra CHECK (tipo <> 'presupuesto' OR obra_id IS NOT NULL),
  CONSTRAINT ck_importacion_lote_moneda CHECK (moneda IS NULL OR moneda IN ('CLP', 'UF')),
  CONSTRAINT ck_importacion_lote_conteos CHECK (
    total_filas >= 0 AND filas_validas >= 0 AND filas_con_error >= 0
    AND filas_validas + filas_con_error = total_filas
  ),
  CONSTRAINT ck_importacion_lote_confirmado CHECK (
    (estado = 'confirmado') = (confirmado_en IS NOT NULL AND confirmado_por IS NOT NULL AND presupuesto_version_id IS NOT NULL)
  ),
  CONSTRAINT ck_importacion_lote_descartado CHECK (
    (estado = 'descartado') = (descartado_en IS NOT NULL AND descartado_por IS NOT NULL)
  ),
  -- Solo un lote sin errores se puede confirmar.
  CONSTRAINT ck_importacion_lote_sin_errores CHECK (estado <> 'confirmado' OR filas_con_error = 0)
);

CREATE INDEX ix_importacion_lote_obra ON nomade.importacion_lote (obra_id, created_at DESC);
CREATE INDEX ix_importacion_lote_creado ON nomade.importacion_lote (created_at DESC, id DESC);

CREATE TRIGGER trg_importacion_lote_updated_at
  BEFORE UPDATE ON nomade.importacion_lote
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.importacion_lote IS 'Carga masiva desde Excel/CSV (P24, solo admin): se previsualiza, se valida fila a fila y se confirma o descarta.';

CREATE TABLE nomade.importacion_fila (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lote_id      bigint      NOT NULL REFERENCES nomade.importacion_lote (id),
  -- Número de fila en la planilla original (la primera fila de datos suele ser la 2).
  numero_fila  integer     NOT NULL,
  -- Valores tal como se leyeron del archivo (texto o número); se vuelven a validar al confirmar.
  datos        jsonb       NOT NULL,
  valida       boolean     NOT NULL,
  -- [{ "campo": "cantidad", "mensaje": "…" }]
  errores      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_importacion_fila_lote_numero UNIQUE (lote_id, numero_fila),
  CONSTRAINT ck_importacion_fila_numero CHECK (numero_fila >= 1),
  CONSTRAINT ck_importacion_fila_errores CHECK (
    jsonb_typeof(errores) = 'array' AND valida = (jsonb_array_length(errores) = 0)
  )
);

CREATE INDEX ix_importacion_fila_lote ON nomade.importacion_fila (lote_id, numero_fila);
CREATE INDEX ix_importacion_fila_lote_errores ON nomade.importacion_fila (lote_id, numero_fila) WHERE NOT valida;

COMMENT ON TABLE nomade.importacion_fila IS 'Filas de un lote de importación con su validación. Solo se escriben al previsualizar.';

-- ---------------------------------------------------------------------------
-- presupuesto_version: una versión del presupuesto de una obra.
--
-- Estados: borrador → en_revision → aprobado | rechazado. Una versión aprobada es inmutable (un
-- cambio requiere una versión nueva, copiada de la vigente). `vigente` marca la ÚNICA versión
-- aprobada que rige hoy la obra: al aprobar otra, la anterior sigue «aprobada» (historial) pero
-- deja de ser vigente. Los borradores se eliminan lógicamente (D-13); el resto nunca.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.presupuesto_version (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  obra_id                bigint      NOT NULL REFERENCES nomade.obra (id),
  -- Correlativo por obra (1, 2, 3…). Los números de versiones eliminadas no se reutilizan.
  numero                 integer     NOT NULL,
  estado                 text        NOT NULL DEFAULT 'borrador',
  vigente                boolean     NOT NULL DEFAULT false,
  descripcion            text,
  -- Moneda en la que están expresados precios y totales de las partidas (la del contrato de la obra
  -- al crear la versión). En UF, `valor_uf`/`fecha_valor_uf` fijan la conversión a CLP.
  moneda                 text        NOT NULL DEFAULT 'CLP',
  valor_uf               numeric(18, 4),
  fecha_valor_uf         date,
  -- Totales calculados por el servidor a partir de las partidas.
  total                  numeric(18, 4) NOT NULL DEFAULT 0,
  total_clp              numeric(18, 0) NOT NULL DEFAULT 0,
  cantidad_partidas      integer     NOT NULL DEFAULT 0,
  copiada_de_id          bigint      REFERENCES nomade.presupuesto_version (id),
  importacion_lote_id    bigint      REFERENCES nomade.importacion_lote (id),
  enviado_en             timestamptz,
  enviado_por            bigint REFERENCES nomade.usuario (id),
  -- Aprobación o rechazo.
  resuelto_en            timestamptz,
  resuelto_por           bigint REFERENCES nomade.usuario (id),
  motivo_resolucion      text,
  version                integer     NOT NULL DEFAULT 1,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             bigint REFERENCES nomade.usuario (id),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             bigint REFERENCES nomade.usuario (id),
  eliminado_en           timestamptz,
  eliminado_por          bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_presupuesto_version_obra_numero UNIQUE (obra_id, numero),
  CONSTRAINT ck_presupuesto_version_numero CHECK (numero >= 1),
  CONSTRAINT ck_presupuesto_version_estado CHECK (estado IN ('borrador', 'en_revision', 'aprobado', 'rechazado')),
  CONSTRAINT ck_presupuesto_version_moneda CHECK (moneda IN ('CLP', 'UF')),
  CONSTRAINT ck_presupuesto_version_uf CHECK (
    (moneda = 'CLP' AND valor_uf IS NULL AND fecha_valor_uf IS NULL)
    OR (moneda = 'UF' AND valor_uf IS NOT NULL AND valor_uf > 0 AND fecha_valor_uf IS NOT NULL)
  ),
  CONSTRAINT ck_presupuesto_version_totales CHECK (total >= 0 AND total_clp >= 0 AND cantidad_partidas >= 0),
  -- Solo una versión aprobada puede ser la vigente.
  CONSTRAINT ck_presupuesto_version_vigente CHECK (NOT vigente OR estado = 'aprobado'),
  CONSTRAINT ck_presupuesto_version_envio CHECK (
    (estado = 'borrador' AND enviado_en IS NULL AND enviado_por IS NULL)
    OR (estado <> 'borrador' AND enviado_en IS NOT NULL AND enviado_por IS NOT NULL)
  ),
  CONSTRAINT ck_presupuesto_version_resolucion CHECK (
    (estado IN ('borrador', 'en_revision') AND resuelto_en IS NULL AND resuelto_por IS NULL)
    OR (estado IN ('aprobado', 'rechazado') AND resuelto_en IS NOT NULL AND resuelto_por IS NOT NULL)
  ),
  -- El rechazo siempre lleva motivo.
  CONSTRAINT ck_presupuesto_version_motivo CHECK (
    estado <> 'rechazado' OR length(btrim(coalesce(motivo_resolucion, ''))) > 0
  ),
  -- Una versión en revisión o aprobada tiene al menos una partida.
  CONSTRAINT ck_presupuesto_version_con_partidas CHECK (
    estado NOT IN ('en_revision', 'aprobado') OR cantidad_partidas > 0
  ),
  CONSTRAINT ck_presupuesto_version_descripcion CHECK (
    descripcion IS NULL OR length(btrim(descripcion)) > 0
  )
);

-- A lo más UNA versión aprobada vigente por obra.
CREATE UNIQUE INDEX ux_presupuesto_version_vigente_obra
  ON nomade.presupuesto_version (obra_id) WHERE vigente;
CREATE INDEX ix_presupuesto_version_obra ON nomade.presupuesto_version (obra_id, numero DESC) WHERE eliminado_en IS NULL;
CREATE INDEX ix_presupuesto_version_estado ON nomade.presupuesto_version (estado) WHERE eliminado_en IS NULL;

ALTER TABLE nomade.importacion_lote
  ADD CONSTRAINT fk_importacion_lote_version
  FOREIGN KEY (presupuesto_version_id) REFERENCES nomade.presupuesto_version (id);

CREATE TRIGGER trg_presupuesto_version_updated_at
  BEFORE UPDATE ON nomade.presupuesto_version
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

-- Defensa en profundidad (la regla vive en el servicio): máquina de estados e inmutabilidad.
CREATE FUNCTION nomade.fn_presupuesto_version_inmutable()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  campos_libres text[] := ARRAY['vigente', 'updated_at', 'updated_by', 'version'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado <> 'borrador' THEN
      RAISE EXCEPTION 'Una versión de presupuesto % no se puede eliminar.', OLD.estado
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.estado = NEW.estado THEN
    -- Aprobadas y rechazadas son inmutables: solo cambia la marca de vigencia (y la auditoría), y
    -- una aprobada únicamente puede dejar de ser vigente.
    IF OLD.estado IN ('aprobado', 'rechazado') THEN
      IF (to_jsonb(NEW) - campos_libres) IS DISTINCT FROM (to_jsonb(OLD) - campos_libres) THEN
        RAISE EXCEPTION 'Una versión de presupuesto % es inmutable.', OLD.estado
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.vigente AND NOT OLD.vigente THEN
        RAISE EXCEPTION 'Una versión aprobada no puede volver a ser la vigente.'
          USING ERRCODE = 'check_violation';
      END IF;
    -- En revisión el contenido está congelado: solo cambian la marca de vigencia y la auditoría.
    ELSIF OLD.estado = 'en_revision' THEN
      IF (to_jsonb(NEW) - campos_libres) IS DISTINCT FROM (to_jsonb(OLD) - campos_libres) THEN
        RAISE EXCEPTION 'Una versión en revisión no se puede modificar.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.estado = 'borrador' AND NEW.estado = 'en_revision')
    OR (OLD.estado = 'en_revision' AND NEW.estado IN ('aprobado', 'rechazado'))
  ) THEN
    RAISE EXCEPTION 'Transición de estado no permitida: % → %.', OLD.estado, NEW.estado
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_presupuesto_version_inmutable
  BEFORE UPDATE OR DELETE ON nomade.presupuesto_version
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_presupuesto_version_inmutable();

COMMENT ON TABLE nomade.presupuesto_version IS 'Versión del presupuesto de una obra: borrador → en_revision → aprobado/rechazado. Las aprobadas son inmutables.';
COMMENT ON COLUMN nomade.presupuesto_version.vigente IS 'Única versión aprobada que rige la obra (índice único parcial).';
COMMENT ON COLUMN nomade.presupuesto_version.valor_uf IS 'En versiones en UF: valor de la UF (a fecha_valor_uf) con que se convierte cada partida a CLP.';

-- ---------------------------------------------------------------------------
-- partida: línea del presupuesto. La jerarquía se expresa en el código (1, 1.1, 1.1.2…) y la
-- agrupación en la familia (catálogo `familia_partida`, FK compuesta como el estado de obra).
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.partida (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id       bigint      NOT NULL REFERENCES nomade.presupuesto_version (id),
  -- Posición en que se muestra la partida dentro de la versión.
  orden            integer     NOT NULL,
  codigo           text        NOT NULL,
  familia_id       bigint      NOT NULL,
  familia_tipo     text        GENERATED ALWAYS AS ('familia_partida') STORED,
  descripcion      text        NOT NULL,
  unidad           text        NOT NULL,
  cantidad         numeric(18, 4) NOT NULL,
  -- En la moneda de la versión (CLP sin decimales; UF hasta 4 decimales).
  precio_unitario  numeric(18, 4) NOT NULL,
  -- cantidad × precio_unitario en la moneda de la versión, y su equivalente en CLP (calculados en el servidor).
  total            numeric(18, 4) NOT NULL,
  total_clp        numeric(18, 0) NOT NULL,
  version          integer     NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       bigint REFERENCES nomade.usuario (id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_partida_familia FOREIGN KEY (familia_id, familia_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ux_partida_version_codigo UNIQUE (version_id, codigo),
  CONSTRAINT ck_partida_orden CHECK (orden >= 1),
  CONSTRAINT ck_partida_codigo CHECK (codigo ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$'),
  CONSTRAINT ck_partida_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_partida_unidad CHECK (length(btrim(unidad)) >= 1),
  CONSTRAINT ck_partida_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_partida_precio CHECK (precio_unitario >= 0),
  CONSTRAINT ck_partida_totales CHECK (total >= 0 AND total_clp >= 0)
);

CREATE INDEX ix_partida_version ON nomade.partida (version_id, orden, id);
CREATE INDEX ix_partida_familia ON nomade.partida (familia_id);

CREATE TRIGGER trg_partida_updated_at
  BEFORE UPDATE ON nomade.partida
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

-- Las partidas solo se agregan, modifican o eliminan mientras la versión es un borrador.
CREATE FUNCTION nomade.fn_partida_solo_en_borrador()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  id_version bigint := CASE WHEN TG_OP = 'DELETE' THEN OLD.version_id ELSE NEW.version_id END;
  estado_version text;
BEGIN
  SELECT estado INTO estado_version FROM nomade.presupuesto_version WHERE id = id_version;
  IF estado_version IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'Las partidas de una versión % no se pueden modificar.', coalesce(estado_version, 'inexistente')
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.version_id <> OLD.version_id THEN
    RAISE EXCEPTION 'Una partida no se puede mover a otra versión.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_partida_solo_en_borrador
  BEFORE INSERT OR UPDATE OR DELETE ON nomade.partida
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_partida_solo_en_borrador();

COMMENT ON TABLE nomade.partida IS 'Partidas de una versión de presupuesto. Editables solo en borrador; los totales los calcula el servidor.';

-- Down Migration

DROP TABLE nomade.partida;
DROP FUNCTION nomade.fn_partida_solo_en_borrador();
ALTER TABLE nomade.importacion_lote DROP CONSTRAINT fk_importacion_lote_version;
DROP TABLE nomade.presupuesto_version;
DROP FUNCTION nomade.fn_presupuesto_version_inmutable();
DROP TABLE nomade.importacion_fila;
DROP TABLE nomade.importacion_lote;
