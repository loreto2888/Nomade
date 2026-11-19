-- Up Migration

-- Fase 2 — Maestros y obras: catálogos, clientes, proveedores (con cuentas bancarias),
-- obras / centros de costo, parámetros versionados, valores UF y adjuntos (metadatos).
-- Se ejecuta como nomade_owner; los privilegios por defecto de la migración base otorgan
-- SELECT/INSERT/UPDATE/DELETE a nomade_app sobre las tablas nuevas.
--
-- Convenciones (plan §6.2, D-13): PK bigint identity, snake_case, auditoría created_*/updated_*,
-- `version` en lo editable, borrado lógico (`eliminado_en`) en maestros.

-- ---------------------------------------------------------------------------
-- RUT chileno (módulo 11). Formato normalizado: cuerpo sin puntos, guion y dígito
-- verificador en mayúscula (`76123456-0`, `12345678-K`). La validación completa vive en el
-- servicio; esta función es la defensa en profundidad de la base de datos.
-- ---------------------------------------------------------------------------
CREATE FUNCTION nomade.fn_rut_valido(rut text)
  RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE STRICT
AS $$
DECLARE
  cuerpo   text;
  dv       text;
  suma     integer := 0;
  factor   integer := 2;
  i        integer;
  resto    integer;
  esperado text;
BEGIN
  IF rut !~ '^[0-9]{7,8}-[0-9K]$' THEN
    RETURN false;
  END IF;
  cuerpo := split_part(rut, '-', 1);
  dv := split_part(rut, '-', 2);
  FOR i IN REVERSE length(cuerpo)..1 LOOP
    suma := suma + substr(cuerpo, i, 1)::integer * factor;
    factor := CASE WHEN factor = 7 THEN 2 ELSE factor + 1 END;
  END LOOP;
  resto := 11 - (suma % 11);
  esperado := CASE resto WHEN 11 THEN '0' WHEN 10 THEN 'K' ELSE resto::text END;
  RETURN dv = esperado;
END;
$$;

COMMENT ON FUNCTION nomade.fn_rut_valido(text) IS
  'Valida un RUT normalizado (cuerpo-DV) con el algoritmo módulo 11.';

-- ---------------------------------------------------------------------------
-- catalogo: tabla genérica de catálogos editables por el admin.
--
-- Se eligió UNA tabla genérica (y no una por catálogo) porque los cuatro catálogos
-- (estado de obra, tipo de documento, categoría de gasto, familia de partida) tienen la
-- misma forma (código, nombre, orden, activo), el cliente entregará sus catálogos reales
-- (H16) con contenido y cantidad distintos, y así un solo módulo de API/pantalla los
-- administra. La integridad "estado de obra ∈ catálogo estado_obra" se garantiza con una
-- FK compuesta (id, tipo) desde obra. Un catálogo nuevo requiere ampliar `ck_catalogo_tipo`.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.catalogo (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo        text        NOT NULL,
  codigo      text        NOT NULL,
  nombre      text        NOT NULL,
  descripcion text,
  orden       integer     NOT NULL DEFAULT 0,
  activo      boolean     NOT NULL DEFAULT true,
  -- Ítems cuyo código usa la lógica de la aplicación: no se pueden desactivar.
  protegido   boolean     NOT NULL DEFAULT false,
  version     integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  bigint REFERENCES nomade.usuario (id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_catalogo_tipo CHECK (
    tipo IN ('estado_obra', 'tipo_documento', 'categoria_gasto', 'familia_partida')
  ),
  CONSTRAINT ck_catalogo_codigo CHECK (codigo ~ '^[a-z][a-z0-9_]{1,39}$'),
  CONSTRAINT ck_catalogo_nombre CHECK (length(btrim(nombre)) >= 2),
  CONSTRAINT ck_catalogo_protegido_activo CHECK (NOT protegido OR activo),
  CONSTRAINT ux_catalogo_tipo_codigo UNIQUE (tipo, codigo),
  CONSTRAINT ux_catalogo_id_tipo UNIQUE (id, tipo)
);

CREATE UNIQUE INDEX ux_catalogo_tipo_nombre ON nomade.catalogo (tipo, lower(nombre));
CREATE INDEX ix_catalogo_tipo_orden ON nomade.catalogo (tipo, orden, id);

CREATE TRIGGER trg_catalogo_updated_at
  BEFORE UPDATE ON nomade.catalogo
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.catalogo IS 'Catálogos editables por el admin. Contenido base PROVISORIO hasta recibir los catálogos reales del cliente (H16).';

-- Catálogo base provisorio (supuesto: se reemplaza/ajusta con los catálogos de Laudus/Excel).
INSERT INTO nomade.catalogo (tipo, codigo, nombre, descripcion, orden, protegido) VALUES
  ('estado_obra', 'en_preparacion', 'En preparación', 'Obra creada, aún sin inicio de ejecución.', 10, true),
  ('estado_obra', 'activa',         'Activa',         'Obra en ejecución.', 20, true),
  ('estado_obra', 'suspendida',     'Suspendida',     'Ejecución detenida temporalmente.', 30, false),
  ('estado_obra', 'terminada',      'Terminada',      'Ejecución finalizada; pendiente de cierre financiero.', 40, false),
  ('estado_obra', 'cerrada',        'Cerrada',        'Cierre financiero realizado. Solo lectura.', 50, true),

  ('tipo_documento', 'factura_electronica',        'Factura electrónica',                'DTE 33.', 10, false),
  ('tipo_documento', 'factura_exenta_electronica', 'Factura exenta electrónica',         'DTE 34.', 20, false),
  ('tipo_documento', 'nota_credito_electronica',   'Nota de crédito electrónica',        'DTE 61.', 30, false),
  ('tipo_documento', 'nota_debito_electronica',    'Nota de débito electrónica',         'DTE 56.', 40, false),
  ('tipo_documento', 'guia_despacho_electronica',  'Guía de despacho electrónica',       'DTE 52.', 50, false),
  ('tipo_documento', 'boleta_honorarios',          'Boleta de honorarios electrónica',   'Retención de impuesto según normativa vigente.', 60, false),
  ('tipo_documento', 'boleta',                     'Boleta',                             'Boleta de compraventa o de servicios.', 70, false),

  ('categoria_gasto', 'materiales',              'Materiales',                     NULL, 10, false),
  ('categoria_gasto', 'subcontratos',            'Subcontratos',                   NULL, 20, false),
  ('categoria_gasto', 'mano_de_obra',            'Mano de obra',                   NULL, 30, false),
  ('categoria_gasto', 'arriendo_equipos',        'Arriendo de equipos y maquinaria', NULL, 40, false),
  ('categoria_gasto', 'fletes_logistica',        'Fletes y logística',             NULL, 50, false),
  ('categoria_gasto', 'servicios_profesionales', 'Servicios profesionales',        NULL, 60, false),
  ('categoria_gasto', 'herramientas_epp',        'Herramientas y EPP',             NULL, 70, false),
  ('categoria_gasto', 'gastos_generales_obra',   'Gastos generales de obra',       NULL, 80, false),
  ('categoria_gasto', 'otros',                   'Otros',                          NULL, 90, false),

  ('familia_partida', 'obras_preliminares', 'Obras preliminares', NULL, 10, false),
  ('familia_partida', 'obra_gruesa',        'Obra gruesa',        NULL, 20, false),
  ('familia_partida', 'instalaciones',      'Instalaciones',      NULL, 30, false),
  ('familia_partida', 'terminaciones',      'Terminaciones',      NULL, 40, false),
  ('familia_partida', 'equipamiento',       'Equipamiento y mobiliario', NULL, 50, false),
  ('familia_partida', 'adicionales',        'Adicionales de obra', NULL, 60, false),
  ('familia_partida', 'gastos_generales',   'Gastos generales',   NULL, 70, false);

-- ---------------------------------------------------------------------------
-- cliente
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.cliente (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rut             text        NOT NULL,
  razon_social    text        NOT NULL,
  nombre_fantasia text,
  giro            text,
  contacto_nombre text,
  correo          text,
  telefono        text,
  direccion       text,
  version         integer     NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      bigint REFERENCES nomade.usuario (id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      bigint REFERENCES nomade.usuario (id),
  eliminado_en    timestamptz,
  eliminado_por   bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_cliente_rut CHECK (nomade.fn_rut_valido(rut)),
  CONSTRAINT ck_cliente_razon_social CHECK (length(btrim(razon_social)) >= 2)
);

-- El RUT es único entre los clientes vigentes: uno eliminado libera su RUT.
CREATE UNIQUE INDEX ux_cliente_rut ON nomade.cliente (rut) WHERE eliminado_en IS NULL;
CREATE INDEX ix_cliente_razon_social ON nomade.cliente (lower(razon_social)) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_cliente_updated_at
  BEFORE UPDATE ON nomade.cliente
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.cliente IS 'Clientes (mandantes de las obras). Borrado lógico (D-13).';

-- ---------------------------------------------------------------------------
-- proveedor y sus cuentas bancarias (solo admin; D-17)
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.proveedor (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rut             text        NOT NULL,
  razon_social    text        NOT NULL,
  nombre_fantasia text,
  giro            text,
  contacto_nombre text,
  correo          text,
  telefono        text,
  direccion       text,
  version         integer     NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      bigint REFERENCES nomade.usuario (id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      bigint REFERENCES nomade.usuario (id),
  eliminado_en    timestamptz,
  eliminado_por   bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_proveedor_rut CHECK (nomade.fn_rut_valido(rut)),
  CONSTRAINT ck_proveedor_razon_social CHECK (length(btrim(razon_social)) >= 2)
);

CREATE UNIQUE INDEX ux_proveedor_rut ON nomade.proveedor (rut) WHERE eliminado_en IS NULL;
CREATE INDEX ix_proveedor_razon_social ON nomade.proveedor (lower(razon_social)) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_proveedor_updated_at
  BEFORE UPDATE ON nomade.proveedor
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.proveedor IS 'Proveedores y contratistas. Borrado lógico (D-13).';

CREATE TABLE nomade.proveedor_cuenta_bancaria (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proveedor_id       bigint      NOT NULL REFERENCES nomade.proveedor (id),
  banco              text        NOT NULL,
  tipo_cuenta        text        NOT NULL,
  numero_cuenta      text        NOT NULL,
  titular            text        NOT NULL,
  titular_rut        text        NOT NULL,
  correo_notificacion text,
  principal          boolean     NOT NULL DEFAULT false,
  version            integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         bigint REFERENCES nomade.usuario (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         bigint REFERENCES nomade.usuario (id),
  eliminado_en       timestamptz,
  eliminado_por      bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ck_cuenta_tipo CHECK (tipo_cuenta IN ('corriente', 'vista', 'ahorro')),
  CONSTRAINT ck_cuenta_numero CHECK (numero_cuenta ~ '^[0-9]{4,20}$'),
  CONSTRAINT ck_cuenta_titular_rut CHECK (nomade.fn_rut_valido(titular_rut)),
  CONSTRAINT ck_cuenta_banco CHECK (length(btrim(banco)) >= 2),
  CONSTRAINT ck_cuenta_titular CHECK (length(btrim(titular)) >= 2)
);

CREATE UNIQUE INDEX ux_cuenta_proveedor_banco_numero
  ON nomade.proveedor_cuenta_bancaria (proveedor_id, lower(banco), numero_cuenta)
  WHERE eliminado_en IS NULL;
-- A lo más una cuenta principal vigente por proveedor.
CREATE UNIQUE INDEX ux_cuenta_proveedor_principal
  ON nomade.proveedor_cuenta_bancaria (proveedor_id)
  WHERE principal AND eliminado_en IS NULL;
CREATE INDEX ix_cuenta_proveedor ON nomade.proveedor_cuenta_bancaria (proveedor_id) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_cuenta_updated_at
  BEFORE UPDATE ON nomade.proveedor_cuenta_bancaria
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.proveedor_cuenta_bancaria IS 'Datos bancarios sensibles: solo el admin los consulta y modifica, siempre auditado (D-17, §13).';

-- ---------------------------------------------------------------------------
-- obra (centro de costo único)
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.obra (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_centro_costo   text        NOT NULL,
  nombre                text        NOT NULL,
  cliente_id            bigint      NOT NULL REFERENCES nomade.cliente (id),
  estado_id             bigint      NOT NULL,
  -- Siempre 'estado_obra': permite la FK compuesta que impide usar un ítem de otro catálogo.
  estado_tipo           text        GENERATED ALWAYS AS ('estado_obra') STORED,
  responsable           text,
  direccion             text,
  fecha_inicio          date,
  fecha_termino         date,
  -- Monto del contrato en su moneda original (CLP sin decimales; UF hasta 4 decimales).
  moneda_contrato       text        NOT NULL DEFAULT 'CLP',
  monto_contrato        numeric(18, 4),
  -- Equivalente en CLP. En UF es una fotografía: monto × valor de la UF de `fecha_valor_uf`.
  monto_contrato_clp    numeric(18, 0),
  fecha_valor_uf        date,
  valor_uf              numeric(18, 4),
  observaciones         text,
  version               integer     NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            bigint REFERENCES nomade.usuario (id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            bigint REFERENCES nomade.usuario (id),
  eliminado_en          timestamptz,
  eliminado_por         bigint REFERENCES nomade.usuario (id),
  CONSTRAINT fk_obra_estado FOREIGN KEY (estado_id, estado_tipo)
    REFERENCES nomade.catalogo (id, tipo),
  CONSTRAINT ck_obra_codigo CHECK (codigo_centro_costo ~ '^[A-Z0-9][A-Z0-9._-]{1,19}$'),
  CONSTRAINT ck_obra_nombre CHECK (length(btrim(nombre)) >= 2),
  CONSTRAINT ck_obra_fechas CHECK (
    fecha_inicio IS NULL OR fecha_termino IS NULL OR fecha_termino >= fecha_inicio
  ),
  CONSTRAINT ck_obra_moneda CHECK (moneda_contrato IN ('CLP', 'UF')),
  CONSTRAINT ck_obra_monto_positivo CHECK (monto_contrato IS NULL OR monto_contrato >= 0),
  CONSTRAINT ck_obra_monto_coherente CHECK (
    (monto_contrato IS NULL AND monto_contrato_clp IS NULL
       AND valor_uf IS NULL AND fecha_valor_uf IS NULL)
    OR (moneda_contrato = 'CLP' AND monto_contrato IS NOT NULL
       AND monto_contrato = trunc(monto_contrato)
       AND monto_contrato_clp IS NOT NULL
       AND valor_uf IS NULL AND fecha_valor_uf IS NULL)
    OR (moneda_contrato = 'UF' AND monto_contrato IS NOT NULL
       AND monto_contrato_clp IS NOT NULL
       AND valor_uf IS NOT NULL AND valor_uf > 0 AND fecha_valor_uf IS NOT NULL)
  )
);

-- El centro de costo es único entre las obras vigentes.
CREATE UNIQUE INDEX ux_obra_codigo_centro_costo ON nomade.obra (codigo_centro_costo) WHERE eliminado_en IS NULL;
CREATE INDEX ix_obra_cliente ON nomade.obra (cliente_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_obra_estado ON nomade.obra (estado_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_obra_nombre ON nomade.obra (lower(nombre)) WHERE eliminado_en IS NULL;

CREATE TRIGGER trg_obra_updated_at
  BEFORE UPDATE ON nomade.obra
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.obra IS 'Obra / centro de costo único. Borrado lógico solo en estado "en preparación".';
COMMENT ON COLUMN nomade.obra.monto_contrato_clp IS 'Equivalente en CLP; en contratos en UF es una fotografía con valor_uf de fecha_valor_uf.';

-- ---------------------------------------------------------------------------
-- parametro (definición) + parametro_valor (versiones con vigencia)
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.parametro (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo      text        NOT NULL,
  nombre      text        NOT NULL,
  descripcion text,
  categoria   text        NOT NULL,
  tipo_valor  text        NOT NULL,
  unidad      text,
  -- Sube con cada versión de valor agregada (control optimista).
  version     integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  bigint REFERENCES nomade.usuario (id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_parametro_codigo UNIQUE (codigo),
  CONSTRAINT ck_parametro_codigo CHECK (codigo ~ '^[a-z][a-z0-9_]{1,59}$'),
  CONSTRAINT ck_parametro_tipo CHECK (tipo_valor IN ('porcentaje', 'entero', 'decimal', 'texto'))
);

CREATE TRIGGER trg_parametro_updated_at
  BEFORE UPDATE ON nomade.parametro
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.parametro IS 'Definición de parámetros del sistema (P27). Solo el admin los consulta y modifica.';

-- Cada fila es una versión del valor. Una versión rige desde `vigente_desde` hasta el día
-- anterior a la siguiente versión (sin traslapes por construcción). Las versiones ya vigentes
-- no se modifican: se agrega una nueva.
CREATE TABLE nomade.parametro_valor (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parametro_id   bigint      NOT NULL REFERENCES nomade.parametro (id),
  valor_numerico numeric(18, 4),
  valor_texto    text,
  vigente_desde  date        NOT NULL,
  motivo         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_parametro_valor_desde UNIQUE (parametro_id, vigente_desde),
  CONSTRAINT ck_parametro_valor_uno CHECK (
    (valor_numerico IS NOT NULL AND valor_texto IS NULL)
    OR (valor_numerico IS NULL AND valor_texto IS NOT NULL)
  )
);

COMMENT ON TABLE nomade.parametro_valor IS 'Historial de valores de cada parámetro con su fecha de inicio de vigencia.';

-- Parámetros base PROVISORIOS (supuesto): IVA vigente en Chile y los plazos de alerta de Q10.
INSERT INTO nomade.parametro (codigo, nombre, descripcion, categoria, tipo_valor, unidad) VALUES
  ('iva', 'IVA', 'Tasa del impuesto al valor agregado aplicada a los documentos afectos.', 'Impuestos', 'porcentaje', '%'),
  ('plazo_pago_proveedores_dias', 'Plazo de pago a proveedores', 'Días corridos desde la fecha de la factura hasta su vencimiento (Q10).', 'Compras', 'entero', 'días'),
  ('alerta_vencimiento_dias_antes', 'Aviso previo de vencimiento', 'Días antes del vencimiento de una factura en que se genera la alerta (Q10).', 'Compras', 'entero', 'días');

INSERT INTO nomade.parametro_valor (parametro_id, valor_numerico, vigente_desde, motivo)
SELECT p.id, v.valor, DATE '2003-01-01', 'Valor inicial provisorio'
FROM nomade.parametro p
JOIN (VALUES ('iva', 19), ('plazo_pago_proveedores_dias', 30), ('alerta_vencimiento_dias_antes', 5))
  AS v (codigo, valor) ON v.codigo = p.codigo;

-- ---------------------------------------------------------------------------
-- valor_uf: valor diario de la UF para convertir montos UF ↔ CLP
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.valor_uf (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha      date          NOT NULL,
  valor      numeric(18, 4) NOT NULL,
  created_at timestamptz   NOT NULL DEFAULT now(),
  created_by bigint REFERENCES nomade.usuario (id),
  updated_at timestamptz   NOT NULL DEFAULT now(),
  updated_by bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_valor_uf_fecha UNIQUE (fecha),
  CONSTRAINT ck_valor_uf_positivo CHECK (valor > 0)
);

CREATE TRIGGER trg_valor_uf_updated_at
  BEFORE UPDATE ON nomade.valor_uf
  FOR EACH ROW EXECUTE FUNCTION nomade.fn_set_updated_at();

COMMENT ON TABLE nomade.valor_uf IS 'Valor de la UF por día. Se carga manualmente (admin); la integración automática queda para después.';

-- ---------------------------------------------------------------------------
-- adjunto: metadatos; los archivos viven en el volumen local (ADJUNTOS_DIR) y se descargan
-- solo por la API autenticada (D-16). La referencia a la entidad es polimórfica
-- (entidad_tipo, entidad_id) y la existencia la valida el servicio.
-- ---------------------------------------------------------------------------
CREATE TABLE nomade.adjunto (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entidad_tipo         text        NOT NULL,
  entidad_id           bigint      NOT NULL,
  nombre_original      text        NOT NULL,
  clave_almacenamiento text        NOT NULL,
  tipo_mime            text        NOT NULL,
  extension            text        NOT NULL,
  tamanio_bytes        bigint      NOT NULL,
  sha256               text        NOT NULL,
  descripcion          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           bigint REFERENCES nomade.usuario (id),
  eliminado_en         timestamptz,
  eliminado_por        bigint REFERENCES nomade.usuario (id),
  CONSTRAINT ux_adjunto_clave UNIQUE (clave_almacenamiento),
  CONSTRAINT ck_adjunto_entidad CHECK (entidad_tipo IN ('obra', 'proveedor', 'cliente')),
  CONSTRAINT ck_adjunto_extension CHECK (extension IN ('pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'csv')),
  -- D-16: hasta 20 MB.
  CONSTRAINT ck_adjunto_tamanio CHECK (tamanio_bytes > 0 AND tamanio_bytes <= 20971520)
);

CREATE INDEX ix_adjunto_entidad ON nomade.adjunto (entidad_tipo, entidad_id) WHERE eliminado_en IS NULL;

COMMENT ON TABLE nomade.adjunto IS 'Metadatos de archivos adjuntos (PDF/JPG/PNG/XLSX/CSV, ≤ 20 MB). Borrado lógico: el archivo se conserva.';

-- Down Migration

DROP TABLE nomade.adjunto;
DROP TABLE nomade.valor_uf;
DROP TABLE nomade.parametro_valor;
DROP TABLE nomade.parametro;
DROP TABLE nomade.obra;
DROP TABLE nomade.proveedor_cuenta_bancaria;
DROP TABLE nomade.proveedor;
DROP TABLE nomade.cliente;
DROP TABLE nomade.catalogo;
DROP FUNCTION nomade.fn_rut_valido(text);
