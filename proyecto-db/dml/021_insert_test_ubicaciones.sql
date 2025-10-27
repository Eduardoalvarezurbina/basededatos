-- Migración DML: Insertar ubicaciones de inventario de prueba

INSERT INTO Ubicaciones_Inventario (nombre, id_ciudad) VALUES
('Planta San Carlos', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'San Carlos')),
('Casa San Carlos', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'San Carlos')),
('Conce Centro', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Concepción'));