-- Up Migration

-- Fase 4 — Compras núcleo: cotizaciones, órdenes de trabajo (OT) con hitos porcentuales, órdenes de
-- compra (OC) de materiales y parciales de OT, recepción, anulación y el libro de movimientos
-- (compromisos). Se ejecuta como nomade_owner; los privilegios por defecto de la migración base
-- otorgan SELECT/INSERT/UPDATE/DELETE a nomade_app sobre las tablas nuevas.
--
-- Convenciones (plan §6.2, D-13): PK bigint identity, snake_case, auditoría created_*/updated_*,
-- `version` para el control optimista. Montos de compras en CLP NETO (sin IVA) numeric(18,0).
--
-- SUPUESTOS PROVISORIOS (H5 — Q04/Q16/Q17 sin respuesta del cliente):
--   * Una OT, una OC o una cotización aprobadas NO se editan. Una OC aprobada se anula con motivo y
--     reversa del compromiso; una OT aprobada solo se anula si no tiene OC vigentes.
--   * Los hitos (y sus porcentajes) se fijan en el borrador de la OT y no cambian tras aprobarla.
--   * La recepción de una OC es total (una sola, sin recepciones parciales).
--   * Las compras se expresan en CLP; la OC calcula el IVA con el parámetro vigente a su fecha.

-- ---------------------------------------------------------------------------
-- folio: correlativo GLOBAL por tipo de documento (D-17). Se asigna al crear el documento; los
-- números de borradores eliminados no se reutilizan.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.folio (
  tipo    text   PRIMARY KEY,
  ultimo  bigint NOT NULL DEFAULT 0,
  CONSTRAINT ck_folio_ultimo CHECK (ultimo >= 0)
);

INSERT INTO nomade.folio (tipo) VALUES ('cotizacion'), ('orden_trabajo'), ('orden_compra');

COMMENT ON TABLE nomade.folio IS 'Último folio emitido por tipo de documento (correlativo global, D-17). UPDATE … RETURNING serializa la numeración.';

-- Catálogo «categoría de gasto»: subcontratos y materiales los usa la lógica por defecto.
UPDATE nomade.catalogo SET protegido = true
WHERE tipo = 'categoria_gasto' AND codigo IN ('materiales', 'subcontratos');

-- ---------------------------------------------------------------------------
-- cotizacion: oferta de un proveedor para una obra. Una cotización aprobada habilita crear una OT.
-- Estados: borrador → en_revision → aprobada | rechazada.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.cotizacion (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero               bigint      NOT NULL,
  obra_id              bigint      NOT NULL REFERENCES nomade.obra (id),
  proveedor_id         bigint      NOT NULL REFERENCES nomade.proveedor (id),
  -- Número o referencia que el proveedor puso en su cotización.
  referencia_proveedor text,
  fecha                date        NOT NULL,
  validez_hasta        date,
  descripcion          text        NOT NULL,
  categoria_gasto_id   bigint      NOT NULL,
  categoria_gasto_tipo text        GENERATED ALWAYS AS ('categoria_gasto') STORED,
  monto_neto           numeric(18, 0) NOT NULL,
  estado               text        NOT NULL DEFAULT 'borrador',
  enviado_en           timestamptz,
  enviado_por          bigint REFERENCES nomade.usuario (id),
  resuelto_en          timestamptz,
  resuelto_por         bigint REFERENCES nomade.usuario (id),
  motivo_resolucion    text,
  version              integer     NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           bigint REFERENCES nomade.usuario (id),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           bigint REFERENCES nomade.usuario (id),
  eliminado_en         timestamptz,
  eliminado_por        bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_cotizacion_categoria FOREIGN KEY (categoria_gasto_id, categoria_gasto_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ux_cotizacion_numero UNIQUE (numero),
  CONSTRAINT ck_cotizacion_numero CHECK (numero >= 1),
  CONSTRAINT ck_cotizacion_estado CHECK (estado IN ('borrador', 'en_revision', 'aprobada', 'rechazada')),
  CONSTRAINT ck_cotizacion_monto CHECK (monto_neto > 0),
  CONSTRAINT ck_cotizacion_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_cotizacion_validez CHECK (validez_hasta IS NULL OR validez_hasta >= fecha),
  CONSTRAINT ck_cotizacion_envio CHECK (
    (estado = 'borrador') = (enviado_en IS NULL AND enviado_por IS NULL)
  ),
  CONSTRAINT ck_cotizacion_resolucion CHECK (
    (estado IN ('aprobada', 'rechazada')) = (resuelto_en IS NOT NULL AND resuelto_por IS NOT NULL)
  ),
  CONSTRAINT ck_cotizacion_motivo CHECK (
    estado <> 'rechazada' OR length(btrim(coalesce(motivo_resolucion, ''))) > 0
  ),
  -- Solo los borradores se eliminan (borrado lógico).
  CONSTRAINT ck_cotizacion_eliminada CHECK (eliminado_en IS NULL OR estado = 'borrador')
);

CREATE INDEX ix_cotizacion_obra ON nomade.cotizacion (obra_id, numero DESC) WHERE eliminado_en IS NULL;
CREATE INDEX ix_cotizacion_proveedor ON nomade.cotizacion (proveedor_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_cotizacion_estado ON nomade.cotizacion (estado, numero DESC) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_cotizacion_updated_at
  BEFORE UPDATE ON nomade.cotizacion
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.cotizacion IS 'Cotización de un proveedor para una obra (CLP neto). borrador → en_revision → aprobada | rechazada.';

-- ---------------------------------------------------------------------------
-- orden_trabajo: subcontrato nacido de una cotización aprobada, con hitos porcentuales (suman 100 %).
-- Estados: borrador → en_revision → aprobada | rechazada; aprobada → anulada (sin OC vigentes).
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.orden_trabajo (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero               bigint      NOT NULL,
  obra_id              bigint      NOT NULL REFERENCES nomade.obra (id),
  proveedor_id         bigint      NOT NULL REFERENCES nomade.proveedor (id),
  cotizacion_id        bigint      NOT NULL REFERENCES nomade.cotizacion (id),
  descripcion          text        NOT NULL,
  categoria_gasto_id   bigint      NOT NULL,
  categoria_gasto_tipo text        GENERATED ALWAYS AS ('categoria_gasto') STORED,
  -- Monto contratado: el de la cotización aprobada.
  monto_neto           numeric(18, 0) NOT NULL,
  fecha_inicio         date,
  fecha_termino        date,
  estado               text        NOT NULL DEFAULT 'borrador',
  enviado_en           timestamptz,
  enviado_por          bigint REFERENCES nomade.usuario (id),
  resuelto_en          timestamptz,
  resuelto_por         bigint REFERENCES nomade.usuario (id),
  motivo_resolucion    text,
  anulado_en           timestamptz,
  anulado_por          bigint REFERENCES nomade.usuario (id),
  motivo_anulacion     text,
  version              integer     NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           bigint REFERENCES nomade.usuario (id),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           bigint REFERENCES nomade.usuario (id),
  eliminado_en         timestamptz,
  eliminado_por        bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_orden_trabajo_categoria FOREIGN KEY (categoria_gasto_id, categoria_gasto_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ux_orden_trabajo_numero UNIQUE (numero),
  CONSTRAINT ck_orden_trabajo_numero CHECK (numero >= 1),
  CONSTRAINT ck_orden_trabajo_estado CHECK (
    estado IN ('borrador', 'en_revision', 'aprobada', 'rechazada', 'anulada')
  ),
  CONSTRAINT ck_orden_trabajo_monto CHECK (monto_neto > 0),
  CONSTRAINT ck_orden_trabajo_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_orden_trabajo_fechas CHECK (
    fecha_inicio IS NULL OR fecha_termino IS NULL OR fecha_termino >= fecha_inicio
  ),
  CONSTRAINT ck_orden_trabajo_envio CHECK (
    (estado = 'borrador') = (enviado_en IS NULL AND enviado_por IS NULL)
  ),
  CONSTRAINT ck_orden_trabajo_resolucion CHECK (
    (estado IN ('aprobada', 'rechazada', 'anulada')) = (resuelto_en IS NOT NULL AND resuelto_por IS NOT NULL)
  ),
  CONSTRAINT ck_orden_trabajo_motivo CHECK (
    estado <> 'rechazada' OR length(btrim(coalesce(motivo_resolucion, ''))) > 0
  ),
  CONSTRAINT ck_orden_trabajo_anulacion CHECK (
    (estado = 'anulada') = (anulado_en IS NOT NULL AND anulado_por IS NOT NULL
      AND length(btrim(coalesce(motivo_anulacion, ''))) > 0)
  ),
  CONSTRAINT ck_orden_trabajo_eliminada CHECK (eliminado_en IS NULL OR estado = 'borrador')
);

-- Una cotización tiene a lo más UNA OT vigente (las rechazadas, anuladas y eliminadas la liberan).
CREATE UNIQUE INDEX ux_orden_trabajo_cotizacion
  ON nomade.orden_trabajo (cotizacion_id)
  WHERE eliminado_en IS NULL AND estado NOT IN ('rechazada', 'anulada');
CREATE INDEX ix_orden_trabajo_obra ON nomade.orden_trabajo (obra_id, numero DESC) WHERE eliminado_en IS NULL;
CREATE INDEX ix_orden_trabajo_proveedor ON nomade.orden_trabajo (proveedor_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_orden_trabajo_estado ON nomade.orden_trabajo (estado, numero DESC) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_orden_trabajo_updated_at
  BEFORE UPDATE ON nomade.orden_trabajo
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.orden_trabajo IS 'OT (subcontrato) desde una cotización aprobada, con hitos %. borrador → en_revision → aprobada | rechazada; aprobada → anulada.';

CREATE TABLE nomade.orden_trabajo_hito (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_trabajo_id  bigint      NOT NULL REFERENCES nomade.orden_trabajo (id),
  -- Posición del hito en la OT (1, 2, 3…).
  numero            integer     NOT NULL,
  descripcion       text        NOT NULL,
  porcentaje        numeric(5, 2) NOT NULL,
  -- porcentaje × monto de la OT (el último hito absorbe el redondeo: la suma es exactamente el monto).
  monto_neto        numeric(18, 0) NOT NULL,
  fecha_estimada    date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_orden_trabajo_hito_numero UNIQUE (orden_trabajo_id, numero),
  CONSTRAINT ck_orden_trabajo_hito_numero CHECK (numero >= 1),
  CONSTRAINT ck_orden_trabajo_hito_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_orden_trabajo_hito_porcentaje CHECK (porcentaje > 0 AND porcentaje <= 100),
  CONSTRAINT ck_orden_trabajo_hito_monto CHECK (monto_neto >= 0)
);

CREATE INDEX ix_orden_trabajo_hito_ot ON nomade.orden_trabajo_hito (orden_trabajo_id, numero);

COMMENT ON TABLE nomade.orden_trabajo_hito IS 'Hitos de pago de una OT. Solo se modifican mientras la OT es un borrador (supuesto H5).';

-- ---------------------------------------------------------------------------
-- orden_compra: OC de materiales (con líneas) o parcial de una OT (hito + porcentaje de la OT).
-- Estados: borrador → en_revision → aprobada | rechazada; aprobada → recibida | anulada.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.orden_compra (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero                bigint      NOT NULL,
  tipo                  text        NOT NULL,
  obra_id               bigint      NOT NULL REFERENCES nomade.obra (id),
  proveedor_id          bigint      NOT NULL REFERENCES nomade.proveedor (id),
  orden_trabajo_id      bigint      REFERENCES nomade.orden_trabajo (id),
  hito_id               bigint      REFERENCES nomade.orden_trabajo_hito (id),
  -- OC parcial: porcentaje del monto de la OT que se ordena.
  porcentaje            numeric(5, 2),
  categoria_gasto_id    bigint      NOT NULL,
  categoria_gasto_tipo  text        GENERATED ALWAYS AS ('categoria_gasto') STORED,
  fecha                 date        NOT NULL,
  fecha_entrega         date,
  descripcion           text        NOT NULL,
  afecta_iva            boolean     NOT NULL DEFAULT true,
  tasa_iva              numeric(5, 2) NOT NULL,
  monto_neto            numeric(18, 0) NOT NULL DEFAULT 0,
  monto_iva             numeric(18, 0) NOT NULL DEFAULT 0,
  monto_total           numeric(18, 0) NOT NULL DEFAULT 0,
  estado                text        NOT NULL DEFAULT 'borrador',
  enviado_en            timestamptz,
  enviado_por           bigint REFERENCES nomade.usuario (id),
  resuelto_en           timestamptz,
  resuelto_por          bigint REFERENCES nomade.usuario (id),
  motivo_resolucion     text,
  recibido_en           timestamptz,
  recibido_por          bigint REFERENCES nomade.usuario (id),
  fecha_recepcion       date,
  observacion_recepcion text,
  anulado_en            timestamptz,
  anulado_por           bigint REFERENCES nomade.usuario (id),
  motivo_anulacion      text,
  version               integer     NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            bigint REFERENCES nomade.usuario (id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            bigint REFERENCES nomade.usuario (id),
  eliminado_en          timestamptz,
  eliminado_por         bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_orden_compra_categoria FOREIGN KEY (categoria_gasto_id, categoria_gasto_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ux_orden_compra_numero UNIQUE (numero),
  CONSTRAINT ck_orden_compra_numero CHECK (numero >= 1),
  CONSTRAINT ck_orden_compra_tipo CHECK (tipo IN ('materiales', 'parcial_ot')),
  CONSTRAINT ck_orden_compra_estado CHECK (
    estado IN ('borrador', 'en_revision', 'aprobada', 'rechazada', 'recibida', 'anulada')
  ),
  CONSTRAINT ck_orden_compra_origen CHECK (
    (tipo = 'materiales' AND orden_trabajo_id IS NULL AND hito_id IS NULL AND porcentaje IS NULL)
    OR (tipo = 'parcial_ot' AND orden_trabajo_id IS NOT NULL AND hito_id IS NOT NULL
        AND porcentaje IS NOT NULL AND porcentaje > 0 AND porcentaje <= 100)
  ),
  CONSTRAINT ck_orden_compra_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_orden_compra_entrega CHECK (fecha_entrega IS NULL OR fecha_entrega >= fecha),
  CONSTRAINT ck_orden_compra_iva CHECK (
    tasa_iva >= 0 AND tasa_iva <= 100 AND (afecta_iva OR monto_iva = 0)
  ),
  CONSTRAINT ck_orden_compra_montos CHECK (
    monto_neto >= 0 AND monto_iva >= 0 AND monto_total = monto_neto + monto_iva
  ),
  -- Fuera del borrador la OC tiene monto.
  CONSTRAINT ck_orden_compra_con_monto CHECK (estado = 'borrador' OR monto_neto > 0),
  CONSTRAINT ck_orden_compra_envio CHECK (
    (estado = 'borrador') = (enviado_en IS NULL AND enviado_por IS NULL)
  ),
  CONSTRAINT ck_orden_compra_resolucion CHECK (
    (estado IN ('aprobada', 'rechazada', 'recibida', 'anulada')) = (resuelto_en IS NOT NULL AND resuelto_por IS NOT NULL)
  ),
  CONSTRAINT ck_orden_compra_motivo CHECK (
    estado <> 'rechazada' OR length(btrim(coalesce(motivo_resolucion, ''))) > 0
  ),
  CONSTRAINT ck_orden_compra_recepcion CHECK (
    (estado = 'recibida') = (recibido_en IS NOT NULL AND recibido_por IS NOT NULL AND fecha_recepcion IS NOT NULL)
  ),
  CONSTRAINT ck_orden_compra_anulacion CHECK (
    (estado = 'anulada') = (anulado_en IS NOT NULL AND anulado_por IS NOT NULL
      AND length(btrim(coalesce(motivo_anulacion, ''))) > 0)
  ),
  CONSTRAINT ck_orden_compra_eliminada CHECK (eliminado_en IS NULL OR estado = 'borrador')
);

CREATE INDEX ix_orden_compra_obra ON nomade.orden_compra (obra_id, numero DESC) WHERE eliminado_en IS NULL;
CREATE INDEX ix_orden_compra_proveedor ON nomade.orden_compra (proveedor_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_orden_compra_estado ON nomade.orden_compra (estado, numero DESC) WHERE eliminado_en IS NULL;
CREATE INDEX ix_orden_compra_ot ON nomade.orden_compra (orden_trabajo_id, hito_id) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_orden_compra_updated_at
  BEFORE UPDATE ON nomade.orden_compra
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.orden_compra IS 'OC de materiales o parcial de OT (CLP neto + IVA). borrador → en_revision → aprobada | rechazada; aprobada → recibida | anulada. Una OC aprobada no se edita.';
COMMENT ON COLUMN nomade.orden_compra.porcentaje IS 'OC parcial: porcentaje del monto de la OT. La suma por hito no supera el porcentaje del hito.';

CREATE TABLE nomade.orden_compra_linea (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_compra_id  bigint      NOT NULL REFERENCES nomade.orden_compra (id),
  numero           integer     NOT NULL,
  descripcion      text        NOT NULL,
  unidad           text        NOT NULL,
  cantidad         numeric(18, 4) NOT NULL,
  -- CLP; admite hasta 4 decimales (precios por kg, m, etc.). El total de la línea se redondea a pesos.
  precio_unitario  numeric(18, 4) NOT NULL,
  total            numeric(18, 0) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_orden_compra_linea_numero UNIQUE (orden_compra_id, numero),
  CONSTRAINT ck_orden_compra_linea_numero CHECK (numero >= 1),
  CONSTRAINT ck_orden_compra_linea_descripcion CHECK (length(btrim(descripcion)) >= 2),
  CONSTRAINT ck_orden_compra_linea_unidad CHECK (length(btrim(unidad)) >= 1),
  CONSTRAINT ck_orden_compra_linea_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_orden_compra_linea_precio CHECK (precio_unitario >= 0),
  CONSTRAINT ck_orden_compra_linea_total CHECK (total >= 0)
);

CREATE INDEX ix_orden_compra_linea_oc ON nomade.orden_compra_linea (orden_compra_id, numero);

COMMENT ON TABLE nomade.orden_compra_linea IS 'Líneas de una OC de materiales. Solo se modifican mientras la OC es un borrador.';

-- ---------------------------------------------------------------------------
-- Defensa en profundidad (las reglas viven en los servicios): máquinas de estado, inmutabilidad
-- fuera del borrador y tope de la OT.
-- ---------------------------------------------------------------------------

-- Fuera del borrador solo cambian el estado y sus columnas de trazabilidad: el contenido es inmutable.
CREATE FUNCTION nomade.fn_documento_compra_transicion()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  -- Columnas que cambian con las transiciones (y la auditoría). Las columnas generadas también se
  -- excluyen: en un BEFORE UPDATE todavía no están calculadas en NEW.
  campos_flujo text[] := ARRAY[
    'categoria_gasto_tipo',
    'estado', 'enviado_en', 'enviado_por', 'resuelto_en', 'resuelto_por', 'motivo_resolucion',
    'recibido_en', 'recibido_por', 'fecha_recepcion', 'observacion_recepcion',
    'anulado_en', 'anulado_por', 'motivo_anulacion',
    'updated_at', 'updated_by', 'version'
  ];
  permitidas text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los documentos de compra no se eliminan físicamente (%).', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.estado <> 'borrador'
     AND (to_jsonb(NEW) - campos_flujo) IS DISTINCT FROM (to_jsonb(OLD) - campos_flujo) THEN
    RAISE EXCEPTION 'Un documento % no se puede modificar (%).', OLD.estado, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  permitidas := CASE OLD.estado
    WHEN 'borrador'    THEN ARRAY['en_revision']
    WHEN 'en_revision' THEN ARRAY['aprobada', 'rechazada']
    WHEN 'aprobada'    THEN CASE TG_TABLE_NAME
                              WHEN 'orden_compra'  THEN ARRAY['recibida', 'anulada']
                              WHEN 'orden_trabajo' THEN ARRAY['anulada']
                              ELSE ARRAY[]::text[]
                            END
    ELSE ARRAY[]::text[]
  END;
  IF NOT (NEW.estado = ANY (permitidas)) THEN
    RAISE EXCEPTION 'Transición de estado no permitida en %: % → %.', TG_TABLE_NAME, OLD.estado, NEW.estado
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cotizacion_transicion
  BEFORE UPDATE OR DELETE ON nomade.cotizacion
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_documento_compra_transicion();
CREATE TRIGGER trg_orden_trabajo_transicion
  BEFORE UPDATE OR DELETE ON nomade.orden_trabajo
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_documento_compra_transicion();
CREATE TRIGGER trg_orden_compra_transicion
  BEFORE UPDATE OR DELETE ON nomade.orden_compra
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_documento_compra_transicion();

-- Hitos y líneas: solo mientras su documento es un borrador.
CREATE FUNCTION nomade.fn_detalle_compra_solo_en_borrador()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  fila record := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  estado_padre text;
BEGIN
  IF TG_TABLE_NAME = 'orden_trabajo_hito' THEN
    SELECT estado INTO estado_padre FROM nomade.orden_trabajo WHERE id = fila.orden_trabajo_id;
  ELSE
    SELECT estado INTO estado_padre FROM nomade.orden_compra WHERE id = fila.orden_compra_id;
  END IF;
  IF estado_padre IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'El detalle de un documento % no se puede modificar (%).',
      coalesce(estado_padre, 'inexistente'), TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN fila;
END;
$$;

CREATE TRIGGER trg_orden_trabajo_hito_solo_en_borrador
  BEFORE INSERT OR UPDATE OR DELETE ON nomade.orden_trabajo_hito
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_detalle_compra_solo_en_borrador();
CREATE TRIGGER trg_orden_compra_linea_solo_en_borrador
  BEFORE INSERT OR UPDATE OR DELETE ON nomade.orden_compra_linea
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_detalle_compra_solo_en_borrador();

-- Tope de la OT: las OC parciales vigentes de un hito no superan su porcentaje ni su monto.
-- El servicio serializa con `FOR UPDATE` sobre la OT; esta verificación es la última barrera.
CREATE FUNCTION nomade.fn_orden_compra_tope_ot()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  hito nomade.orden_trabajo_hito%ROWTYPE;
  suma_porcentaje numeric;
  suma_monto numeric;
BEGIN
  IF NEW.tipo <> 'parcial_ot' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO hito FROM nomade.orden_trabajo_hito WHERE id = NEW.hito_id;
  IF hito.orden_trabajo_id IS DISTINCT FROM NEW.orden_trabajo_id THEN
    RAISE EXCEPTION 'El hito % no pertenece a la OT %.', NEW.hito_id, NEW.orden_trabajo_id
      USING ERRCODE = 'check_violation';
  END IF;
  SELECT coalesce(sum(porcentaje), 0), coalesce(sum(monto_neto), 0)
    INTO suma_porcentaje, suma_monto
  FROM nomade.orden_compra
  WHERE hito_id = NEW.hito_id
    AND eliminado_en IS NULL
    AND estado NOT IN ('rechazada', 'anulada');
  IF suma_porcentaje > hito.porcentaje OR suma_monto > hito.monto_neto THEN
    RAISE EXCEPTION 'Las OC del hito % superan su saldo (%%: % de %; $: % de %).',
      hito.numero, suma_porcentaje, hito.porcentaje, suma_monto, hito.monto_neto
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_orden_compra_tope_ot
  AFTER INSERT OR UPDATE ON nomade.orden_compra
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_orden_compra_tope_ot();

-- ---------------------------------------------------------------------------
-- movimiento: libro de movimientos (plan §9.3), fuente de verdad de los reportes. Cada hecho
-- financiero se registra una sola vez y nunca se edita: se corrige con una reversa (monto con signo
-- contrario que apunta al original). En esta fase solo hay compromisos (OC aprobadas).
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.movimiento (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha                date        NOT NULL,
  tipo                 text        NOT NULL,
  obra_id              bigint      NOT NULL REFERENCES nomade.obra (id),
  proveedor_id         bigint      REFERENCES nomade.proveedor (id),
  categoria_gasto_id   bigint,
  categoria_gasto_tipo text        GENERATED ALWAYS AS ('categoria_gasto') STORED,
  origen_tipo          text        NOT NULL,
  origen_id            bigint      NOT NULL,
  -- CLP con signo: positivo aumenta el saldo del tipo; negativo lo disminuye (reversas).
  monto_clp            numeric(18, 0) NOT NULL,
  reversa_de_id        bigint      REFERENCES nomade.movimiento (id),
  descripcion          text        NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_movimiento_categoria FOREIGN KEY (categoria_gasto_id, categoria_gasto_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ck_movimiento_tipo CHECK (tipo IN ('compromiso')),
  CONSTRAINT ck_movimiento_origen CHECK (origen_tipo IN ('orden_compra')),
  CONSTRAINT ck_movimiento_monto CHECK (monto_clp <> 0),
  CONSTRAINT ck_movimiento_descripcion CHECK (length(btrim(descripcion)) >= 2),
  -- Un movimiento se revierte a lo más una vez.
  CONSTRAINT ux_movimiento_reversa UNIQUE (reversa_de_id)
);

-- Un hecho se registra una sola vez: un movimiento original por (tipo, origen).
CREATE UNIQUE INDEX ux_movimiento_origen
  ON nomade.movimiento (tipo, origen_tipo, origen_id)
  WHERE reversa_de_id IS NULL;
CREATE INDEX ix_movimiento_obra ON nomade.movimiento (obra_id, fecha, id);
CREATE INDEX ix_movimiento_origen ON nomade.movimiento (origen_tipo, origen_id);

-- Append-only real: la aplicación solo puede insertar y consultar.
CREATE FUNCTION nomade.fn_movimiento_inmutable()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'El libro de movimientos es inmutable: se corrige con una reversa.'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_movimiento_inmutable
  BEFORE UPDATE OR DELETE ON nomade.movimiento
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_movimiento_inmutable();

COMMENT ON TABLE nomade.movimiento IS 'Libro de movimientos append-only (§9.3). Fase 4: compromisos de OC aprobadas y sus reversas al anular.';

-- ---------------------------------------------------------------------------
-- Adjuntos: también a cotizaciones, OT y OC (cotización del proveedor, contrato, guía de despacho).
-- ---------------------------------------------------------------------------
ALTER TABLE nomade.adjunto DROP CONSTRAINT ck_adjunto_entidad;
ALTER TABLE nomade.adjunto ADD CONSTRAINT ck_adjunto_entidad CHECK (
  entidad_tipo IN ('obra', 'proveedor', 'cliente', 'cotizacion', 'orden_trabajo', 'orden_compra')
);

-- Down Migration

ALTER TABLE nomade.adjunto DROP CONSTRAINT ck_adjunto_entidad;
DELETE FROM nomade.adjunto WHERE entidad_tipo IN ('cotizacion', 'orden_trabajo', 'orden_compra');
ALTER TABLE nomade.adjunto ADD CONSTRAINT ck_adjunto_entidad CHECK (
  entidad_tipo IN ('obra', 'proveedor', 'cliente')
);
DROP TABLE nomade.movimiento;
DROP FUNCTION nomade.fn_movimiento_inmutable();
DROP TABLE nomade.orden_compra_linea;
DROP TABLE nomade.orden_compra;
DROP FUNCTION nomade.fn_orden_compra_tope_ot();
DROP TABLE nomade.orden_trabajo_hito;
DROP TABLE nomade.orden_trabajo;
DROP TABLE nomade.cotizacion;
DROP FUNCTION nomade.fn_detalle_compra_solo_en_borrador();
DROP FUNCTION nomade.fn_documento_compra_transicion();
UPDATE nomade.catalogo SET protegido = false
WHERE tipo = 'categoria_gasto' AND codigo IN ('materiales', 'subcontratos');
DROP TABLE nomade.folio;
