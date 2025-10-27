-- Migración DML: Insertar pedidos y ventas de prueba

-- Asumiendo que id_cliente existen de 004_insert_clients_part1_only.sql
-- Asumiendo que id_formato_producto existen de 003_insert_products.sql
-- Asumiendo que id_tipo_pago 1 (Efectivo) existe de 002_insert_initial_data.sql
-- Asumiendo que id_ubicacion 1 y 2 existen de 021_insert_test_inventory.sql

-- Insertar un Pedido Agendado
INSERT INTO Pedidos (id_cliente, id_trabajador, total, estado, fecha) VALUES
((SELECT id_cliente FROM Clientes WHERE telefono = '56934073241' LIMIT 1), NULL, 10000, 'Agendado', CURRENT_DATE + INTERVAL '1 day');

INSERT INTO Detalle_Pedidos (id_pedido, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES
((SELECT id_pedido FROM Pedidos WHERE estado = 'Agendado' AND id_cliente = (SELECT id_cliente FROM Clientes WHERE telefono = '56934073241' LIMIT 1)), (SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entera' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Frambuesa')), 2, 5000, NULL, 2);

-- Insertar una Venta Directa
INSERT INTO Ventas (id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, fecha, hora) VALUES
((SELECT id_cliente FROM Clientes WHERE telefono = '56984917157' LIMIT 1), 1, 1, NULL, 7000, 1330, 8330, TRUE, 'Venta en tienda', 'Finalizada', 'Pagado', TRUE, CURRENT_DATE, CURRENT_TIME);

INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, costo_unitario_en_venta) VALUES
((SELECT id_venta FROM Ventas WHERE observacion = 'Venta en tienda' AND id_cliente = (SELECT id_cliente FROM Clientes WHERE telefono = '56984917157' LIMIT 1)), (SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entero' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Arandano')), 1, 7000, NULL, 3000);
