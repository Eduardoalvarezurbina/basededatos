-- Migración DML: Insertar proveedores de prueba

INSERT INTO Proveedores (nombre, rut, telefono, id_ciudad) VALUES
('Proveedor A S.A.', '76123456-7', '56911112222', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Chiguayante')),
('Distribuidora B Ltda.', '76987654-3', '56933334444', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Penco')),
('Frutas Frescas C', '77001122-9', '56955556666', (SELECT id_ciudad FROM Ciudades WHERE nombre_ciudad = 'Tomé'));