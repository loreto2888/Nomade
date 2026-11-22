-- Up Migration

-- Datos FICTICIOS de desarrollo para la fase 4 (compras). Solo local: nunca en producción.
-- Inspirados en el prototipo (OT-012 Instalaciones Sur $ 28 M; OC de Materiales Cordillera):
--   · CC-001: cotización aprobada de Instalaciones Sur ($ 28.000.000) → OT aprobada con hitos 30/40/30.
--             OC parcial aprobada del hito 1 (30 % = $ 8.400.000) con su compromiso en el libro.
--             OC de materiales de Materiales Cordillera en revisión ($ 12.800.000 neto).
-- Requiere un usuario (el administrador inicial). Idempotente: no hace nada si CC-001 ya tiene
-- cotizaciones. Los documentos pasan por los mismos estados que en la aplicación (los disparadores
-- de la migración `compras` validan cada transición).

DO $$
DECLARE
  autor bigint;
  obra bigint;
  contratista bigint;
  proveedor bigint;
  subcontratos bigint;
  materiales bigint;
  cot bigint;
  ot bigint;
  hito1 bigint;
  oc bigint;
  folio_oc bigint;
  oc_mat bigint;
BEGIN
  SELECT id INTO autor FROM nomade.usuario ORDER BY id LIMIT 1;
  IF autor IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios: arranca el backend una vez (crea el administrador inicial con ADMIN_EMAIL y ADMIN_PASSWORD) y vuelve a ejecutar npm run db:seed.';
  END IF;
  SELECT id INTO obra FROM nomade.obra WHERE codigo_centro_costo = 'CC-001' AND eliminado_en IS NULL;
  SELECT id INTO contratista FROM nomade.proveedor WHERE rut = '76222333-3' AND eliminado_en IS NULL;
  SELECT id INTO proveedor FROM nomade.proveedor WHERE rut = '96512340-7' AND eliminado_en IS NULL;
  IF obra IS NULL OR contratista IS NULL OR proveedor IS NULL
     OR EXISTS (SELECT 1 FROM nomade.cotizacion WHERE obra_id = obra) THEN
    RETURN;
  END IF;
  SELECT id INTO subcontratos FROM nomade.catalogo WHERE tipo = 'categoria_gasto' AND codigo = 'subcontratos';
  SELECT id INTO materiales FROM nomade.catalogo WHERE tipo = 'categoria_gasto' AND codigo = 'materiales';

  -- Cotización → aprobada
  UPDATE nomade.folio SET ultimo = ultimo + 1 WHERE tipo = 'cotizacion' RETURNING ultimo INTO cot;
  INSERT INTO nomade.cotizacion
    (numero, obra_id, proveedor_id, referencia_proveedor, fecha, validez_hasta, descripcion,
     categoria_gasto_id, monto_neto, created_by, updated_by)
  VALUES (cot, obra, contratista, 'IS-2026-118', DATE '2026-10-28', DATE '2026-11-30',
          'Instalaciones eléctricas y sanitarias del local (dato ficticio)', subcontratos, 28000000, autor, autor)
  RETURNING id INTO cot;
  UPDATE nomade.cotizacion SET estado = 'en_revision', enviado_en = now(), enviado_por = autor WHERE id = cot;
  UPDATE nomade.cotizacion SET estado = 'aprobada', resuelto_en = now(), resuelto_por = autor WHERE id = cot;

  -- OT con hitos 30/40/30 → aprobada
  UPDATE nomade.folio SET ultimo = ultimo + 1 WHERE tipo = 'orden_trabajo' RETURNING ultimo INTO ot;
  INSERT INTO nomade.orden_trabajo
    (numero, obra_id, proveedor_id, cotizacion_id, descripcion, categoria_gasto_id, monto_neto,
     fecha_inicio, fecha_termino, created_by, updated_by)
  VALUES (ot, obra, contratista, cot, 'Instalaciones eléctricas y sanitarias del local (dato ficticio)',
          subcontratos, 28000000, DATE '2026-11-02', DATE '2026-12-11', autor, autor)
  RETURNING id INTO ot;
  INSERT INTO nomade.orden_trabajo_hito (orden_trabajo_id, numero, descripcion, porcentaje, monto_neto, fecha_estimada, created_by)
  VALUES (ot, 1, 'Anticipo', 30, 8400000, DATE '2026-11-05', autor),
         (ot, 2, 'Avance de instalaciones', 40, 11200000, DATE '2026-11-27', autor),
         (ot, 3, 'Recepción conforme', 30, 8400000, DATE '2026-12-11', autor);
  UPDATE nomade.orden_trabajo SET estado = 'en_revision', enviado_en = now(), enviado_por = autor WHERE id = ot;
  UPDATE nomade.orden_trabajo SET estado = 'aprobada', resuelto_en = now(), resuelto_por = autor WHERE id = ot;
  SELECT id INTO hito1 FROM nomade.orden_trabajo_hito WHERE orden_trabajo_id = ot AND numero = 1;

  -- OC parcial del hito 1 → aprobada, con su compromiso
  UPDATE nomade.folio SET ultimo = ultimo + 1 WHERE tipo = 'orden_compra' RETURNING ultimo INTO folio_oc;
  INSERT INTO nomade.orden_compra
    (numero, tipo, obra_id, proveedor_id, orden_trabajo_id, hito_id, porcentaje, categoria_gasto_id,
     fecha, descripcion, tasa_iva, monto_neto, monto_iva, monto_total, created_by, updated_by)
  VALUES (folio_oc, 'parcial_ot', obra, contratista, ot, hito1, 30, subcontratos, DATE '2026-11-05',
          'Anticipo — 30 % de la OT', 19, 8400000, 1596000, 9996000, autor, autor)
  RETURNING id INTO oc;
  UPDATE nomade.orden_compra SET estado = 'en_revision', enviado_en = now(), enviado_por = autor WHERE id = oc;
  UPDATE nomade.orden_compra SET estado = 'aprobada', resuelto_en = now(), resuelto_por = autor WHERE id = oc;
  INSERT INTO nomade.movimiento
    (fecha, tipo, obra_id, proveedor_id, categoria_gasto_id, origen_tipo, origen_id, monto_clp, descripcion, created_by)
  VALUES (DATE '2026-11-05', 'compromiso', obra, contratista, subcontratos, 'orden_compra', oc, 8400000,
          'Compromiso OC-' || lpad(folio_oc::text, 6, '0'), autor);

  -- OC de materiales → en revisión
  UPDATE nomade.folio SET ultimo = ultimo + 1 WHERE tipo = 'orden_compra' RETURNING ultimo INTO oc_mat;
  INSERT INTO nomade.orden_compra
    (numero, tipo, obra_id, proveedor_id, categoria_gasto_id, fecha, fecha_entrega, descripcion,
     tasa_iva, monto_neto, monto_iva, monto_total, created_by, updated_by)
  VALUES (oc_mat, 'materiales', obra, proveedor, materiales, DATE '2026-11-18', DATE '2026-11-25',
          'Materiales de obra gruesa (dato ficticio)', 19, 12800000, 2432000, 15232000, autor, autor)
  RETURNING id INTO oc_mat;
  INSERT INTO nomade.orden_compra_linea (orden_compra_id, numero, descripcion, unidad, cantidad, precio_unitario, total, created_by)
  VALUES (oc_mat, 1, 'Cemento especial 25 kg', 'saco', 800, 6500, 5200000, autor),
         (oc_mat, 2, 'Fierro estriado 12 mm', 'barra', 600, 9000, 5400000, autor),
         (oc_mat, 3, 'Malla acma C-92', 'un', 200, 11000, 2200000, autor);
  UPDATE nomade.orden_compra SET estado = 'en_revision', enviado_en = now(), enviado_por = autor WHERE id = oc_mat;
END
$$;

-- Down Migration

-- Los documentos de compra y el libro no admiten DELETE (disparadores): se desactivan solo para limpiar.
ALTER TABLE nomade.movimiento DISABLE TRIGGER USER;
ALTER TABLE nomade.orden_compra DISABLE TRIGGER USER;
ALTER TABLE nomade.orden_compra_linea DISABLE TRIGGER USER;
ALTER TABLE nomade.orden_trabajo DISABLE TRIGGER USER;
ALTER TABLE nomade.orden_trabajo_hito DISABLE TRIGGER USER;
ALTER TABLE nomade.cotizacion DISABLE TRIGGER USER;

DELETE FROM nomade.movimiento m USING nomade.orden_compra oc
WHERE m.origen_tipo = 'orden_compra' AND m.origen_id = oc.id
  AND oc.descripcion IN ('Anticipo — 30 % de la OT', 'Materiales de obra gruesa (dato ficticio)');
DELETE FROM nomade.orden_compra_linea l USING nomade.orden_compra oc
WHERE l.orden_compra_id = oc.id AND oc.descripcion = 'Materiales de obra gruesa (dato ficticio)';
DELETE FROM nomade.orden_compra
WHERE descripcion IN ('Anticipo — 30 % de la OT', 'Materiales de obra gruesa (dato ficticio)');
DELETE FROM nomade.orden_trabajo_hito h USING nomade.orden_trabajo ot
WHERE h.orden_trabajo_id = ot.id AND ot.descripcion = 'Instalaciones eléctricas y sanitarias del local (dato ficticio)';
DELETE FROM nomade.orden_trabajo WHERE descripcion = 'Instalaciones eléctricas y sanitarias del local (dato ficticio)';
DELETE FROM nomade.cotizacion WHERE descripcion = 'Instalaciones eléctricas y sanitarias del local (dato ficticio)';

ALTER TABLE nomade.movimiento ENABLE TRIGGER USER;
ALTER TABLE nomade.orden_compra ENABLE TRIGGER USER;
ALTER TABLE nomade.orden_compra_linea ENABLE TRIGGER USER;
ALTER TABLE nomade.orden_trabajo ENABLE TRIGGER USER;
ALTER TABLE nomade.orden_trabajo_hito ENABLE TRIGGER USER;
ALTER TABLE nomade.cotizacion ENABLE TRIGGER USER;
