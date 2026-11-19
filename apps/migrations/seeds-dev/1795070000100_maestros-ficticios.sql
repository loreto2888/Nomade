-- Up Migration

-- Datos FICTICIOS de desarrollo para la fase 2 (maestros y obras). Solo local: nunca en producción.
-- Las obras y los nombres salen del prototipo (apps/prototipo). Los RUT son inventados pero con dígito
-- verificador válido; el número de cuenta bancaria es falso. Idempotente: no duplica si ya existen.

-- Clientes
INSERT INTO nomade.cliente (rut, razon_social, nombre_fantasia, giro, contacto_nombre, correo, telefono, direccion)
VALUES
  ('76086428-5', 'Grupo Andino SpA', 'Grupo Andino', 'Retail y centros comerciales', 'Marta Soto', 'marta.soto@grupoandino.example', '+56 2 2345 6789', 'Av. Apoquindo 4500, Las Condes'),
  ('77123456-9', 'Inmobiliaria Central S.A.', 'Inmobiliaria Central', 'Desarrollo inmobiliario', 'Pablo Reyes', 'pablo.reyes@inmocentral.example', '+56 2 2456 7890', 'Av. Libertador Bernardo O''Higgins 1302, Santiago'),
  ('76543210-3', 'Comercial Austral Ltda.', 'Comercial Austral', 'Comercio minorista', 'Lucía Fuentes', 'lucia.fuentes@australcom.example', '+56 2 2567 8901', 'Providencia 1208, Providencia')
ON CONFLICT (rut) WHERE eliminado_en IS NULL DO NOTHING;

-- Proveedores (los del prototipo)
INSERT INTO nomade.proveedor (rut, razon_social, nombre_fantasia, giro, contacto_nombre, correo, telefono, direccion)
VALUES
  ('96512340-7', 'Materiales Cordillera S.A.', 'Materiales Cordillera', 'Venta de materiales de construcción', 'Juan Pérez', 'ventas@cordillera.example', '+56 2 2678 9012', 'Camino a Melipilla 8900, Maipú'),
  ('76222333-3', 'Instalaciones Sur Ltda.', 'Instalaciones Sur', 'Instalaciones eléctricas y sanitarias', 'Rodrigo Mena', 'contacto@instalacionessur.example', '+56 2 2789 0123', 'Gran Avenida 5400, San Miguel'),
  ('77888999-4', 'Acabados del Valle SpA', 'Acabados del Valle', 'Terminaciones y revestimientos', 'Carolina Vidal', 'carolina@acabadosvalle.example', '+56 2 2890 1234', 'Av. Vicuña Mackenna 3100, Ñuñoa')
ON CONFLICT (rut) WHERE eliminado_en IS NULL DO NOTHING;

-- Una cuenta bancaria ficticia (solo el admin la ve desde la plataforma)
INSERT INTO nomade.proveedor_cuenta_bancaria
  (proveedor_id, banco, tipo_cuenta, numero_cuenta, titular, titular_rut, correo_notificacion, principal)
SELECT p.id, 'Banco de Chile', 'corriente', '000123456789', p.razon_social, p.rut, 'pagos@cordillera.example', true
FROM nomade.proveedor p
WHERE p.rut = '96512340-7' AND p.eliminado_en IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM nomade.proveedor_cuenta_bancaria c
    WHERE c.proveedor_id = p.id AND c.numero_cuenta = '000123456789' AND c.eliminado_en IS NULL
  );

-- Valores de la UF ficticios (≈ +15 pesos por día alrededor del 19-11-2026) para probar contratos en UF
INSERT INTO nomade.valor_uf (fecha, valor)
SELECT d::date, round(39284.8712 + (d::date - DATE '2026-11-19') * 15.2, 4)
FROM generate_series(DATE '2026-10-20', DATE '2026-12-31', INTERVAL '1 day') AS d
ON CONFLICT (fecha) DO NOTHING;

-- Obras del prototipo («En ejecución» = activa; «En cierre» = terminada). Oficinas Nueva Vista pacta en UF.
INSERT INTO nomade.obra
  (codigo_centro_costo, nombre, cliente_id, estado_id, responsable, direccion, fecha_inicio, fecha_termino,
   moneda_contrato, monto_contrato, monto_contrato_clp, fecha_valor_uf, valor_uf)
SELECT v.codigo, v.nombre, c.id, e.id, v.responsable, v.direccion, v.inicio::date, v.termino::date,
       v.moneda, v.monto, v.monto_clp, v.fecha_uf::date, v.valor_uf
FROM (VALUES
  ('CC-001', 'Local Parque Norte',          '76086428-5', 'activa',     'Camila Rojas', 'Av. Parque Norte 1234, Santiago',   '2026-03-01', '2026-12-15', 'CLP', 185000000::numeric, 185000000::numeric, NULL,         NULL::numeric),
  ('CC-002', 'Oficinas Nueva Vista',        '77123456-9', 'activa',     'Tomás Silva',  'Nueva Vista 880, Providencia',      '2026-05-04', '2027-02-26', 'UF',  4710.5::numeric,    185051386::numeric,    '2026-11-19', 39284.8712::numeric),
  ('CC-003', 'Tienda Los Robles',           '76086428-5', 'activa',     'Daniela Soto', 'Los Robles 2210, Ñuñoa',            '2026-06-15', '2027-01-29', 'CLP', 96000000::numeric,  96000000::numeric,     NULL,         NULL::numeric),
  ('CC-004', 'Habilitación Providencia',    '76543210-3', 'terminada',  'Javier Díaz',  'Providencia 1208, Providencia',     '2026-01-12', '2026-10-30', 'CLP', 54000000::numeric,  54000000::numeric,     NULL,         NULL::numeric)
) AS v (codigo, nombre, cliente_rut, estado, responsable, direccion, inicio, termino, moneda, monto, monto_clp, fecha_uf, valor_uf)
JOIN nomade.cliente c ON c.rut = v.cliente_rut AND c.eliminado_en IS NULL
JOIN nomade.catalogo e ON e.tipo = 'estado_obra' AND e.codigo = v.estado
ON CONFLICT (codigo_centro_costo) WHERE eliminado_en IS NULL DO NOTHING;

-- Down Migration

DELETE FROM nomade.obra WHERE codigo_centro_costo IN ('CC-001', 'CC-002', 'CC-003', 'CC-004');
DELETE FROM nomade.valor_uf WHERE fecha BETWEEN DATE '2026-10-20' AND DATE '2026-12-31';
DELETE FROM nomade.proveedor_cuenta_bancaria
  WHERE proveedor_id IN (SELECT id FROM nomade.proveedor WHERE rut = '96512340-7')
    AND numero_cuenta = '000123456789';
DELETE FROM nomade.proveedor WHERE rut IN ('96512340-7', '76222333-3', '77888999-4');
DELETE FROM nomade.cliente WHERE rut IN ('76086428-5', '77123456-9', '76543210-3');
