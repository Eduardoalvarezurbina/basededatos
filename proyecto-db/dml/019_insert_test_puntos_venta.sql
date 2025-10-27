-- Migración DML: Insertar puntos de venta de prueba

INSERT INTO Puntos_Venta (nombre, tipo, id_ciudad) VALUES
('Tienda Principal', 'Física', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Chiguayante')),
('Ventas Online', 'Virtual', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Concepción'));
