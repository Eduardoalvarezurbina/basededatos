ALTER TABLE Pedidos
ADD COLUMN fecha_agendamiento DATE,
ADD COLUMN lugar_entrega VARCHAR(255),
ADD COLUMN tipo_entrega VARCHAR(50),
ADD COLUMN observacion TEXT;