-- Migración DML: Insertar ubicaciones de inventario de prueba

INSERT INTO Ubicaciones_Inventario (id_ubicacion, nombre, id_ciudad) VALUES
(1, 'Bodega Principal', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'San Carlos')),
(2, 'Tienda', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Concepción')) ON CONFLICT (id_ubicacion) DO NOTHING;