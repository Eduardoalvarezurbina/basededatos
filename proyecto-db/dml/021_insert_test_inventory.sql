-- Migración DML: Insertar inventario inicial de prueba

-- Asumiendo que id_ubicacion 1 es 'Bodega Principal' y 2 es 'Tienda'
-- Insertar stock para algunos formatos de producto existentes
INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES
((SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entera' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Frambuesa')), 1, 100, CURRENT_TIMESTAMP),
((SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Entero' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Arandano')), 1, 150, CURRENT_TIMESTAMP),
((SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Pulpa' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Piña')), 1, 50, CURRENT_TIMESTAMP),
((SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Mix' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Mix de berries')), 2, 30, CURRENT_TIMESTAMP),
((SELECT id_formato_producto FROM Formatos_Producto WHERE formato = 'Botella' AND id_producto = (SELECT id_producto FROM Productos WHERE nombre = 'Jugo de Limón')), 2, 20, CURRENT_TIMESTAMP);
