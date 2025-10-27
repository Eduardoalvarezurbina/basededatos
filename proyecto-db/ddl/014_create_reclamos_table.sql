-- Script de Migración 014: Crear tabla de Reclamos
-- Registra los reclamos de clientes para gestión de post-venta.

CREATE TABLE IF NOT EXISTS Reclamos (
    id_reclamo SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES Clientes(id_cliente) NOT NULL,
    id_venta INT REFERENCES Ventas(id_venta), -- Opcional, pero recomendado para trazar el producto/servicio específico
    fecha_reclamo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'Abierto', -- Ej: Abierto, En Proceso, Resuelto, Cerrado sin solución
    solucion_entregada TEXT,
    fecha_resolucion TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE Reclamos IS 'Tabla para registrar reclamos de clientes y el proceso de resolución.';
COMMENT ON COLUMN Reclamos.id_venta IS 'La venta asociada al reclamo, si aplica.';
COMMENT ON COLUMN Reclamos.estado IS 'Estado actual del ticket de reclamo.';
