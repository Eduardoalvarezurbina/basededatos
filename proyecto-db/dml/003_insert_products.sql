-- Migración DML: Insertar Productos y Formatos

-- Paso 1: Insertar los productos base en la tabla Productos
-- Se asume 'kg' como unidad general, se puede ajustar luego.
INSERT INTO Productos (nombre, categoria) VALUES
('Frambuesa', 'Fruta Congelada'),
('Arandano', 'Fruta Congelada'),
('Frutilla', 'Fruta Congelada'),
('Mora', 'Fruta Congelada'),
('Mix de berries', 'Fruta Congelada'),
('Crumble', 'Fruta Congelada'),
('Mango', 'Fruta Congelada'),
('Piña', 'Fruta Congelada'),
('Maracuya con pepa', 'Fruta Congelada'),
('Maracuya sin pepa', 'Fruta Congelada'),
('Melón Tuna', 'Fruta Congelada'),
('Pulpa frambuesa', 'Pulpa'),
('Pulpa frutilla', 'Pulpa'),
('Pulpa Piña', 'Pulpa'),
('Pulpa Mango', 'Pulpa'),
('Pulpa Chirimoya', 'Pulpa'),
('Pulpa Lúcuma', 'Pulpa'),
('Jugo de Limón', 'Jugos'),
('Empanada queso normal', 'Elaborado'),
('Sopaipilla Normal', 'Elaborado'),
('Sopaipilla Coctel', 'Elaborado'),
('Empanada queso coctel', 'Elaborado'),
('Pasta de choclo', 'Elaborado');

-- Paso 2: Insertar los formatos y precios, vinculando con la tabla Productos
-- Los precios se extraen del archivo Precios.csv
INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto)
VALUES
((SELECT id_producto FROM Productos WHERE nombre = 'Frambuesa'), 'Entera', 4900, 4700),
((SELECT id_producto FROM Productos WHERE nombre = 'Arandano'), 'Entero', 3800, 3600),
((SELECT id_producto FROM Productos WHERE nombre = 'Frutilla'), 'Entera', 3000, 2500),
((SELECT id_producto FROM Productos WHERE nombre = 'Mora'), 'Entera', 2900, 2700),
((SELECT id_producto FROM Productos WHERE nombre = 'Crumble'), 'Crumble', 4200, 4000),
((SELECT id_producto FROM Productos WHERE nombre = 'Mix de berries'), 'Mix', 3700, 3500),
((SELECT id_producto FROM Productos WHERE nombre = 'Mango'), 'Entero', 4200, 4000),
((SELECT id_producto FROM Productos WHERE nombre = 'Piña'), 'Entera', 4000, 3800),
((SELECT id_producto FROM Productos WHERE nombre = 'Maracuya con pepa'), 'Con pepa', 6000, 6000),
((SELECT id_producto FROM Productos WHERE nombre = 'Maracuya sin pepa'), 'Sin pepa', 6000, 6000),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa frambuesa'), 'Pulpa', 4500, 4500),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa frutilla'), 'Pulpa', 3000, 3000),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Piña'), 'Pulpa', 3500, 3500),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Mango'), 'Pulpa', 4000, 4000),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Chirimoya'), 'Pulpa', 6000, 6000),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Lúcuma'), 'Pulpa', 7000, 7000),
((SELECT id_producto FROM Productos WHERE nombre = 'Jugo de Limón'), 'Botella', 3500, 3500),
((SELECT id_producto FROM Productos WHERE nombre = 'Empanada queso normal'), 'Normal', 3000, 3000),
((SELECT id_producto FROM Productos WHERE nombre = 'Sopaipilla Coctel'), 'Coctel', 2000, 2000);