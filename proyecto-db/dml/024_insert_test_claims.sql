-- Migración DML: Insertar reclamos de prueba

-- Asumiendo que id_cliente existen de 004_insert_clients_part1_only.sql
-- Asumiendo que id_venta existen de 023_insert_test_orders_sales.sql

INSERT INTO Reclamos (id_cliente, id_venta, descripcion, estado, fecha_reclamo) VALUES
((SELECT id_cliente FROM Clientes WHERE telefono = '56934073241' LIMIT 1), NULL, 'Producto llegó dañado en el pedido agendado.', 'Abierto', CURRENT_DATE),
((SELECT id_cliente FROM Clientes WHERE telefono = '56984917157' LIMIT 1), (SELECT id_venta FROM Ventas WHERE observacion = 'Venta en tienda' LIMIT 1), 'Arándanos con mal sabor.', 'En Proceso', CURRENT_DATE - INTERVAL '2 days');
