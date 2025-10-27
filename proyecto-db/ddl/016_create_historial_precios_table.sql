-- Script de Migración 016: Crear tabla de Historial_Precios
-- Registra todos los cambios de precios para análisis de la demanda y comportamiento del cliente.

CREATE TABLE IF NOT EXISTS Historial_Precios (
    id_historial_precio SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto) NOT NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    precio_detalle_neto_anterior DECIMAL(10, 2),
    precio_detalle_neto_nuevo DECIMAL(10, 2),
    precio_mayorista_neto_anterior DECIMAL(10, 2),
    precio_mayorista_neto_nuevo DECIMAL(10, 2)
);

COMMENT ON TABLE Historial_Precios IS 'Registra el historial de cambios de precios de los productos para análisis de comportamiento.';
