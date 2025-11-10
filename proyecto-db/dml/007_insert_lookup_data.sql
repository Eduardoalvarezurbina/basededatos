-- Migración DML: Inserta datos iniciales para tablas de lookup de clientes.

-- Insertar Canales_Compra
INSERT INTO Canales_Compra (nombre_canal) VALUES
('Online'),
('Tienda Física'),
('Red Social'),
('Referido');

-- Insertar Fuentes_Contacto
INSERT INTO Fuentes_Contacto (nombre_fuente) VALUES
('Web'),
('Recomendación'),
('Publicidad'),
('Evento');

-- Insertar Tipos_Cliente
INSERT INTO Tipos_Cliente (nombre_tipo) VALUES
('Mayorista'),
('Minorista'),
('Consumidor Final');
