-- Migración DML: Insertar compras de prueba

-- Asumiendo que id_proveedor 1, 2, 3 existen de 020_insert_test_suppliers.sql
-- Asumiendo que id_formato_producto existen de 003_insert_products.sql
-- Asumiendo que id_tipo_pago 1 (Efectivo) existe de 002_insert_initial_data.sql

INSERT INTO Compras (id_proveedor, id_tipo_pago, neto, iva, total, observacion, con_factura, con_iva, fecha) VALUES
((SELECT id_proveedor FROM Proveedores WHERE nombre = 'Proveedor A S.A.'), 1, 100000, 19000, 119000, 'Compra semanal de frutas', TRUE, TRUE, CURRENT_DATE - INTERVAL '7 days'),
((SELECT id_proveedor FROM Proveedores WHERE nombre = 'Distribuidora B Ltda.'), 1, 50000, 0, 50000, 'Compra de pulpas sin factura', FALSE, FALSE, CURRENT_DATE - INTERVAL '5 days');

-- Detalles de la primera compra
INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_unitario, id_lote) VALUES
((SELECT id_compra FROM Compras WHERE observacion = 'Compra semanal de frutas'), (SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entera' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Frambuesa')), 50, 2000, NULL),
((SELECT id_compra FROM Compras WHERE observacion = 'Compra semanal de frutas'), (SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entero' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Arandano')), 25, 2000, NULL);

-- Detalles de la segunda compra
INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_unitario, id_lote) VALUES
((SELECT id_compra FROM Compras WHERE observacion = 'Compra de pulpas sin factura'), (SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Pulpa' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Piña')), 20, 2500, NULL);
