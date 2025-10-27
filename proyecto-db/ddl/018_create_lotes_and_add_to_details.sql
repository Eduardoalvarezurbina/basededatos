-- Script de Migración 018: Añadir sistema de Lotes para trazabilidad
-- Crea la tabla de Lotes y la integra con los detalles de compras y ventas para una trazabilidad completa.

-- 1. Crear la tabla principal de Lotes
CREATE TABLE IF NOT EXISTS Lotes_Produccion (
    id_lote SERIAL PRIMARY KEY,
    codigo_lote VARCHAR(100) UNIQUE NOT NULL, -- Un código legible para el lote, ej: "FRAMB-2025-10-21-A"
    id_producto INT REFERENCES Productos(id_producto) NOT NULL,
    fecha_produccion DATE NOT NULL,
    fecha_vencimiento DATE,
    cantidad_inicial DECIMAL(10, 2) NOT NULL,
    unidad_medida VARCHAR(20),
    costo_por_unidad DECIMAL(10, 2),
    origen VARCHAR(255) -- Ej: "Campo propio", "Proveedor X"
);

COMMENT ON TABLE Lotes_Produccion IS 'Registra lotes de producción para trazabilidad, control de costos y fechas de vencimiento.';
COMMENT ON COLUMN Lotes_Produccion.codigo_lote IS 'Código único y legible para identificar el lote.';

-- 2. Añadir la referencia al lote en las tablas de detalles para completar la trazabilidad
ALTER TABLE Detalle_Compras
ADD COLUMN IF NOT EXISTS id_lote INT REFERENCES Lotes_Produccion(id_lote);

ALTER TABLE Detalle_Ventas
ADD COLUMN IF NOT EXISTS id_lote INT REFERENCES Lotes_Produccion(id_lote);

COMMENT ON COLUMN Detalle_Compras.id_lote IS 'Identificador del lote de producción al que pertenece esta compra.';
COMMENT ON COLUMN Detalle_Ventas.id_lote IS 'Identificador del lote de producción del que se vendió este producto.';
