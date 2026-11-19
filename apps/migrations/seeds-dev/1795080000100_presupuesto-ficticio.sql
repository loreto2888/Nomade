-- Up Migration

-- Datos FICTICIOS de desarrollo para la fase 3 (presupuesto). Solo local: nunca en producción.
-- Parte de las partidas de ejemplo del prototipo (obras preliminares $ 18,5 M, instalaciones $ 45 M,
-- terminaciones $ 62 M, adicional de obra $ 8 M):
--   · CC-001 (CLP): versión 1 aprobada y vigente + versión 2 en borrador copiada de la 1 con cambios.
--   · CC-002 (UF):  versión 1 en borrador, valorizada con la UF de 2026-11-19.
-- Requiere un usuario (el administrador inicial se crea al arrancar el backend con ADMIN_EMAIL y
-- ADMIN_PASSWORD): la autoría y la aprobación quedan a su nombre. Idempotente por obra.

DO $$
DECLARE
  autor bigint;
  obra bigint;
  v1 bigint;
  v2 bigint;
  uf numeric(18, 4);
BEGIN
  SELECT id INTO autor FROM nomade.usuario ORDER BY id LIMIT 1;
  IF autor IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios: arranca el backend una vez (crea el administrador inicial con ADMIN_EMAIL y ADMIN_PASSWORD) y vuelve a ejecutar npm run db:seed.';
  END IF;

  -- ---------------------------------------------------------------- CC-001 (CLP)
  SELECT id INTO obra FROM nomade.obra WHERE codigo_centro_costo = 'CC-001' AND eliminado_en IS NULL;
  IF obra IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nomade.presupuesto_version WHERE obra_id = obra) THEN
    INSERT INTO nomade.presupuesto_version (obra_id, numero, descripcion, moneda, created_by, updated_by)
    VALUES (obra, 1, 'Presupuesto inicial (dato ficticio)', 'CLP', autor, autor)
    RETURNING id INTO v1;

    INSERT INTO nomade.partida
      (version_id, orden, codigo, familia_id, descripcion, unidad, cantidad, precio_unitario, total, total_clp, created_by, updated_by)
    SELECT v1, row_number() OVER (ORDER BY p.codigo), p.codigo, f.id, p.descripcion, p.unidad,
           p.cantidad, p.precio, p.cantidad * p.precio, p.cantidad * p.precio, autor, autor
    FROM (VALUES
      ('1.1', 'obras_preliminares', 'Instalación de faenas',                  'gl',    1::numeric,    4500000::numeric),
      ('1.2', 'obras_preliminares', 'Trazado y niveles',                      'm2',  850::numeric,       3200::numeric),
      ('1.3', 'obras_preliminares', 'Demoliciones y retiro de escombros',     'gl',    1::numeric,   11280000::numeric),
      ('2.1', 'obra_gruesa',        'Excavaciones y rellenos',                'm3',  420::numeric,       9500::numeric),
      ('2.2', 'obra_gruesa',        'Radier de hormigón e=10 cm',             'm2',  850::numeric,      18500::numeric),
      ('2.3', 'obra_gruesa',        'Tabiquería metálica',                    'm2',  620::numeric,      21000::numeric),
      ('3.1', 'instalaciones',      'Instalación eléctrica',                  'gl',    1::numeric,   24500000::numeric),
      ('3.2', 'instalaciones',      'Instalación sanitaria y gas',            'gl',    1::numeric,   20500000::numeric),
      ('4.1', 'terminaciones',      'Pavimento porcelanato',                  'm2',  700::numeric,      32000::numeric),
      ('4.2', 'terminaciones',      'Pinturas y revestimientos',              'm2', 1900::numeric,       7800::numeric),
      ('4.3', 'terminaciones',      'Cielos y luminarias',                    'm2',  700::numeric,      35400::numeric),
      ('5.1', 'gastos_generales',   'Gastos generales y administración de obra', 'gl', 1::numeric,   9600000::numeric)
    ) AS p (codigo, familia, descripcion, unidad, cantidad, precio)
    JOIN nomade.catalogo f ON f.tipo = 'familia_partida' AND f.codigo = p.familia;

    UPDATE nomade.presupuesto_version v
    SET total = t.total, total_clp = t.total_clp, cantidad_partidas = t.n
    FROM (SELECT sum(total) AS total, sum(total_clp) AS total_clp, count(*)::int AS n
          FROM nomade.partida WHERE version_id = v1) t
    WHERE v.id = v1;

    UPDATE nomade.presupuesto_version
    SET estado = 'en_revision', enviado_en = now(), enviado_por = autor
    WHERE id = v1;
    UPDATE nomade.presupuesto_version
    SET estado = 'aprobado', vigente = true, resuelto_en = now(), resuelto_por = autor,
        motivo_resolucion = 'Aprobado (dato ficticio)'
    WHERE id = v1;

    -- Versión 2: copia de la 1 en borrador, con una partida modificada y un adicional.
    INSERT INTO nomade.presupuesto_version (obra_id, numero, descripcion, moneda, copiada_de_id, created_by, updated_by)
    VALUES (obra, 2, 'Con adicional de obra (dato ficticio)', 'CLP', v1, autor, autor)
    RETURNING id INTO v2;

    INSERT INTO nomade.partida
      (version_id, orden, codigo, familia_id, descripcion, unidad, cantidad, precio_unitario, total, total_clp, created_by, updated_by)
    SELECT v2, orden, codigo, familia_id, descripcion, unidad, cantidad, precio_unitario, total, total_clp, autor, autor
    FROM nomade.partida WHERE version_id = v1;

    UPDATE nomade.partida
    SET cantidad = 900, total = 900 * precio_unitario, total_clp = 900 * precio_unitario
    WHERE version_id = v2 AND codigo = '2.2';

    INSERT INTO nomade.partida
      (version_id, orden, codigo, familia_id, descripcion, unidad, cantidad, precio_unitario, total, total_clp, created_by, updated_by)
    SELECT v2, 13, '6.1', f.id, 'Adicional de obra', 'gl', 1, 8000000, 8000000, 8000000, autor, autor
    FROM nomade.catalogo f WHERE f.tipo = 'familia_partida' AND f.codigo = 'adicionales';

    UPDATE nomade.presupuesto_version v
    SET total = t.total, total_clp = t.total_clp, cantidad_partidas = t.n
    FROM (SELECT sum(total) AS total, sum(total_clp) AS total_clp, count(*)::int AS n
          FROM nomade.partida WHERE version_id = v2) t
    WHERE v.id = v2;
  END IF;

  -- ---------------------------------------------------------------- CC-002 (UF)
  SELECT id INTO obra FROM nomade.obra WHERE codigo_centro_costo = 'CC-002' AND eliminado_en IS NULL;
  SELECT valor INTO uf FROM nomade.valor_uf WHERE fecha = DATE '2026-11-19';
  IF obra IS NOT NULL AND uf IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nomade.presupuesto_version WHERE obra_id = obra) THEN
    INSERT INTO nomade.presupuesto_version
      (obra_id, numero, descripcion, moneda, valor_uf, fecha_valor_uf, created_by, updated_by)
    VALUES (obra, 1, 'Presupuesto en UF (dato ficticio)', 'UF', uf, DATE '2026-11-19', autor, autor)
    RETURNING id INTO v1;

    INSERT INTO nomade.partida
      (version_id, orden, codigo, familia_id, descripcion, unidad, cantidad, precio_unitario, total, total_clp, created_by, updated_by)
    SELECT v1, row_number() OVER (ORDER BY p.codigo), p.codigo, f.id, p.descripcion, p.unidad,
           p.cantidad, p.precio, round(p.cantidad * p.precio, 4), round(round(p.cantidad * p.precio, 4) * uf, 0), autor, autor
    FROM (VALUES
      ('1.1', 'obras_preliminares', 'Instalación de faenas',                   'gl',    1::numeric,  120.5::numeric),
      ('2.1', 'obra_gruesa',        'Estructura y albañilería',                'm2',  640::numeric,    2.6::numeric),
      ('3.1', 'instalaciones',      'Instalaciones eléctricas y sanitarias',   'gl',    1::numeric, 780.25::numeric),
      ('4.1', 'terminaciones',      'Terminaciones interiores',                'm2',  520::numeric,   1.85::numeric)
    ) AS p (codigo, familia, descripcion, unidad, cantidad, precio)
    JOIN nomade.catalogo f ON f.tipo = 'familia_partida' AND f.codigo = p.familia;

    UPDATE nomade.presupuesto_version v
    SET total = t.total, total_clp = t.total_clp, cantidad_partidas = t.n
    FROM (SELECT sum(total) AS total, sum(total_clp) AS total_clp, count(*)::int AS n
          FROM nomade.partida WHERE version_id = v1) t
    WHERE v.id = v1;
  END IF;
END
$$;

-- Down Migration

-- Las versiones aprobadas son inmutables: se desactivan los disparadores solo para deshacer el seed.
ALTER TABLE nomade.partida DISABLE TRIGGER trg_partida_solo_en_borrador;
ALTER TABLE nomade.presupuesto_version DISABLE TRIGGER trg_presupuesto_version_inmutable;

DELETE FROM nomade.partida
WHERE version_id IN (
  SELECT v.id FROM nomade.presupuesto_version v
  JOIN nomade.obra o ON o.id = v.obra_id
  WHERE o.codigo_centro_costo IN ('CC-001', 'CC-002') AND v.descripcion LIKE '%(dato ficticio)'
);
DELETE FROM nomade.presupuesto_version
WHERE obra_id IN (SELECT id FROM nomade.obra WHERE codigo_centro_costo IN ('CC-001', 'CC-002'))
  AND descripcion LIKE '%(dato ficticio)'
  AND copiada_de_id IS NOT NULL;
DELETE FROM nomade.presupuesto_version
WHERE obra_id IN (SELECT id FROM nomade.obra WHERE codigo_centro_costo IN ('CC-001', 'CC-002'))
  AND descripcion LIKE '%(dato ficticio)';

ALTER TABLE nomade.presupuesto_version ENABLE TRIGGER trg_presupuesto_version_inmutable;
ALTER TABLE nomade.partida ENABLE TRIGGER trg_partida_solo_en_borrador;
