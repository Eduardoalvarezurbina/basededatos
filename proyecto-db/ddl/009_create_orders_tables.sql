-- Script de Migración para crear las tablas de Pedidos y Detalle_Pedidos
CREATE TABLE IF NOT EXISTS Pedidos (
    id_pedido SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT REFERENCES Clientes(id_cliente), -- Opcional por ahora
    id_trabajador INT REFERENCES Trabajadores(id_trabajador), -- Opcional por ahora
    estado VARCHAR(50) DEFAULT 'pendiente',
    total DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS Detalle_Pedidos (
    id_detalle_pedido SERIAL PRIMARY KEY,
    id_pedido INT REFERENCES Pedidos(id_pedido) ON DELETE CASCADE,
    id_producto INT REFERENCES Productos(id_producto),
    cantidad DECIMAL(10, 2),
    precio_unitario DECIMAL(10, 2)
);
