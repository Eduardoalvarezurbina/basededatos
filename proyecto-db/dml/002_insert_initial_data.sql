-- Migración DML: Inserta datos iniciales en las tablas de catálogo.

-- Insertar Ciudades
INSERT INTO Ciudades (nombre_ciudad) VALUES 
('Chiguayante'),
('Penco'),
('Tomé'),
('Dichato'),
('Lota'),
('San Pedro'),
('Los Ángeles'),
('Parral'),
('Linares'),
('Talca'),
('Puerto Montt'),
('Chiloé'),
('San Carlos'),
('Concepción');

-- Insertar Tipos de Pago
INSERT INTO Tipos_Pago (nombre_tipo_pago) VALUES
('Efectivo'),
('Transferencia'),
('Transbank');
