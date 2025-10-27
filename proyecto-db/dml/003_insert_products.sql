-- Migración DML: Insertar Productos y Formatos

-- Paso 1: Insertar los productos base en la tabla Productos
-- Se asume 'kg' como unidad general, se puede ajustar luego.
INSERT INTO Productos (nombre, categoria, unidad_medida) VALUES
('Frambuesa', 'Fruta Congelada', 'kg'),
('Arandano', 'Fruta Congelada', 'kg'),
('Frutilla', 'Fruta Congelada', 'kg'),
('Mora', 'Fruta Congelada', 'kg'),
('Mix de berries', 'Fruta Congelada', 'kg'),
('Crumble', 'Fruta Congelada', 'kg'),
('Mango', 'Fruta Congelada', 'kg'),
('Piña', 'Fruta Congelada', 'kg'),
('Maracuya con pepa', 'Fruta Congelada', 'kg'),
('Maracuya sin pepa', 'Fruta Congelada', 'kg'),
('Melón Tuna', 'Fruta Congelada', 'kg'),
('Pulpa frambuesa', 'Pulpa', 'kg'),
('Pulpa frutilla', 'Pulpa', 'kg'),
('Pulpa Piña', 'Pulpa', 'kg'),
('Pulpa Mango', 'Pulpa', 'kg'),
('Pulpa Chirimoya', 'Pulpa', 'kg'),
('Pulpa Lúcuma', 'Pulpa', 'kg'),
('Jugo de Limón', 'Jugos', 'lt'),
('Empanada queso normal', 'Elaborado', 'unidad'),
('Sopaipilla Normal', 'Elaborado', 'unidad'),
('Sopaipilla Coctel', 'Elaborado', 'unidad'),
('Empanada queso coctel', 'Elaborado', 'unidad'),
('Pasta de choclo', 'Elaborado', 'kg');

-- Paso 2: Insertar los formatos y precios, vinculando con la tabla Productos
-- Los precios se extraen del archivo Precios.csv
INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, unidad_medida)
VALUES
((SELECT id_producto FROM Productos WHERE nombre = 'Frambuesa'), 'Entera', 4900, 4700, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Arandano'), 'Entero', 3800, 3600, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Frutilla'), 'Entera', 3000, 2500, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Mora'), 'Entera', 2900, 2700, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Crumble'), 'Crumble', 4200, 4000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Mix de berries'), 'Mix', 3700, 3500, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Mango'), 'Entero', 4200, 4000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Piña'), 'Entera', 4000, 3800, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Maracuya con pepa'), 'Con pepa', 6000, 6000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Maracuya sin pepa'), 'Sin pepa', 6000, 6000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa frambuesa'), 'Pulpa', 4500, 4500, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa frutilla'), 'Pulpa', 3000, 3000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Piña'), 'Pulpa', 3500, 3500, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Mango'), 'Pulpa', 4000, 4000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Chirimoya'), 'Pulpa', 6000, 6000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Pulpa Lúcuma'), 'Pulpa', 7000, 7000, 'kg'),
((SELECT id_producto FROM Productos WHERE nombre = 'Jugo de Limón'), 'Botella', 3500, 3500, 'lt'),
((SELECT id_producto FROM Productos WHERE nombre = 'Empanada queso normal'), 'Normal', 3000, 3000, 'unidad'),
((SELECT id_producto FROM Productos WHERE nombre = 'Sopaipilla Coctel'), 'Coctel', 2000, 2000, 'unidad');